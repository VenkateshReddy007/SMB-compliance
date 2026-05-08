import asyncio
from datetime import datetime, timezone

from services.agents.caal.ledger_writer import LedgerWriter
from services.agents.drca.rail_a import RailA
from services.agents.drca.rail_b import RailB
from services.agents.hitl.escalation import HITLEscalator


class DRCAComparator:
    def __init__(self) -> None:
        self.rail_a = RailA()
        self.rail_b = RailB()
        self.escalator = HITLEscalator()
        self.ledger = LedgerWriter()

    def compare_rails(self, rail_a_result: dict, rail_b_result: dict) -> dict:
        if rail_b_result.get("is_deterministic"):
            a_text = str(rail_a_result.get("response", "")).lower()
            b_text = str(rail_b_result.get("result", "")).lower()
            agreement = b_text in a_text or a_text[:40] in b_text
            if agreement:
                confidence = (float(rail_a_result.get("confidence", 0.6)) + 0.98) / 2
                return {
                    "consensus": True,
                    "final_response": rail_a_result.get("response"),
                    "confidence_score": round(confidence, 3),
                    "rail_agreement": True,
                    "divergence_reason": "",
                    "hitl_required": False,
                }
            return {
                "consensus": False,
                "final_response": rail_a_result.get("response"),
                "confidence_score": 0.45,
                "rail_agreement": False,
                "divergence_reason": f"Rail A says {rail_a_result.get('response')} | Rule Engine says {rail_b_result.get('result')}",
                "hitl_required": True,
            }
        return {
            "consensus": True,
            "final_response": rail_a_result.get("response"),
            "confidence_score": round(float(rail_a_result.get("confidence", 0.65)), 3),
            "rail_agreement": False,
            "divergence_reason": "Rail B abstained on procedural query (LLM-only).",
            "hitl_required": False,
        }

    async def run_full_drca(self, query: str, business_profile: dict, portal_data: dict, db_session) -> dict:
        rail_a_task = asyncio.to_thread(self.rail_a.generate_response, query, business_profile, portal_data)
        rail_b_task = asyncio.to_thread(self.rail_b.generate_response, query, business_profile, portal_data)
        rail_a_result, rail_b_result = await asyncio.gather(rail_a_task, rail_b_task)

        comparison = self.compare_rails(rail_a_result, rail_b_result)
        hitl_item_id = None
        if comparison["hitl_required"]:
            hitl_item_id = await self.escalator.create_escalation(
                business_id=str(business_profile.get("id")),
                obligation_id=None,
                action_type="drca_divergence",
                rail_a_response=rail_a_result,
                rail_b_response=rail_b_result,
                divergence_reason=comparison["divergence_reason"],
                confidence_score=comparison["confidence_score"],
                db_session=db_session,
            )
            comparison["final_response"] = "Response generated with low confidence. Human review has been requested."
            comparison["hitl_item_id"] = hitl_item_id

        await self.ledger.write_entry(
            agent_name="drca",
            action_type="drca_evaluation",
            business_id=str(business_profile.get("id")),
            obligation_id=None,
            action_payload={
                "query": query,
                "rail_a_result": rail_a_result,
                "rail_b_result": rail_b_result,
                "comparison": comparison,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            confidence_score=float(comparison["confidence_score"]),
            rail_agreement=bool(comparison["rail_agreement"]),
            regulation_ids=rail_a_result.get("regulation_ids", []),
            business_state_snapshot=business_profile,
            source_citations=rail_a_result.get("sources", []),
            db_session=db_session,
        )
        return comparison
