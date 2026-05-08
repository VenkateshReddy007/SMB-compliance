from datetime import datetime, timezone

from sqlalchemy import select

from services.agents.caal.ledger_writer import LedgerWriter
from services.agents.irda.delta_extractor import DeltaExtractor
from services.agents.irda.notifier import DeltaNotifier
from services.agents.irda.watcher import RegulationWatcher
from services.api.database import Business, RegulationSnapshot


class IRDAOrchestrator:
    def __init__(self) -> None:
        self.watcher = RegulationWatcher()
        self.extractor = DeltaExtractor()
        self.notifier = DeltaNotifier()
        self.ledger = LedgerWriter()

    async def run_cycle(self, db_session, graph_builder, ws_manager) -> dict:
        deltas = await self.watcher.check_all_portals(db_session)
        total_notified = 0

        for delta in deltas:
            old_snapshot = await db_session.scalar(
                select(RegulationSnapshot)
                .where(
                    RegulationSnapshot.portal_name == delta.portal_name,
                    RegulationSnapshot.content_hash == delta.previous_hash,
                )
                .limit(1)
            )
            new_snapshot = await db_session.scalar(
                select(RegulationSnapshot)
                .where(
                    RegulationSnapshot.portal_name == delta.portal_name,
                    RegulationSnapshot.content_hash == delta.new_hash,
                )
                .limit(1)
            )
            old_content = old_snapshot.raw_content if old_snapshot else {"regulations": []}
            new_content = new_snapshot.raw_content if new_snapshot else {"regulations": []}

            changed_ids = self.extractor.extract_changed_regulations(old_content, new_content)
            summary = self.extractor.build_delta_summary(old_content, new_content, changed_ids)
            summary["portal"] = delta.portal_name
            summary["delta_id"] = str(delta.id)

            self.extractor.update_obligation_graph(summary, graph_builder)
            all_businesses = (await db_session.scalars(select(Business))).all()
            affected = self.notifier.find_affected_businesses(changed_ids, [b.__dict__ for b in all_businesses], graph_builder)
            created = await self.notifier.create_compliance_alerts(affected, summary, str(delta.id), db_session)
            total_notified += created

            delta.changed_regulation_ids = changed_ids
            delta.delta_summary = summary
            delta.affected_business_count = len(affected)
            await db_session.commit()

            await self.notifier.broadcast_websocket_event(summary, len(affected), ws_manager)
            await self.ledger.write_entry(
                agent_name="irda",
                action_type="regulation_delta_processed",
                business_id=affected[0] if affected else None,
                obligation_id=None,
                action_payload=summary,
                confidence_score=0.99,
                rail_agreement=True,
                regulation_ids=changed_ids,
                business_state_snapshot={"affected_count": len(affected)},
                source_citations=[{"portal": delta.portal_name}],
                db_session=db_session,
            )

        return {
            "portals_checked": 4,
            "changes_detected": len(deltas),
            "businesses_notified": total_notified,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def schedule(self, interval_seconds: int):
        async def _job(db_session, graph_builder, ws_manager):
            return await self.run_cycle(db_session, graph_builder, ws_manager)

        return {"interval_seconds": interval_seconds, "job": _job}
