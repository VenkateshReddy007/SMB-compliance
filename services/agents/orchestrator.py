from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select

from services.agents.caal.ledger_writer import LedgerWriter
from services.agents.coce.cascade_engine import CascadeEngine
from services.agents.drca.comparator import DRCAComparator
from services.agents.drca.rail_a import RailA
from services.agents.drca.rail_b import RailB
from services.agents.hitl.escalation import HITLEscalator
from services.api.database import Business
from services.knowledge.rag.retriever import retrieve_relevant_regulations


class AgentState(TypedDict):
    business_id: str
    business_profile: dict
    query: Optional[str]
    event_type: Optional[str]
    portal_data: dict
    obligation_graph_data: dict
    retrieved_regulations: list
    rail_a_result: dict
    rail_b_result: dict
    drca_result: dict
    cascade_result: dict
    hitl_required: bool
    hitl_item_id: Optional[str]
    caal_entry_id: Optional[str]
    final_response: dict
    error: Optional[str]


class ComplianceOrchestrator:
    def __init__(self) -> None:
        self.rail_a = RailA()
        self.rail_b = RailB()
        self.drca = DRCAComparator()
        self.cascade = CascadeEngine()
        self.escalator = HITLEscalator()
        self.ledger = LedgerWriter()
        self.app = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(AgentState)
        graph.add_node("load_context", self._load_context)
        graph.add_node("run_rag_retrieval", self._run_rag_retrieval)
        graph.add_node("run_rail_a", self._run_rail_a)
        graph.add_node("run_rail_b", self._run_rail_b)
        graph.add_node("compare_rails", self._compare_rails)
        graph.add_node("run_cascade", self._run_cascade)
        graph.add_node("create_hitl", self._create_hitl)
        graph.add_node("write_caal", self._write_caal)
        graph.add_node("generate_response", self._generate_response)

        graph.set_entry_point("load_context")
        graph.add_edge("load_context", "run_rag_retrieval")
        graph.add_edge("run_rag_retrieval", "run_rail_a")
        graph.add_edge("run_rail_a", "run_rail_b")
        graph.add_edge("run_rail_b", "compare_rails")
        graph.add_conditional_edges(
            "compare_rails",
            self._route_after_compare,
            {"create_hitl": "create_hitl", "run_cascade": "run_cascade"},
        )
        graph.add_edge("create_hitl", "write_caal")
        graph.add_edge("run_cascade", "write_caal")
        graph.add_edge("write_caal", "generate_response")
        graph.add_edge("generate_response", END)
        return graph.compile()

    async def _load_context(self, state: AgentState) -> AgentState:
        db_session = state["db_session"]  # injected at runtime
        business = await db_session.scalar(select(Business).where(Business.id == state["business_id"]).limit(1))
        state["business_profile"] = business.__dict__ if business else {}
        state["portal_data"] = {}
        state["obligation_graph_data"] = self.rail_a.graph_builder.to_json()
        return state

    async def _run_rag_retrieval(self, state: AgentState) -> AgentState:
        state["retrieved_regulations"] = retrieve_relevant_regulations(
            state.get("query") or state.get("event_type") or "", state["business_profile"], n_results=5
        )
        return state

    async def _run_rail_a(self, state: AgentState) -> AgentState:
        state["rail_a_result"] = self.rail_a.generate_response(
            state.get("query") or state.get("event_type") or "",
            state["business_profile"],
            state["portal_data"],
        )
        return state

    async def _run_rail_b(self, state: AgentState) -> AgentState:
        state["rail_b_result"] = self.rail_b.generate_response(
            state.get("query") or state.get("event_type") or "",
            state["business_profile"],
            state["portal_data"],
        )
        return state

    async def _compare_rails(self, state: AgentState) -> AgentState:
        state["drca_result"] = self.drca.compare_rails(state["rail_a_result"], state["rail_b_result"])
        state["hitl_required"] = bool(state["drca_result"].get("hitl_required"))
        return state

    def _route_after_compare(self, state: AgentState) -> str:
        return "create_hitl" if state.get("hitl_required") else "run_cascade"

    async def _run_cascade(self, state: AgentState) -> AgentState:
        event = state.get("event_type") or "regulation_updated"
        state["cascade_result"] = await self.cascade.fire_event(event, state["business_profile"], {}, state["db_session"])
        return state

    async def _create_hitl(self, state: AgentState) -> AgentState:
        state["hitl_item_id"] = await self.escalator.create_escalation(
            business_id=state["business_id"],
            obligation_id=None,
            action_type="orchestrator_divergence",
            rail_a_response=state["rail_a_result"],
            rail_b_response=state["rail_b_result"],
            divergence_reason=state["drca_result"].get("divergence_reason", ""),
            confidence_score=float(state["drca_result"].get("confidence_score", 0.5)),
            db_session=state["db_session"],
        )
        return state

    async def _write_caal(self, state: AgentState) -> AgentState:
        payload = {
            "query": state.get("query"),
            "event_type": state.get("event_type"),
            "drca_result": state.get("drca_result", {}),
            "cascade_result": state.get("cascade_result", {}),
            "hitl_item_id": state.get("hitl_item_id"),
        }
        state["caal_entry_id"] = await self.ledger.write_entry(
            agent_name="coce" if not state.get("hitl_required") else "hitl",
            action_type="orchestrator_pipeline",
            business_id=state["business_id"],
            obligation_id=None,
            action_payload=payload,
            confidence_score=float(state.get("drca_result", {}).get("confidence_score", 0.7)),
            rail_agreement=bool(state.get("drca_result", {}).get("rail_agreement", False)),
            regulation_ids=state.get("rail_a_result", {}).get("regulation_ids", []),
            business_state_snapshot=state["business_profile"],
            source_citations=state.get("rail_a_result", {}).get("sources", []),
            db_session=state["db_session"],
        )
        return state

    async def _generate_response(self, state: AgentState) -> AgentState:
        state["final_response"] = {
            "message": state.get("drca_result", {}).get("final_response") or "Compliance workflow completed.",
            "hitl_required": state.get("hitl_required", False),
            "hitl_item_id": state.get("hitl_item_id"),
            "caal_entry_id": state.get("caal_entry_id"),
            "cascade_result": state.get("cascade_result", {}),
        }
        return state

    async def run_compliance_check(self, business_id: str, query: str, db_session) -> dict:
        initial_state: AgentState = {
            "business_id": business_id,
            "business_profile": {},
            "query": query,
            "event_type": None,
            "portal_data": {},
            "obligation_graph_data": {},
            "retrieved_regulations": [],
            "rail_a_result": {},
            "rail_b_result": {},
            "drca_result": {},
            "cascade_result": {},
            "hitl_required": False,
            "hitl_item_id": None,
            "caal_entry_id": None,
            "final_response": {},
            "error": None,
            "db_session": db_session,
        }
        final_state = await self.app.ainvoke(initial_state)
        return final_state["final_response"]

    async def run_event_cascade(self, business_id: str, event_type: str, db_session) -> dict:
        initial_state: AgentState = {
            "business_id": business_id,
            "business_profile": {},
            "query": None,
            "event_type": event_type,
            "portal_data": {},
            "obligation_graph_data": {},
            "retrieved_regulations": [],
            "rail_a_result": {},
            "rail_b_result": {},
            "drca_result": {},
            "cascade_result": {},
            "hitl_required": False,
            "hitl_item_id": None,
            "caal_entry_id": None,
            "final_response": {},
            "error": None,
            "db_session": db_session,
        }
        final_state = await self.app.ainvoke(initial_state)
        return final_state["final_response"]
