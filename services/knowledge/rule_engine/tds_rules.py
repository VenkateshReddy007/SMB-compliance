from datetime import date


def compute_tds_194c(payment_amount: float, is_individual: bool) -> float:
    rate = 0.01 if is_individual else 0.02
    return round(payment_amount * rate, 2)


def compute_tds_194j(payment_amount: float) -> float:
    return round(payment_amount * 0.10, 2)


def get_tds_quarterly_return_date(quarter: str) -> date:
    mapping = {"Q1": date(2026, 7, 31), "Q2": date(2026, 10, 31), "Q3": date(2027, 1, 31), "Q4": date(2027, 5, 31)}
    return mapping.get(quarter, date(2026, 7, 31))


def is_tds_applicable(transaction_type: str, amount: float) -> bool:
    if transaction_type in {"194C", "contractor"}:
        return amount > 30000
    if transaction_type in {"194J", "professional"}:
        return amount > 30000
    return False
