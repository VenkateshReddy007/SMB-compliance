from datetime import datetime, timezone

from services.api.database import Business


class ConsentManager:
    async def record_consent(self, business_id: str, consent_given: bool, db_session) -> None:
        business = await db_session.get(Business, business_id)
        if not business:
            return
        business.dpdp_consent_given = consent_given
        business.dpdp_consent_at = datetime.now(timezone.utc) if consent_given else None
        await db_session.commit()

    async def check_consent(self, business_id: str, db_session) -> bool:
        business = await db_session.get(Business, business_id)
        return bool(business.dpdp_consent_given) if business else False

    def generate_consent_text(self) -> str:
        return (
            "We use your business data only to compute compliance obligations, due dates, and alerts. "
            "By consenting, you allow secure processing and storage for these purposes. You can withdraw consent anytime."
        )
