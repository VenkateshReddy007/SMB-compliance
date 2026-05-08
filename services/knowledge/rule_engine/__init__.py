from .esi_rules import compute_esi_contribution, compute_monthly_esi_challan, get_esi_due_date, is_esi_eligible
from .gst_rules import (
    compute_gst_liability,
    compute_gst_readiness_score,
    get_current_gst_slab,
    get_filing_due_date,
    get_gst_late_fee,
    is_gst_registration_required,
)
from .pf_rules import (
    compute_monthly_pf_challan,
    compute_pf_contribution,
    get_current_wage_ceiling,
    get_ecr_due_date,
    is_pf_registration_required,
)
from .pt_rules import compute_monthly_pt_total, compute_pt_deduction, get_pt_due_date, get_pt_slabs
from .tds_rules import compute_tds_194c, compute_tds_194j, get_tds_quarterly_return_date, is_tds_applicable


class RuleEngine:
    def evaluate(self, query_type: str, params: dict, portal_data: dict) -> dict:
        trace = []
        result = None
        rule_used = query_type

        if query_type == "gst_liability":
            result = compute_gst_liability(float(params["revenue"]), float(params["gst_rate"]))
            trace.append(f"Computed liability using revenue * rate/100 = {result}")
        elif query_type == "gst_late_fee":
            result = get_gst_late_fee(int(params["days_late"]), float(params["late_fee_cap"]))
            trace.append("Applied late fee formula with cap")
        elif query_type == "gst_registration_required":
            result = is_gst_registration_required(
                float(params["annual_turnover"]), params["state"], params["business_type"]
            )
            trace.append("Checked turnover threshold by state/business type")
        elif query_type == "gst_readiness":
            result = compute_gst_readiness_score(params)
            trace.append("Calculated GST readiness using pending/missing/late penalties")
        elif query_type == "pf_contribution":
            wc = float(params.get("wage_ceiling") or get_current_wage_ceiling(portal_data))
            result = compute_pf_contribution(float(params["basic_salary"]), wc, float(params.get("rate", 12.0)))
            trace.append(f"Computed PF contribution with wage ceiling {wc}")
        elif query_type == "pf_registration_required":
            result = is_pf_registration_required(int(params["employee_count"]))
            trace.append("Checked employee_count >= 20")
        elif query_type == "pf_challan":
            result = compute_monthly_pf_challan(params["employees"])
            trace.append("Summed PF challan for all employees")
        elif query_type == "esi_eligible":
            result = is_esi_eligible(float(params["monthly_salary"]), float(params["threshold"]))
            trace.append("Checked salary <= ESI threshold")
        elif query_type == "esi_contribution":
            result = compute_esi_contribution(float(params["gross_salary"]))
            trace.append("Computed ESI employer and employee split")
        elif query_type == "esi_challan":
            result = compute_monthly_esi_challan(params["employees"], float(params["esi_threshold"]))
            trace.append("Aggregated ESI challan for eligible employees")
        elif query_type == "pt_deduction":
            result = compute_pt_deduction(float(params["monthly_salary"]), params["state"], params["pt_slabs"])
            trace.append("Selected PT slab by state and salary")
        elif query_type == "pt_total":
            result = compute_monthly_pt_total(params["employees"], params["state"], portal_data)
            trace.append("Computed monthly PT total")
        elif query_type == "tds_194c":
            result = compute_tds_194c(float(params["payment_amount"]), bool(params["is_individual"]))
            trace.append("Applied 194C rate (1%/2%)")
        elif query_type == "tds_194j":
            result = compute_tds_194j(float(params["payment_amount"]))
            trace.append("Applied 194J 10% rate")
        elif query_type == "tds_applicable":
            result = is_tds_applicable(params["transaction_type"], float(params["amount"]))
            trace.append("Checked threshold and transaction type for TDS applicability")
        elif query_type == "gst_due_date":
            result = get_filing_due_date(params["period"]).isoformat()
            trace.append("Computed 20th of following month")
        elif query_type == "pf_due_date":
            result = get_ecr_due_date(params["period"]).isoformat()
            trace.append("Computed 15th of following month")
        elif query_type == "esi_due_date":
            result = get_esi_due_date(params["period"]).isoformat()
            trace.append("Computed 15th of following month")
        elif query_type == "pt_due_date":
            result = get_pt_due_date(params["state"]).isoformat()
            trace.append("Computed PT due date")
        elif query_type == "tds_quarterly_due":
            result = get_tds_quarterly_return_date(params["quarter"]).isoformat()
            trace.append("Computed quarterly TDS return due date")
        else:
            raise ValueError(f"Unsupported query_type: {query_type}")

        return {"result": result, "rule_used": rule_used, "computation_trace": trace}


__all__ = ["RuleEngine"]
