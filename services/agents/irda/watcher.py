import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.config import settings
from services.api.database import RegulationDelta, RegulationSnapshot


class RegulationWatcher:
    async def fetch_portal_data(self, portal_name: str, url: str) -> dict:
        import redis
        try:
            r = redis.Redis(host="localhost", port=6379, db=0)
            override = r.get(f"portal_override:{portal_name}")
            if override:
                return json.loads(override)
        except Exception:
            pass

        # Fallback to local files if URL is a local port but not running, or just use httpx
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except Exception:
            # For local demo without full mock portal servers running
            from pathlib import Path
            root = Path(__file__).resolve().parents[4]
            local_path = root / "apps" / "mock-portals" / portal_name.replace("_", "-") / "regulations.json"
            if local_path.exists():
                return json.loads(local_path.read_text(encoding="utf-8"))
            return {"regulations": []}

    def compute_hash(self, data: dict) -> str:
        normalized = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def check_portal_for_changes(
        self, portal_name: str, url: str, db_session: AsyncSession
    ) -> Optional[RegulationDelta]:
        current_data = await self.fetch_portal_data(portal_name, url)
        current_hash = self.compute_hash(current_data)

        latest_snapshot = await db_session.scalar(
            select(RegulationSnapshot)
            .where(RegulationSnapshot.portal_name == portal_name)
            .order_by(RegulationSnapshot.fetched_at.desc())
            .limit(1)
        )

        if latest_snapshot and latest_snapshot.content_hash == current_hash:
            latest_snapshot.fetched_at = datetime.now(timezone.utc)
            await db_session.commit()
            return None

        previous_hash = latest_snapshot.content_hash if latest_snapshot else None
        snapshot = RegulationSnapshot(
            portal_name=portal_name,
            portal_url=url,
            content_hash=current_hash,
            raw_content=current_data,
            change_detected=latest_snapshot is not None,
        )
        db_session.add(snapshot)

        delta = RegulationDelta(
            portal_name=portal_name,
            previous_hash=previous_hash,
            new_hash=current_hash,
            changed_regulation_ids=[],
            delta_summary={},
            affected_business_count=0,
            processed=False,
        )
        db_session.add(delta)
        await db_session.commit()
        await db_session.refresh(delta)
        return delta

    async def check_all_portals(self, db_session: AsyncSession) -> list[RegulationDelta]:
        portals = {
            "gstn": settings.mock_gstn_url,
            "epfo": settings.mock_epfo_url,
            "fssai": settings.mock_fssai_url,
            "pt_states": settings.mock_pt_url,
        }
        deltas: list[RegulationDelta] = []
        for portal_name, url in portals.items():
            delta = await self.check_portal_for_changes(portal_name, url, db_session)
            if delta is not None:
                deltas.append(delta)
        return deltas
