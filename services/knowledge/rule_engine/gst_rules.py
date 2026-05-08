from datetime import date


def compute_gst_liability(revenue: float, gst_rate: float) -> float:
    return round(revenue * gst_rate / 100.0, 2)


def get_gst_late_fee(days_late: int, late_fee_cap: float) -> float:
    return round(min(days_late * 50.0, late_fee_cap), 2)


def is_gst_registration_required(annual_turnover: float, state: str, business_type: str) -> bool:
    threshold = 4000000.0 if state in {"AS", "AR", "ML", "MN", "MZ", "NL", "SK", "TR", "HP", "UK"} else 2000000.0
    if business_type == "food_business":
        threshold = min(threshold, 2000000.0)
    return annual_turnover > threshold


def get_filing_due_date(period: str) -> date:
    year, month = map(int, period.split("-"))
    month += 1
    if month == 13:
        month = 1
        year += 1
    return date(year, month, 20)


def compute_gst_readiness_score(business_data: dict) -> float:
    pending = int(business_data.get("pending_returns", 0))
    missing = int(business_data.get("missing_invoices", 0))
    late = int(business_data.get("late_days", 0))
    score = 100 - (pending * 12 + missing * 3 + late * 1.5)
    return float(max(0.0, min(100.0, round(score, 2))))


def get_current_gst_slab(supply_type: str) -> float:
    slabs = {"essential": 5.0, "standard_goods": 12.0, "services": 18.0, "luxury": 28.0}
    return slabs.get(supply_type, 18.0)
