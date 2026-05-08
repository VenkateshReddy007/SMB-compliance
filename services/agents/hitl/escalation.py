from sqlalchemy import select

from services.api.database import HITLQueue


class HITLEscalator:
    async def create_escalation(
        self,
        business_id: str,
        obligation_id: str | None,
        action_type: str,
        rail_a_response: dict,
        rail_b_response: dict,
        divergence_reason: str,
        confidence_score: float,
        db_session,
    ) -> str:
        item = HITLQueue(
            business_id=business_id,
            obligation_id=obligation_id,
            action_type=action_type,
            rail_a_response=rail_a_response,
            rail_b_response=rail_b_response,
            divergence_reason=divergence_reason,
            confidence_score=confidence_score,
            status="pending",
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)
        return str(item.id)

    async def get_pending_queue(self, db_session) -> list[dict]:
        rows = await db_session.scalars(select(HITLQueue).where(HITLQueue.status == "pending"))
        return [r.__dict__ for r in rows.all()]

    async def get_escalation_context(self, item_id: str, db_session) -> dict:
        item = await db_session.get(HITLQueue, item_id)
        if not item:
            return {}
        return {
            "id": str(item.id),
            "business_id": str(item.business_id) if item.business_id else None,
            "obligation_id": str(item.obligation_id) if item.obligation_id else None,
            "action_type": item.action_type,
            "rail_a_response": item.rail_a_response,
            "rail_b_response": item.rail_b_response,
            "divergence_reason": item.divergence_reason,
            "confidence_score": float(item.confidence_score) if item.confidence_score else None,
        }
