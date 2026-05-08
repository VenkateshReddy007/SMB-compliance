from datetime import date


def compute_pf_contribution(basic_salary: float, wage_ceiling: float, rate: float) -> dict:
    wage_base = min(basic_salary, wage_ceiling)
    employer = round(wage_base * rate / 100.0, 2)
    employee = round(wage_base * rate / 100.0, 2)
    return {"employer_share": employer, "employee_share": employee, "total": round(employer + employee, 2)}


def is_pf_registration_required(employee_count: int) -> bool:
    return employee_count >= 20


def get_ecr_due_date(period: str) -> date:
    year, month = map(int, period.split("-"))
    month += 1
    if month == 13:
        month = 1
        year += 1
    return date(year, month, 15)


def compute_monthly_pf_challan(employees: list) -> float:
    total = 0.0
    for emp in employees:
        basic = float(emp.get("basic_salary", 0.0))
        ceiling = float(emp.get("wage_ceiling", 15000.0))
        rate = float(emp.get("rate", 12.0))
        total += min(basic, ceiling) * rate / 100.0
    return round(total, 2)


def get_current_wage_ceiling(portal_data: dict) -> float:
    regs = portal_data.get("regulations", [])
    for reg in regs:
        if reg.get("id") == "PF_WAGE_CEILING_001":
            return float(reg.get("value", 15000))
    return 15000.0
