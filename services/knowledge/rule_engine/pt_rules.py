from datetime import date


def compute_pt_deduction(monthly_salary: float, state: str, pt_slabs: dict) -> float:
    slabs = pt_slabs.get(state, [])
    for slab in slabs:
        minimum = slab.get("min", 0)
        maximum = slab.get("max", float("inf"))
        if minimum <= monthly_salary <= maximum:
            return float(slab.get("amount", 0.0))
    return 0.0


def get_pt_slabs(state: str, portal_data: dict) -> list:
    extracted = {"MH": [], "KA": [], "WB": []}
    for reg in portal_data.get("regulations", []):
        sid = reg.get("id", "")
        amount = float(reg.get("value", 0.0))
        if sid == "PT_MH_SLAB_001":
            extracted["MH"].append({"min": 10001, "max": 15000, "amount": amount})
        elif sid == "PT_MH_SLAB_002":
            extracted["MH"].append({"min": 15001, "max": float("inf"), "amount": amount})
        elif sid == "PT_KA_SLAB_001":
            extracted["KA"].append({"min": 15001, "max": float("inf"), "amount": amount})
        elif sid == "PT_WB_SLAB_001":
            extracted["WB"].append({"min": 10001, "max": 15000, "amount": amount})
    return extracted.get(state, [])


def compute_monthly_pt_total(employees: list, state: str, portal_data: dict) -> float:
    state_slabs = {state: get_pt_slabs(state, portal_data)}
    total = 0.0
    for emp in employees:
        total += compute_pt_deduction(float(emp.get("monthly_salary", 0.0)), state, state_slabs)
    return round(total, 2)


def get_pt_due_date(state: str) -> date:
    # Demo-safe default: 20th
    today = date.today()
    return date(today.year, today.month, 20)
