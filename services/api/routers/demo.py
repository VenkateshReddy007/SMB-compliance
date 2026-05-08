import json
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from routers.admin import TriggerChangeRequest, trigger_change

router = APIRouter(prefix="/demo", tags=["demo"])

def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]

@router.get("/scenarios")
async def get_scenarios():
    path = _repo_root() / "data" / "seed" / "demo_scenarios.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))

@router.post("/run-scenario/{scenario_id}")
async def run_scenario(scenario_id: str, db: AsyncSession = Depends(get_db)):
    scenarios = await get_scenarios()
    scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
        
    req = TriggerChangeRequest(
        portal=scenario["portal"],
        regulation_id=scenario["regulation_id"],
        field=scenario["field"],
        new_value=scenario["new_value"]
    )
    
    # We call the trigger_change logic from admin router
    return await trigger_change(req, db)

@router.get("/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    import redis
    try:
        r = redis.Redis(host="localhost", port=6379, db=0)
        keys = r.keys("portal_override:*")
        if keys:
            r.delete(*keys)
    except Exception as e:
        print(f"Redis reset failed: {e}")
        
    # Also drop database data to start fresh via seed_db
    # This might require some careful handling or just calling the seed_db script.
    seed_script = _repo_root() / "data" / "seed" / "seed_db.py"
    if seed_script.exists():
        subprocess.run([sys.executable, str(seed_script)], check=False)
        
    from routers.admin import reset_demo_state
    await reset_demo_state(db)
        
    return {"status": "ok", "message": "Demo data and overrides reset"}
