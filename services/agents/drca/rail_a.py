from services.knowledge.obligation_graph.graph_builder import ObligationGraphBuilder
from services.knowledge.rag.gemini_client import GeminiComplianceClient, SYSTEM_PROMPT
from services.knowledge.rag.retriever import build_context_prompt, retrieve_relevant_regulations


class RailA:
    def __init__(self) -> None:
        self.graph_builder = ObligationGraphBuilder()
        self.graph_builder.build_graph()
        self.gemini = GeminiComplianceClient()

    def compute_rail_a_confidence(self, retrieved_docs: list, query: str) -> float:
        if not retrieved_docs:
            return 0.35
        strong_hits = sum(1 for d in retrieved_docs if (d.get("distance") or 1.0) < 0.5)
        score = min(0.95, 0.55 + strong_hits * 0.08)
        return round(score, 3)

    def generate_response(self, query: str, business_profile: dict, portal_data: dict) -> dict:
        retrieved = retrieve_relevant_regulations(query, business_profile, n_results=5)
        obligations = self.graph_builder.get_applicable_obligations(business_profile)
        context = build_context_prompt(query, retrieved, business_profile)
        context += "\n\nApplicable obligations:\n" + "\n".join(
            [f"- {o.node_id}: {o.title} ({o.regulation_id})" for o in obligations[:10]]
        )
        llm_out = self.gemini.generate_compliance_response(SYSTEM_PROMPT, query, context)
        regulation_ids = [doc["id"] for doc in retrieved]
        sources = [doc.get("metadata", {}).get("source", "unknown") for doc in retrieved]
        domain = retrieved[0].get("metadata", {}).get("domain", "GENERAL") if retrieved else "GENERAL"
        return {
            "response": llm_out["response"],
            "confidence": self.compute_rail_a_confidence(retrieved, query),
            "sources": sources,
            "regulation_ids": regulation_ids,
            "domain": domain,
        }
