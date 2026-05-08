from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Business, GSTFilingStatus, Obligation, get_db

router = APIRouter(prefix="/gst", tags=["gst"])


def _current_period() -> str:
    return date.today().strftime("%Y-%m")


@router.get("/filing-status/{business_id}")
async def get_filing_status(business_id: UUID, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(
        select(GSTFilingStatus)
        .where(GSTFilingStatus.business_id == business_id)
        .order_by(GSTFilingStatus.updated_at.desc())
        .limit(1)
    )
    if not row:
        raise HTTPException(status_code=404, detail="No GST filing status found")
    return row


@router.post("/filing-status/{business_id}/compute")
async def compute_filing_status(business_id: UUID, db: AsyncSession = Depends(get_db)):
    obligations = (
        await db.scalars(select(Obligation).where(and_(Obligation.business_id == business_id, Obligation.domain == "GST")))
    ).all()
    pending = sum(1 for o in obligations if o.status == "pending")
    overdue = sum(1 for o in obligations if o.status == "overdue")
    readiness_score = Decimal(max(0.0, min(100.0, 100 - (pending * 10 + overdue * 20))))

    status = GSTFilingStatus(
        business_id=business_id,
        period=_current_period(),
        readiness_score=readiness_score,
        missing_items=["Missing invoice reconciliation"] if pending else [],
        total_gst_liability=Decimal("125000.00"),
        input_tax_credit=Decimal("45000.00"),
        net_payable=Decimal("80000.00"),
        filing_status="ready" if readiness_score >= 80 else "in_progress",
    )
    db.add(status)
    await db.commit()
    await db.refresh(status)
    return status


@router.get("/export/{business_id}")
async def export_gst_payload(business_id: UUID, db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return {
        "business_id": str(business.id),
        "gstin": business.gstin,
        "period": _current_period(),
        "returns": {"gstr3b": {"taxable_value": 500000, "tax_liability": 90000, "itc": 30000, "net_payable": 60000}},
        "generated_at": date.today().isoformat(),
    }


@router.get("/due-dates")
async def gst_due_dates(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(
        select(Obligation).where(and_(Obligation.domain == "GST", Obligation.status.in_(["pending", "overdue"])))
    )
    return [{"business_id": str(r.business_id), "title": r.title, "due_date": r.due_date, "status": r.status} for r in rows.all()]
