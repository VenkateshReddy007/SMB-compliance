import hashlib
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from services.api.database import Business, CAALLedger


class AuditPacketGenerator:
    async def generate_packet(self, business_id: str, db_session) -> dict:
        business = await db_session.get(Business, business_id)
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        entries = (
            await db_session.scalars(
                select(CAALLedger)
                .where(CAALLedger.business_id == business_id, CAALLedger.timestamp >= cutoff)
                .order_by(CAALLedger.timestamp.desc())
            )
        ).all()

        scrubbed = {
            "id": str(business.id) if business else business_id,
            "name": business.name if business else "Unknown",
            "state": business.state if business else None,
            "business_type": business.business_type if business else None,
            "employee_count": business.employee_count if business else None,
            "gstin": "GST_REGISTERED" if business and business.gstin else "NOT_ON_FILE",
            "pan": "PAN_ON_FILE" if business and business.pan else "NOT_ON_FILE",
        }
        reduced_entries = [
            {
                "agent_did": e.agent_did,
                "action_type": e.action_type,
                "regulation_version": e.regulation_version,
                "confidence_score": float(e.confidence_score) if e.confidence_score is not None else None,
                "human_approved": e.human_approved,
                "action_hash": e.action_hash,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "source_citations": e.source_citations,
            }
            for e in entries
        ]
        total_actions = len(reduced_entries)
        human_approvals = sum(1 for e in reduced_entries if e["human_approved"])
        autonomous_actions = total_actions - human_approvals
        avg_conf = (
            round(
                sum((e["confidence_score"] or 0.0) for e in reduced_entries) / total_actions,
                3,
            )
            if total_actions
            else 0.0
        )

        packet = {
            "business_profile": scrubbed,
            "entries": reduced_entries,
            "summary_stats": {
                "total_actions": total_actions,
                "human_approvals": human_approvals,
                "autonomous_actions": autonomous_actions,
                "avg_confidence": avg_conf,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        packet_payload = json.dumps(packet, sort_keys=True, separators=(",", ":"))
        packet["packet_hash"] = hashlib.sha256(packet_payload.encode("utf-8")).hexdigest()
        return packet
