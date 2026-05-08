from typing import Any


CROSS_DOMAIN_EDGES = {
    "NEW_HIRE_EVENT": [
        {
            "target": "PF_REGISTRATION",
            "edge_type": "triggers",
            "description": "New hire can push employee count above PF registration threshold",
        },
        {
            "target": "ESI_REGISTRATION",
            "edge_type": "triggers",
            "description": "New hire can trigger ESI applicability checks",
        },
    ],
    "TURNOVER_CROSSES_40L": [
        {
            "target": "GST_REGISTRATION",
            "edge_type": "triggers",
            "description": "Turnover threshold crossed for GST registration",
        }
    ],
    "TURNOVER_CROSSES_12L_FOOD": [
        {
            "target": "FSSAI_STATE_LICENSE",
            "edge_type": "triggers",
            "description": "Food business requires state license above 12L turnover",
        }
    ],
    "TURNOVER_CROSSES_40L_FOOD": [
        {
            "target": "FSSAI_ANNUAL_RETURN",
            "edge_type": "updates",
            "description": "Higher turnover strengthens annual return obligations",
        }
    ],
    "GST_REGISTRATION": [
        {
            "target": "GST_TDS_DEDUCTION",
            "edge_type": "triggers",
            "description": "GST registration enables GST-TDS checks",
        }
    ],
    "PF_REGISTRATION": [
        {
            "target": "PF_EMPLOYER_CONTRIBUTION",
            "edge_type": "triggers",
            "description": "PF registration activates contribution computations",
        }
    ],
    "NEW_PRODUCT_CATEGORY_FOOD": [
        {
            "target": "FSSAI_STATE_LICENSE",
            "edge_type": "updates",
            "description": "Food product category change can require license amendment",
        }
    ],
}


def propagate_event(event_type: str, business_profile: dict[str, Any], graph) -> list[dict[str, Any]]:
    """Return all obligations triggered by a business event."""
    edges = CROSS_DOMAIN_EDGES.get(event_type, [])
    triggered = []
    for edge in edges:
        node_id = edge["target"]
        if node_id in graph:
            node_data = graph.nodes[node_id].get("data")
            if node_data is not None:
                triggered.append({"node": node_data, "edge": edge})
    return triggered


def get_plain_language_card(triggered_obligations: list[dict[str, Any]], business_name: str) -> str:
    if not triggered_obligations:
        return f"No compliance changes detected for {business_name}."
    titles = [item["node"].title for item in triggered_obligations]
    title_list = ", ".join(titles)
    return (
        f"What changed for {business_name}: {title_list}. "
        "Please review these obligations and update filings, registrations, or challans before due dates."
    )
