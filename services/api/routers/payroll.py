from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import PayrollDues, get_db

router = APIRouter(prefix="/payroll", tags=["payroll"])


def _period_from_date(d: date) -> str:
    return d.strftime("%Y-%m")


@router.get("/{business_id}/current-month")
async def current_month_dues(business_id: UUID, db: AsyncSession = Depends(get_db)):
    period = _period_from_date(date.today())
    row = await db.scalar(select(PayrollDues).where(and_(PayrollDues.business_id == business_id, PayrollDues.period == period)))
    return row


@router.get("/{business_id}/history")
async def payroll_history(business_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(
        select(PayrollDues).where(PayrollDues.business_id == business_id).order_by(PayrollDues.period.desc()).limit(6)
    )
    return rows.all()


@router.post("/{business_id}/compute")
async def compute_payroll(business_id: UUID, db: AsyncSession = Depends(get_db)):
    """Compute payroll dues dynamically using the PayrollCalculator agent.
    Salaries are deterministically simulated per business_id until an ERP integration is available."""
    import hashlib
    from services.agents.payroll_agent.calculator import PayrollCalculator
    from database import Business

    today = date.today()
    period = _period_from_date(today)

    # Fetch the actual business profile for employee_count and state
    business = await db.get(Business, business_id)
    emp_count = business.employee_count if business and business.employee_count else 5
    state = business.state if business and business.state else "MH"

    # Use the PayrollCalculator rule engine with business-specific data
    calculator = PayrollCalculator()
    portal_data = {}  # Will use live portal rates when EPFO portal is wired in
    result = await calculator.compute_monthly_obligations(
        str(business_id), period, db, portal_data,
        employee_count=emp_count,
        state=state,
    )

    # Persist or update the PayrollDues row for this business/period
    existing = await db.scalar(
        select(PayrollDues).where(
            and_(PayrollDues.business_id == business_id, PayrollDues.period == period)
        )
    )
    amounts = result.get("amounts", {})
    due_dates = result.get("due_dates", {})

    if existing:
        existing.pf_amount = Decimal(str(amounts.get("pf_amount", 0)))
        existing.esi_amount = Decimal(str(amounts.get("esi_amount", 0)))
        existing.pt_amount = Decimal(str(amounts.get("pt_amount", 0)))
        existing.tds_amount = Decimal(str(amounts.get("tds_amount", 0)))
        dues = existing
    else:
        dues = PayrollDues(
            business_id=business_id,
            period=period,
            pf_amount=Decimal(str(amounts.get("pf_amount", 0))),
            esi_amount=Decimal(str(amounts.get("esi_amount", 0))),
            pt_amount=Decimal(str(amounts.get("pt_amount", 0))),
            tds_amount=Decimal(str(amounts.get("tds_amount", 0))),
            pf_due_date=today.replace(day=15),
            esi_due_date=today.replace(day=15),
            pt_due_date=today.replace(day=20),
            tds_due_date=today.replace(day=7),
        )
        db.add(dues)

    await db.commit()
    await db.refresh(dues)
    return dues


@router.get("/due-dates")
async def payroll_due_dates(db: AsyncSession = Depends(get_db)):
    today = date.today()
    end = today + timedelta(days=30)
    rows = await db.scalars(
        select(PayrollDues).where(
            or_(
                and_(PayrollDues.pf_due_date >= today, PayrollDues.pf_due_date <= end),
                and_(PayrollDues.esi_due_date >= today, PayrollDues.esi_due_date <= end),
                and_(PayrollDues.pt_due_date >= today, PayrollDues.pt_due_date <= end),
                and_(PayrollDues.tds_due_date >= today, PayrollDues.tds_due_date <= end),
            )
        )
    )
    return rows.all()
