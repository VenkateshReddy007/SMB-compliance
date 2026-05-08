from services.api.database import Business, Obligation
from sqlalchemy import and_, select


class GSTReadinessChecker:
    async def compute_readiness_score(self, business_id: str, period: str, db_session, portal_data: dict) -> float:
        business = await db_session.get(Business, business_id)
        obligations = (
            await db_session.scalars(
                select(Obligation).where(and_(Obligation.business_id == business_id, Obligation.domain == "GST"))
            )
        ).all()
        score = 0
        if business and business.gst_registered:
            score += 20
        score += 20 if any("GSTR-1" in (o.title or "") and o.status == "compliant" for o in obligations) else 10
        score += 20 if any("reconciliation" in (o.description or "").lower() for o in obligations) else 10
        score += 20 if any("ITC" in (o.description or "") for o in obligations) else 10
        score += 20 if any(o.status == "compliant" for o in obligations) else 10
        return float(min(100, score))

    async def get_filing_checklist(self, business_id: str, period: str, db_session) -> list[dict]:
        obligations = (
            await db_session.scalars(
                select(Obligation).where(and_(Obligation.business_id == business_id, Obligation.domain == "GST"))
            )
        ).all()
        return [
            {
                "item": o.title,
                "status": o.status,
                "instructions": f"Complete '{o.title}' before {o.due_date}" if o.due_date else "Complete as per GST schedule",
            }
            for o in obligations
        ]
