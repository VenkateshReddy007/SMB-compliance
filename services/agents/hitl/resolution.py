from datetime import datetime, timezone

from services.agents.caal.ledger_writer import LedgerWriter
from services.agents.coce.cascade_engine import CascadeEngine
from services.api.database import HITLQueue


class HITLResolver:
    def __init__(self) -> None:
        self.ledger = LedgerWriter()
        self.cascade = CascadeEngine()

    async def resolve(self, item_id: str, decision: str, approver_id: str, notes: str, db_session) -> None:
        item = await db_session.get(HITLQueue, item_id)
        if not item:
            return
        item.status = decision
        item.resolved_by = approver_id
        item.resolution_notes = notes
        item.resolved_at = datetime.now(timezone.utc)
        await db_session.commit()

        await self.ledger.write_entry(
            agent_name="hitl",
            action_type="hitl_resolution",
            business_id=str(item.business_id) if item.business_id else None,
            obligation_id=str(item.obligation_id) if item.obligation_id else None,
            action_payload={"decision": decision, "notes": notes, "human_approved": True, "human_approver_id": approver_id},
            confidence_score=1.0,
            rail_agreement=False,
            regulation_ids=[],
            business_state_snapshot={},
            source_citations=[],
            db_session=db_session,
        )
        if decision == "approved":
            await self.cascade.process_hitl_resolution(item_id, decision, db_session)

    async def notify_resolution(self, item_id: str, decision: str, ws_manager) -> None:
        await ws_manager.broadcast(
            {
                "event": "hitl_resolution",
                "item_id": item_id,
                "decision": decision,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
