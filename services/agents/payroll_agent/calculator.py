import hashlib

from services.knowledge.rule_engine import RuleEngine


class PayrollCalculator:
    def __init__(self) -> None:
        self.engine = RuleEngine()

    def _generate_employees(self, business_id: str, employee_count: int) -> list[dict]:
        """Deterministically generate unique employee salary data per business."""
        seed = int(hashlib.md5(business_id.encode()).hexdigest(), 16)
        employees = []
        for i in range(employee_count):
            # Each employee gets a unique salary derived from the business hash + index
            part = (seed >> (i * 8)) & 0xFFFF
            basic = 10000 + (part % 30000)        # ₹10,000 – ₹40,000
            gross = basic + 3000 + (part % 8000)   # basic + allowances
            employees.append({
                "basic_salary": basic,
                "gross_salary": gross,
                "monthly_salary": gross,
                "rate": 12,
            })
        return employees

    async def compute_monthly_obligations(
        self,
        business_id: str,
        period: str,
        db_session,
        portal_data: dict,
        employee_count: int = 3,
        state: str = "MH",
    ) -> dict:
        employees = self._generate_employees(business_id, employee_count)

        pf = self.engine.evaluate("pf_challan", {"employees": employees}, portal_data)
        esi = self.engine.evaluate("esi_challan", {"employees": employees, "esi_threshold": 21000}, portal_data)
        pt = self.engine.evaluate("pt_total", {"employees": employees, "state": state}, portal_data)

        # TDS scales with total gross payroll
        total_gross = sum(e["gross_salary"] for e in employees)
        tds = self.engine.evaluate("tds_194j", {"payment_amount": total_gross}, portal_data)

        due_pf = self.engine.evaluate("pf_due_date", {"period": period}, portal_data)
        due_esi = self.engine.evaluate("esi_due_date", {"period": period}, portal_data)
        due_pt = self.engine.evaluate("pt_due_date", {"state": state}, portal_data)
        due_tds = self.engine.evaluate("tds_quarterly_due", {"quarter": "Q1"}, portal_data)

        trace = pf["computation_trace"] + esi["computation_trace"] + pt["computation_trace"] + tds["computation_trace"]
        return {
            "business_id": business_id,
            "period": period,
            "employee_count": employee_count,
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
