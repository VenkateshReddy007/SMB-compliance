import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Business, ComplianceAlert, HITLQueue, Obligation, RegulationDelta, get_db
from websocket.retrigger_ws import broadcast_compliance_update, broadcast_regulation_change

router = APIRouter(prefix="/admin", tags=["admin"])


class TriggerChangeRequest(BaseModel):
    portal: str
    regulation_id: str
    field: str
    new_value: object


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    total_businesses = await db.scalar(select(func.count(Business.id)))
    total_obligations = await db.scalar(select(func.count(Obligation.id)))
    total_alerts = await db.scalar(select(func.count(ComplianceAlert.id)))
    hitl_pending = await db.scalar(select(func.count(HITLQueue.id)).where(HITLQueue.status == "pending"))
    return {
        "total_businesses": total_businesses or 0,
        "total_obligations": total_obligations or 0,
        "total_alerts": total_alerts or 0,
        "hitl_pending": hitl_pending or 0,
    }


@router.post("/seed")
async def seed_demo_data():
    script = _repo_root() / "data" / "seed" / "seed_db.py"
    if not script.exists():
        raise HTTPException(status_code=404, detail="Seed script not found")
    result = subprocess.run([sys.executable, str(script)], cwd=str(_repo_root()), capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr or result.stdout)
    return {"status": "ok", "output": result.stdout}


@router.post("/demo/trigger-change")
async def trigger_change(payload: TriggerChangeRequest, db: AsyncSession = Depends(get_db)):
    portal_file = _repo_root() / "apps" / "mock-portals" / payload.portal / "regulations.json"
    if not portal_file.exists():
        raise HTTPException(status_code=404, detail="Portal file not found")

    content = json.loads(portal_file.read_text(encoding="utf-8"))
    changed = False
    for reg in content.get("regulations", []):
        if reg.get("id") == payload.regulation_id:
            reg[payload.field] = payload.new_value
            changed = True
            break
    if not changed:
        raise HTTPException(status_code=404, detail="Regulation ID not found")

    content["last_updated"] = datetime.now(timezone.utc).isoformat()
    content["hash_check"] = f"manual_{uuid4().hex[:10]}"
    portal_file.write_text(json.dumps(content, indent=2), encoding="utf-8")

    delta = RegulationDelta(
        portal_name=payload.portal,
        previous_hash="unknown",
        new_hash=content["hash_check"],
        changed_regulation_ids=[payload.regulation_id],
        delta_summary={"field": payload.field, "new_value": payload.new_value},
        affected_business_count=8,
        processed=False,
    )
    db.add(delta)
    await db.commit()
    await db.refresh(delta)

    await broadcast_regulation_change(
        portal=payload.portal,
        affected_count=8,
        delta_id=str(delta.id),
        message=f"{payload.regulation_id} changed — 8 businesses affected",
    )
    return {"status": "ok", "delta_id": str(delta.id)}


@router.get("/users")
async def admin_users(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Business).order_by(Business.onboarded_at.desc()))
    return rows.all()


@router.post("/reset-demo")
async def reset_demo_state(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ComplianceAlert))
    await db.execute(delete(HITLQueue))
    await db.execute(delete(Obligation))
    await db.commit()
    await broadcast_compliance_update("all", "Demo state has been reset")
    return {"status": "ok", "message": "All obligations and alerts reset"}
