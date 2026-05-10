import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Business, CAALLedger, ComplianceAlert, HITLQueue, Obligation, RegulationDelta, RegulationSnapshot, VaultToken, get_db
from services.knowledge.obligation_graph.graph_builder import ObligationGraphBuilder
from services.agents.dpdp.breach_detector import BreachDetector
from services.api.config import settings
from websocket.retrigger_ws import broadcast_compliance_update, broadcast_regulation_change

router = APIRouter(prefix="/admin", tags=["admin"])

_LAST_BREACH_CHECK_AT: datetime | None = None


class TriggerChangeRequest(BaseModel):
    portal: str
    regulation_id: str
    field: str
    new_value: object


class SimulateBreachRequest(BaseModel):
    business_id: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _mock_portal_path(portal: str) -> Path:
    return _repo_root() / "apps" / "mock-portals" / portal / "regulations.json"


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    total_businesses = await db.scalar(select(func.count(Business.id)))
    total_obligations = await db.scalar(select(func.count(Obligation.id)))
    total_alerts = await db.scalar(select(func.count(ComplianceAlert.id)))
    hitl_pending = await db.scalar(select(func.count(HITLQueue.id)).where(HITLQueue.status == "pending"))
    regulation_changes_24h = await db.scalar(
        select(func.count(RegulationDelta.id)).where(RegulationDelta.detected_at >= (datetime.now(timezone.utc) - timedelta(hours=24)))
    )
    caal_entries = await db.scalar(select(func.count(CAALLedger.id)))

    # KG nodes are static for now (in-memory builder).
    graph_builder = ObligationGraphBuilder()
    graph_builder.build_graph()
    graph_nodes = graph_builder.graph.number_of_nodes()
    return {
        "total_businesses": total_businesses or 0,
        "total_obligations": total_obligations or 0,
        "total_alerts": total_alerts or 0,
        "hitl_pending": hitl_pending or 0,
        "regulation_changes_24h": regulation_changes_24h or 0,
        "caal_entries": caal_entries or 0,
        "graph_nodes": graph_nodes,
    }


@router.get("/deltas")
async def admin_deltas(db: AsyncSession = Depends(get_db)):
    deltas = await db.scalars(select(RegulationDelta).order_by(RegulationDelta.detected_at.desc()).limit(200))
    all_businesses = await db.scalars(select(Business))
    business_list = list(all_businesses.all())

    graph_builder = ObligationGraphBuilder()
    graph_builder.build_graph()

    business_dicts = [
        {
            "id": str(b.id),
            "business_type": b.business_type,
            "state": b.state,
            "annual_turnover": b.annual_turnover,
            "employee_count": b.employee_count,
            "fssai_registered": b.fssai_registered,
        }
        for b in business_list
    ]
    id_to_name = {str(b.id): b.name for b in business_list}

    out = []
    for d in deltas.all():
        changed_ids = list(d.changed_regulation_ids or [])
        affected_ids: set[str] = set()
        for rid in changed_ids:
            for bid in graph_builder.get_affected_businesses_for_regulation(rid, business_dicts):
                affected_ids.add(str(bid))

        skipped_ids = [str(b.id) for b in business_list if str(b.id) not in affected_ids]

        d_dict = {k: v for k, v in d.__dict__.items() if not k.startswith("_")}
        out.append(
            {
                **d_dict,
                "changed_regulation_ids": changed_ids,
                "affected_businesses": [{"id": bid, "name": id_to_name.get(bid)} for bid in sorted(affected_ids)],
                "skipped_businesses": [{"id": bid, "name": id_to_name.get(bid)} for bid in sorted(skipped_ids)],
            }
        )
    return out


@router.get("/portal-status")
async def portal_status(db: AsyncSession = Depends(get_db)):
    """
    Return live portal scraping status from the database (actual scrape results),
    NOT from local files. Shows real last-scraped timestamps and hashes.
    """
    portal_names = ["gstn", "epfo", "fssai", "pt_states"]
    portal_urls = {
        "gstn": settings.mock_gstn_url,
        "epfo": settings.mock_epfo_url,
        "fssai": settings.mock_fssai_url,
        "pt_states": settings.mock_pt_url,
    }

    out = []
    for portal in portal_names:
        # Get latest snapshot from DB (actual scrape result)
        latest = await db.scalar(
            select(RegulationSnapshot)
            .where(RegulationSnapshot.portal_name == portal)
            .order_by(RegulationSnapshot.fetched_at.desc())
            .limit(1)
        )

        # Get count of changes in last 24h
        changes_24h = await db.scalar(
            select(func.count(RegulationDelta.id)).where(
                RegulationDelta.portal_name == portal,
                RegulationDelta.detected_at >= (datetime.now(timezone.utc) - timedelta(hours=24)),
            )
        )

        if latest:
            reg_count = len((latest.raw_content or {}).get("regulations", []))
            out.append({
                "portal": portal,
                "url": portal_urls.get(portal, ""),
                "last_checked": latest.fetched_at.isoformat() if latest.fetched_at else None,
                "last_hash": latest.content_hash,
                "change_detected": latest.change_detected,
                "regulations_monitored": reg_count,
                "changes_24h": changes_24h or 0,
                "status": "live",
            })
        else:
            out.append({
                "portal": portal,
                "url": portal_urls.get(portal, ""),
                "last_checked": None,
                "last_hash": None,
                "change_detected": False,
                "regulations_monitored": 0,
                "changes_24h": 0,
                "status": "awaiting_first_scrape",
            })
    return out


@router.get("/portal/{portal_name}")
async def get_portal_data(portal_name: str, db: AsyncSession = Depends(get_db)):
    """
    Fetch regulation data from the live Vercel portal URL.
    Falls back to the latest DB snapshot if the live URL is unreachable.
    """
    portal_map = {
        "gstn": settings.mock_gstn_url,
        "epfo": settings.mock_epfo_url,
        "fssai": settings.mock_fssai_url,
        "pt-states": settings.mock_pt_url,
        "pt_states": settings.mock_pt_url,
    }
    url = portal_map.get(portal_name)
    if not url:
        raise HTTPException(status_code=404, detail="Unknown portal")

    # Try live fetch first
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception:
        pass

    # Fallback to latest DB snapshot
    db_portal_name = portal_name.replace("-", "_")
    latest = await db.scalar(
        select(RegulationSnapshot)
        .where(RegulationSnapshot.portal_name == db_portal_name)
        .order_by(RegulationSnapshot.fetched_at.desc())
        .limit(1)
    )
    if latest and latest.raw_content:
        return latest.raw_content

    # Final fallback to local file
    path = _mock_portal_path(portal_name)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    raise HTTPException(status_code=404, detail="Portal data not found")


@router.get("/scraping-health")
async def scraping_health(request: Request):
    """Return the current live scraping health status from the scheduler."""
    scheduler = getattr(request.app.state, "scheduler", None)
    if scheduler:
        return scheduler.get_poll_status()
    return {
        "last_poll_at": None,
        "last_result": None,
        "poll_interval_seconds": 30,
        "next_poll_at": None,
        "status": "scheduler_not_initialized",
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
    """
    Demo-only endpoint: Pushes a regulation change override to Redis,
    then runs an IRDA cycle with allow_demo_override=True so it picks
    up the Redis override instead of the live portal.
    """
    import redis as _redis
    from services.agents.irda.orchestrator import IRDAOrchestrator
    from services.knowledge.obligation_graph.graph_builder import ObligationGraphBuilder

    db_portal_name = payload.portal.replace("-", "_")
    latest = await db.scalar(
        select(RegulationSnapshot)
        .where(RegulationSnapshot.portal_name == db_portal_name)
        .order_by(RegulationSnapshot.fetched_at.desc())
        .limit(1)
    )
    if not latest or not latest.raw_content:
        raise HTTPException(status_code=404, detail="No portal snapshot found in database to override. Please wait for the initial scrape.")
        
    content = latest.raw_content
    changed = False
    old_value = None
    for reg in content.get("regulations", []):
        if reg.get("id") == payload.regulation_id:
            old_value = reg.get(payload.field)
            reg[payload.field] = payload.new_value
            changed = True
            break
    if not changed:
        raise HTTPException(status_code=404, detail="Regulation ID not found")

    content["last_updated"] = datetime.now(timezone.utc).isoformat()
    content["hash_check"] = f"manual_{uuid4().hex[:10]}"

    # Write to Redis
    r = _redis.from_url(settings.redis_url)
    try:
        r.set(f"portal_override:{payload.portal}", json.dumps(content))
    except Exception as e:
        print(f"Warning: Could not connect to redis for override. {e}")
        # Fallback to file override for local testing if redis isn't running
        portal_file.write_text(json.dumps(content, indent=2), encoding="utf-8")

    # Immediately run IRDA watcher cycle WITH demo override flag
    irda = IRDAOrchestrator()
    graph_builder = ObligationGraphBuilder()
    graph_builder.build_graph()
    
    from websocket.retrigger_ws import manager

    await irda.run_cycle(db, graph_builder, manager, allow_demo_override=True)
    
    # The delta is processed in run_cycle. Let's find it.
    delta = await db.scalar(select(RegulationDelta).order_by(RegulationDelta.detected_at.desc()).limit(1))
    
    return {
        "status": "triggered", 
        "delta_id": str(delta.id) if delta else None,
        "affected_businesses": delta.affected_business_count if delta else 0
    }


@router.get("/users")
async def admin_users(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Business).order_by(Business.onboarded_at.desc()))
    return rows.all()


@router.post("/reset-demo")
async def reset_demo_state(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ComplianceAlert))
    await db.execute(delete(HITLQueue))
    await db.execute(delete(Obligation))
    await db.execute(
        Business.__table__.update().values(
            dpdp_consent_given=False,
            dpdp_consent_at=None,
        )
    )
    await db.commit()
    await broadcast_compliance_update("all", "Demo state has been reset")
    return {"status": "ok", "message": "All obligations and alerts reset"}


@router.get("/dpdp/stats")
async def dpdp_stats(db: AsyncSession = Depends(get_db)):
    token_count = await db.scalar(select(func.count(VaultToken.id)))
    consent_count = await db.scalar(select(func.count(Business.id)).where(Business.dpdp_consent_given.is_(True)))
    return {
        "vault_tokens_count": token_count or 0,
        "consent_given_count": consent_count or 0,
        "last_breach_check_at": _LAST_BREACH_CHECK_AT.isoformat() if _LAST_BREACH_CHECK_AT else None,
    }


@router.post("/dpdp/simulate-breach")
async def simulate_breach(payload: SimulateBreachRequest, db: AsyncSession = Depends(get_db)):
    global _LAST_BREACH_CHECK_AT
    detector = BreachDetector()
    business_id_str = str(payload.business_id)
    breach = detector.simulate_breach_detection(business_id_str)
    _LAST_BREACH_CHECK_AT = datetime.now(timezone.utc)
    business = await db.get(Business, payload.business_id)
    msg = detector.draft_dpb_notification(breach, {"name": business.name if business else "Business"})
    return {"breach_details": breach, "notification_text": msg, "last_breach_check_at": _LAST_BREACH_CHECK_AT.isoformat()}
