from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Business, ComplianceAlert, Obligation
from database import get_db

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/businesses")
async def list_businesses_with_summary(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(
            Business.id,
            Business.name,
            Business.business_type,
            Business.state,
            func.count(Obligation.id).label("total"),
            func.sum(case((Obligation.status == "pending", 1), else_=0)).label("pending"),
            func.sum(case((Obligation.status == "overdue", 1), else_=0)).label("overdue"),
            func.sum(case((Obligation.status == "compliant", 1), else_=0)).label("compliant"),
        )
        .outerjoin(Obligation, Obligation.business_id == Business.id)
        .group_by(Business.id)
    )
    return [dict(r._mapping) for r in rows]


@router.get("/businesses/{business_id}")
async def get_business_profile_with_obligations(business_id: UUID, db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    obligations = await db.scalars(select(Obligation).where(Obligation.business_id == business_id))
    return {"business": business, "obligations": obligations.all()}


@router.get("/alerts")
async def unread_alerts(business_id: UUID = Query(...), db: AsyncSession = Depends(get_db)):
    alerts = await db.scalars(
        select(ComplianceAlert)
        .where(ComplianceAlert.business_id == business_id, ComplianceAlert.is_read.is_(False))
        .order_by(ComplianceAlert.created_at.desc())
    )
    items = alerts.all()
    return {"alerts": items, "unread_count": len(items)}


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: UUID, db: AsyncSession = Depends(get_db)):
    alert = await db.get(ComplianceAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    await db.commit()
    await db.refresh(alert)
    return {"status": "ok", "alert": alert}


@router.get("/health-score/{business_id}")
async def compliance_health_score(business_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(Obligation.status).where(Obligation.business_id == business_id))
    statuses = [s for (s,) in rows.all()]
    if not statuses:
        return {"business_id": str(business_id), "health_score": 100}

    weights = {"compliant": 1.0, "pending": 0.6, "overdue": 0.0, "hitl_escalated": 0.4, "waived": 0.8}
    score = sum(weights.get(s or "", 0.5) for s in statuses) / len(statuses)
    return {"business_id": str(business_id), "health_score": round(score * 100, 2)}


@router.get("/cascade-preview/{business_id}")
async def cascade_preview(business_id: UUID, db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    applicable = []
    if business.gst_registered:
        applicable.extend(["GST_LATE_FEE_001", "GST_DUE_DATE_001", "GST_SLAB_001"])
    if business.pf_registered:
        applicable.extend(["PF_WAGE_CEILING_001", "PF_EMPLOYER_RATE_001", "PF_ECR_DUE_DATE_001"])
    if business.esi_registered:
        applicable.append("ESI_THRESHOLD_001")
    if business.fssai_registered or business.business_type == "food_business":
        applicable.extend(["FSSAI_RENEWAL_PERIOD_001", "FSSAI_ANNUAL_RETURN_001"])
    if business.pt_state:
        applicable.extend(["PT_MH_SLAB_001", "PT_MH_SLAB_002", "PT_KA_SLAB_001", "PT_WB_SLAB_001"])

    return {"business_id": str(business_id), "applies_to": sorted(set(applicable))}
