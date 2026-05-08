from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import HITLQueue, Obligation, get_db
from models import HITLResolveRequest
from websocket.retrigger_ws import broadcast_hitl_escalation

router = APIRouter(prefix="/hitl", tags=["hitl"])


@router.get("/queue")
async def hitl_queue(business_id: UUID | None = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(HITLQueue).where(HITLQueue.status == "pending")
    if business_id:
        q = q.where(HITLQueue.business_id == business_id)
    rows = await db.scalars(q.order_by(HITLQueue.escalated_at.desc()))
    return rows.all()


@router.get("/queue/{item_id}")
async def hitl_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    row = await db.get(HITLQueue, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return row


@router.post("/queue/{item_id}/resolve")
async def resolve_hitl_item(item_id: UUID, payload: HITLResolveRequest, db: AsyncSession = Depends(get_db)):
    item = await db.get(HITLQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    item.status = payload.decision
    item.resolution_notes = payload.notes
    item.resolved_by = payload.approver_id
    item.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return item


@router.get("/history")
async def hitl_history(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(HITLQueue).where(HITLQueue.status.in_(["approved", "rejected"])))
    return rows.all()


@router.post("/queue/test-create")
async def create_test_hitl_item(business_id: UUID, db: AsyncSession = Depends(get_db)):
    obligation = await db.scalar(select(Obligation).where(Obligation.business_id == business_id).limit(1))
    item = HITLQueue(
        business_id=business_id,
        obligation_id=obligation.id if obligation else None,
        action_type="manual_review_required",
        rail_a_response={"decision": "pending"},
        rail_b_response={"decision": "pending"},
        divergence_reason="Simulated test divergence",
        confidence_score=0.51,
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await broadcast_hitl_escalation(str(item.id), str(business_id))
    return item
