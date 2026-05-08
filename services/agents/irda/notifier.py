from datetime import datetime, timezone

from services.api.database import Business, ComplianceAlert
from services.knowledge.rag.gemini_client import GeminiComplianceClient


class DeltaNotifier:
    def find_affected_businesses(
        self, changed_regulation_ids: list[str], all_businesses: list, obligation_graph
    ) -> list[str]:
        affected: set[str] = set()
        for regulation_id in changed_regulation_ids:
            for business_id in obligation_graph.get_affected_businesses_for_regulation(regulation_id, all_businesses):
                affected.add(str(business_id))
        skipped = max(0, len(all_businesses) - len(affected))
        print(f"IRDA notifier: re-triggered={len(affected)} skipped={skipped}")
        return sorted(affected)

    async def create_compliance_alerts(
        self,
        affected_business_ids: list[str],
        delta_summary: dict,
        delta_id: str,
        db_session,
    ) -> int:
        client = GeminiComplianceClient()
        created = 0
        for business_id in affected_business_ids:
            business = await db_session.get(Business, business_id)
            card = ""
            try:
                card = client.generate_plain_language_card(delta_summary.get("changes", []), {"name": business.name if business else "Business"})
            except Exception:
                card = "A regulation update may affect your obligations. Please review pending tasks."

            alert = ComplianceAlert(
                business_id=business_id,
                alert_type="regulation_change",
                title="Regulation update detected",
                message="A portal rule changed and your obligations were re-evaluated.",
                regulation_delta_id=delta_id,
                plain_language_card={"summary": card, "generated_at": datetime.now(timezone.utc).isoformat()},
                is_read=False,
            )
            db_session.add(alert)
            created += 1
        await db_session.commit()
        return created

    async def broadcast_websocket_event(self, delta_summary: dict, affected_count: int, ws_manager) -> None:
        await ws_manager.broadcast(
            {
                "event": "regulation_change",
                "portal": delta_summary.get("portal", "unknown"),
                "affected_count": affected_count,
                "delta_id": delta_summary.get("delta_id"),
                "message": f"Regulation updated — {affected_count} businesses affected",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
