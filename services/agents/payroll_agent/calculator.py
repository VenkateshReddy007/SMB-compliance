from services.knowledge.rule_engine import RuleEngine


class PayrollCalculator:
    def __init__(self) -> None:
        self.engine = RuleEngine()

    async def compute_monthly_obligations(self, business_id: str, period: str, db_session, portal_data: dict) -> dict:
        employees = [
            {"basic_salary": 25000, "gross_salary": 30000, "monthly_salary": 30000, "rate": 12},
            {"basic_salary": 18000, "gross_salary": 22000, "monthly_salary": 22000, "rate": 12},
            {"basic_salary": 14000, "gross_salary": 19000, "monthly_salary": 19000, "rate": 12},
        ]
        pf = self.engine.evaluate("pf_challan", {"employees": employees}, portal_data)
        esi = self.engine.evaluate("esi_challan", {"employees": employees, "esi_threshold": 21000}, portal_data)
        pt = self.engine.evaluate("pt_total", {"employees": employees, "state": "MH"}, portal_data)
        tds = self.engine.evaluate("tds_194j", {"payment_amount": 100000}, portal_data)

        due_pf = self.engine.evaluate("pf_due_date", {"period": period}, portal_data)
        due_esi = self.engine.evaluate("esi_due_date", {"period": period}, portal_data)
        due_pt = self.engine.evaluate("pt_due_date", {"state": "MH"}, portal_data)
        due_tds = self.engine.evaluate("tds_quarterly_due", {"quarter": "Q1"}, portal_data)

        trace = pf["computation_trace"] + esi["computation_trace"] + pt["computation_trace"] + tds["computation_trace"]
        return {
            "business_id": business_id,
            "period": period,
            "amounts": {
                "pf_amount": pf["result"],
                "esi_amount": esi["result"],
                "pt_amount": pt["result"],
                "tds_amount": tds["result"],
            },
            "due_dates": {
                "pf_due_date": due_pf["result"],
                "esi_due_date": due_esi["result"],
                "pt_due_date": due_pt["result"],
                "tds_due_date": due_tds["result"],
            },
            "computation_trace": trace,
        }
