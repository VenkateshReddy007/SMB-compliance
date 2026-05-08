from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Obligation, get_db
from models import ObligationCreate

router = APIRouter(prefix="/obligations", tags=["obligations"])


@router.get("/overdue")
async def list_overdue_obligations(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Obligation).where(Obligation.status == "overdue").order_by(Obligation.due_date.asc()))
    return rows.all()


@router.get("/{business_id}")
async def get_business_obligations(
    business_id: UUID,
    status: str | None = Query(None),
    domain: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    clauses = [Obligation.business_id == business_id]
    if status:
        clauses.append(Obligation.status == status)
    if domain:
        clauses.append(Obligation.domain == domain)
    rows = await db.scalars(select(Obligation).where(and_(*clauses)).order_by(Obligation.due_date.asc()))
    return rows.all()


@router.post("")
async def create_obligation(payload: ObligationCreate, db: AsyncSession = Depends(get_db)):
    item = Obligation(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{obligation_id}")
async def update_obligation_status(obligation_id: UUID, status: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(Obligation, obligation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Obligation not found")
    item.status = status
    item.version = (item.version or 1) + 1
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{obligation_id}")
async def soft_delete_obligation(obligation_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(Obligation, obligation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Obligation not found")
    item.status = "waived"
    item.version = (item.version or 1) + 1
    await db.commit()
    return {"status": "ok", "deleted_as": "waived", "obligation_id": str(obligation_id), "at": date.today().isoformat()}
