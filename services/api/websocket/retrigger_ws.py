from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import ComplianceAlert


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.active_connections):
            await connection.send_json(message)


manager = ConnectionManager()
router = APIRouter()


@router.websocket("/ws/retrigger")
async def retrigger_ws(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        await websocket.send_json(
            {
                "event": "connected",
                "message": "Realtime retrigger channel connected.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def send_pending_alerts_count(db: AsyncSession) -> None:
    pending_count = await db.scalar(select(func.count(ComplianceAlert.id)).where(ComplianceAlert.is_read.is_(False)))
    await manager.broadcast(
        {
            "event": "pending_alerts",
            "pending_count": pending_count or 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


async def broadcast_regulation_change(portal: str, affected_count: int, delta_id: str, message: str) -> None:
    await manager.broadcast(
        {
            "event": "regulation_change",
            "portal": portal,
            "affected_count": affected_count,
            "delta_id": delta_id,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


async def broadcast_hitl_escalation(item_id: str, business_id: str) -> None:
    await manager.broadcast(
        {
            "event": "hitl_escalation",
            "item_id": item_id,
            "business_id": business_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


async def broadcast_compliance_update(business_id: str, summary: str) -> None:
    await manager.broadcast(
        {
            "event": "compliance_update",
            "business_id": business_id,
            "message": summary,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
