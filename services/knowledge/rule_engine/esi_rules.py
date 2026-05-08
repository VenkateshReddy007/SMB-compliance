from datetime import date


def is_esi_eligible(monthly_salary: float, threshold: float) -> bool:
    return monthly_salary <= threshold


def compute_esi_contribution(gross_salary: float) -> dict:
    employer = round(gross_salary * 0.0325, 2)
    employee = round(gross_salary * 0.0075, 2)
    return {"employer": employer, "employee": employee, "total": round(employer + employee, 2)}


def compute_monthly_esi_challan(employees: list, esi_threshold: float) -> float:
    total = 0.0
    for emp in employees:
        gross = float(emp.get("gross_salary", 0.0))
        if is_esi_eligible(gross, esi_threshold):
            total += gross * 0.0325
    return round(total, 2)


def get_esi_due_date(period: str) -> date:
    year, month = map(int, period.split("-"))
    month += 1
    if month == 13:
        month = 1
        year += 1
    return date(year, month, 15)
