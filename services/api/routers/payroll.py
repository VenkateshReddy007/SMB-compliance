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
    today = date.today()
    dues = PayrollDues(
        business_id=business_id,
        period=_period_from_date(today),
        pf_amount=Decimal("50000.00"),
        esi_amount=Decimal("13000.00"),
        pt_amount=Decimal("3200.00"),
        tds_amount=Decimal("28000.00"),
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
