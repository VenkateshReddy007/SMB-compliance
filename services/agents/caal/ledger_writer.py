from sqlalchemy import func, select

from services.agents.caal.agent_identity import AgentIdentity
from services.api.database import CAALLedger


class LedgerWriter:
    def __init__(self) -> None:
        self.identity = AgentIdentity()

    async def write_entry(
        self,
        agent_name: str,
        action_type: str,
        business_id: str | None,
        obligation_id: str | None,
        action_payload: dict,
        confidence_score: float,
        rail_agreement: bool,
        regulation_ids: list,
        business_state_snapshot: dict,
        source_citations: list,
        db_session,
    ) -> str:
        agent_did = self.identity.get_did(agent_name)
        signature = self.identity.sign_action(agent_name, action_payload)
        entry = CAALLedger(
            agent_did=agent_did,
            agent_name=agent_name,
            action_type=action_type,
            business_id=business_id,
            obligation_id=obligation_id,
            regulation_ids=regulation_ids,
            regulation_version=str(action_payload.get("version", "1")),
            business_state_snapshot=business_state_snapshot,
            action_payload=action_payload,
            confidence_score=confidence_score,
            rail_agreement=rail_agreement,
            human_approved=bool(action_payload.get("human_approved", False)),
            human_approver_id=action_payload.get("human_approver_id"),
            action_hash=signature,
            source_citations={"items": source_citations},
        )
        db_session.add(entry)
        await db_session.commit()
        await db_session.refresh(entry)
        return str(entry.id)

    async def get_entries_for_business(self, business_id: str, db_session, limit: int = 50) -> list[dict]:
        rows = await db_session.scalars(
            select(CAALLedger).where(CAALLedger.business_id == business_id).order_by(CAALLedger.timestamp.desc()).limit(limit)
        )
        return [r.__dict__ for r in rows.all()]

    async def get_all_entries(self, db_session, page: int, page_size: int) -> dict:
        total = await db_session.scalar(select(func.count(CAALLedger.id)))
        rows = await db_session.scalars(
            select(CAALLedger).order_by(CAALLedger.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
        )
        return {"entries": [r.__dict__ for r in rows.all()], "pagination": {"page": page, "page_size": page_size, "total": total or 0}}
