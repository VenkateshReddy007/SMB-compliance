from datetime import datetime, timezone

import networkx as nx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers.admin import router as admin_router
from routers.assistant import router as assistant_router
from routers.audit import router as audit_router
from routers.compliance import router as compliance_router
from routers.gst import router as gst_router
from routers.hitl import router as hitl_router
from routers.obligations import router as obligations_router
from routers.payroll import router as payroll_router
from websocket.retrigger_ws import router as websocket_router

app = FastAPI(title="RegGraph AI API", version="0.1.0")
scheduler = AsyncIOScheduler()
obligation_graph = nx.DiGraph()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_obligation_graph() -> None:
    obligation_graph.clear()
    obligation_graph.add_nodes_from(["GST", "PF", "ESI", "FSSAI", "PT", "TDS"])
    obligation_graph.add_edge("PF", "ESI")
    obligation_graph.add_edge("GST", "TDS")
    obligation_graph.add_edge("FSSAI", "GST")


@app.on_event("startup")
async def startup_event() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if not scheduler.running:
        scheduler.start()
    _load_obligation_graph()


app.include_router(compliance_router)
app.include_router(obligations_router)
app.include_router(payroll_router)
app.include_router(gst_router)
app.include_router(hitl_router)
app.include_router(audit_router)
app.include_router(assistant_router)
app.include_router(admin_router)
app.include_router(websocket_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


app.mount("/static", StaticFiles(directory="."), name="static")
