from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import CAALLedger, get_db

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/ledger")
async def paginated_ledger(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(CAALLedger)
    if business_id:
        q = q.where(CAALLedger.business_id == business_id)
    q = q.order_by(CAALLedger.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = await db.scalars(q)
    return rows.all()


@router.get("/ledger/{entry_id}")
async def single_ledger_entry(entry_id: UUID, db: AsyncSession = Depends(get_db)):
    entry = await db.get(CAALLedger, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    return entry


@router.get("/export/{business_id}")
async def export_audit_packet(business_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(CAALLedger).where(CAALLedger.business_id == business_id).order_by(CAALLedger.timestamp.asc()))
    entries = rows.all()
    return {"business_id": str(business_id), "entry_count": len(entries), "entries": entries}


@router.get("/agents")
async def list_agents(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(CAALLedger.agent_did, CAALLedger.agent_name, func.count(CAALLedger.id).label("action_count"))
        .group_by(CAALLedger.agent_did, CAALLedger.agent_name)
        .order_by(func.count(CAALLedger.id).desc())
    )
    return [dict(r._mapping) for r in rows]


@router.get("/timeline/{business_id}")
async def timeline_for_business(business_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(CAALLedger).where(CAALLedger.business_id == business_id).order_by(CAALLedger.timestamp.asc()))
    return rows.all()
