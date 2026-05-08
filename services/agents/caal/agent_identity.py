import hashlib
import json
from datetime import datetime, timezone


def _stable_suffix(agent_name: str) -> str:
    return hashlib.sha256(agent_name.encode("utf-8")).hexdigest()[:8]


AGENT_REGISTRY = {
    "irda": f"did:rgai:irda-agent-{_stable_suffix('irda')}",
    "drca": f"did:rgai:drca-agent-{_stable_suffix('drca')}",
    "coce": f"did:rgai:coce-agent-{_stable_suffix('coce')}",
    "hitl": f"did:rgai:hitl-agent-{_stable_suffix('hitl')}",
    "gst_agent": f"did:rgai:gst-agent-{_stable_suffix('gst_agent')}",
    "payroll_agent": f"did:rgai:payroll-agent-{_stable_suffix('payroll_agent')}",
    "dpdp_agent": f"did:rgai:dpdp-agent-{_stable_suffix('dpdp_agent')}",
}


class AgentIdentity:
    def get_did(self, agent_name: str) -> str:
        if agent_name not in AGENT_REGISTRY:
            AGENT_REGISTRY[agent_name] = f"did:rgai:{agent_name}-{_stable_suffix(agent_name)}"
        return AGENT_REGISTRY[agent_name]

    def sign_action(self, agent_name: str, action_payload: dict) -> str:
        agent_did = self.get_did(agent_name)
        timestamp = datetime.now(timezone.utc).isoformat()
        payload = json.dumps(action_payload, sort_keys=True, separators=(",", ":"))
        raw = f"{agent_did}{timestamp}{payload}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
