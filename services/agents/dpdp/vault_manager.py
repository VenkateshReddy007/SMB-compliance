from cryptography.fernet import Fernet
from sqlalchemy import select

from services.api.config import settings
from services.api.database import VaultToken


class FederatedVaultManager:
    def __init__(self) -> None:
        key = settings.vault_encryption_key
        if not key:
            key = Fernet.generate_key().decode("utf-8")
        self.fernet = Fernet(key.encode("utf-8"))

    async def tokenize_pii(self, business_id: str, data_type: str, raw_value: str, db_session) -> str:
        encrypted = self.fernet.encrypt(raw_value.encode("utf-8")).decode("utf-8")
        token = f"TOK_{business_id.replace('-', '')[:6]}_{data_type}"
        db_session.add(VaultToken(business_id=business_id, token=token, data_type=data_type, encrypted_value=encrypted))
        await db_session.commit()
        return token

    async def detokenize(self, token: str, db_session) -> str:
        item = await db_session.scalar(select(VaultToken).where(VaultToken.token == token).limit(1))
        if not item:
            raise ValueError("Token not found")
        return self.fernet.decrypt(item.encrypted_value.encode("utf-8")).decode("utf-8")

    def scrub_business_data(self, business_profile: dict) -> dict:
        copy = dict(business_profile)
        copy["gstin"] = "GST_REGISTERED" if copy.get("gstin") else "NOT_ON_FILE"
        copy["pan"] = "PAN_ON_FILE" if copy.get("pan") else "NOT_ON_FILE"
        turnover = float(copy.get("annual_turnover", 0))
        if turnover < 2000000:
            copy["annual_turnover"] = "TURNOVER_RANGE_0_TO_20L"
        elif turnover < 10000000:
            copy["annual_turnover"] = "TURNOVER_RANGE_20L_TO_1CR"
        else:
            copy["annual_turnover"] = "TURNOVER_RANGE_1CR_PLUS"
        return copy

    def get_scrubbed_payroll_summary(self, employees: list) -> dict:
        if not employees:
            return {"avg_salary": 0, "employee_count": 0, "pf_applicable_count": 0, "esi_applicable_count": 0}
        salaries = [float(e.get("salary", 0)) for e in employees]
        pf_count = sum(1 for _ in employees)
        esi_count = sum(1 for s in salaries if s <= 21000)
        return {
            "avg_salary": round(sum(salaries) / len(salaries), 2),
            "employee_count": len(employees),
            "pf_applicable_count": pf_count,
            "esi_applicable_count": esi_count,
        }
