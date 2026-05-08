import google.generativeai as genai

from services.api.config import settings


SYSTEM_PROMPT = (
    "You are a compliance expert for Indian SMBs. Always cite which regulation you are referencing. "
    "Never make up due dates or rates — use only the provided context. If uncertain, say so explicitly."
)


class GeminiComplianceClient:
    def __init__(self) -> None:
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)

    def generate_compliance_response(self, system_prompt: str, user_query: str, context: str) -> dict:
        prompt = f"{system_prompt}\n\nContext:\n{context}\n\nUser Query:\n{user_query}"
        result = self.model.generate_content(prompt)
        text = result.text if hasattr(result, "text") else str(result)
        tokens = len(prompt.split()) + len(text.split())
        return {"response": text, "model_used": settings.gemini_model, "tokens_used": tokens}

    def generate_plain_language_card(self, regulation_changes: list, business_profile: dict) -> str:
        business_name = business_profile.get("name", "the business")
        change_text = "; ".join([str(c) for c in regulation_changes])
        prompt = (
            f"{SYSTEM_PROMPT}\nCreate a concise plain-language compliance card for {business_name}. "
            f"Changes: {change_text}"
        )
        result = self.model.generate_content(prompt)
        return result.text if hasattr(result, "text") else str(result)

    def generate_audit_packet_summary(self, audit_entries: list) -> str:
        prompt = f"{SYSTEM_PROMPT}\nSummarize these audit entries for an auditor:\n{audit_entries[:30]}"
        result = self.model.generate_content(prompt)
        return result.text if hasattr(result, "text") else str(result)
