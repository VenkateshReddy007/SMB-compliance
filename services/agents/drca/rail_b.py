from services.knowledge.rule_engine import RuleEngine


class RailB:
    def __init__(self) -> None:
        self.engine = RuleEngine()

    def classify_query(self, query: str) -> str:
        q = query.lower()
        if "due date" in q or "deadline" in q:
            return "due_date_query"
        if "rate" in q or "percentage" in q:
            return "rate_query"
        if "threshold" in q or "minimum" in q:
            return "threshold_query"
        return "procedure_query"

    def generate_response(self, query: str, business_profile: dict, portal_data: dict) -> dict:
        query_type = self.classify_query(query)
        if query_type == "due_date_query":
            result = self.engine.evaluate("gst_due_date", {"period": "2026-04"}, portal_data)
            result["is_deterministic"] = True
            return result
        if query_type == "rate_query":
            result = self.engine.evaluate("tds_194j", {"payment_amount": 100000}, portal_data)
            result["is_deterministic"] = True
            return result
        if query_type == "threshold_query":
            result = self.engine.evaluate(
                "gst_registration_required",
                {
                    "annual_turnover": float(business_profile.get("annual_turnover", 0)),
                    "state": business_profile.get("state", "MH"),
                    "business_type": business_profile.get("business_type", "it_services"),
                },
                portal_data,
            )
            result["is_deterministic"] = True
            return result
        return {
            "result": "Rule engine abstains for procedural interpretation",
            "rule_used": "abstain_procedure_query",
            "computation_trace": ["No deterministic formula selected for this query."],
            "is_deterministic": False,
        }
