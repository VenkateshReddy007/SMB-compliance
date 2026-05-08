from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from .node_schema import ObligationNode


class GraphVersioner:
    def __init__(self) -> None:
        self.version_history: dict[str, list[dict[str, Any]]] = {}

    def update_node(
        self,
        node: ObligationNode,
        changed_field: str,
        new_value: Any,
        regulation_id: str,
        portal: str,
    ) -> dict[str, Any]:
        old_value = getattr(node, changed_field)
        previous_snapshot = asdict(node)

        node.version += 1
        setattr(node, changed_field, new_value)

        self.version_history.setdefault(node.node_id, []).append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": node.version - 1,
                "snapshot": previous_snapshot,
                "regulation_id": regulation_id,
                "portal": portal,
            }
        )

        return {
            "node_id": node.node_id,
            "old_value": old_value,
            "new_value": new_value,
            "changed_field": changed_field,
            "version": node.version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "regulation_id": regulation_id,
            "source_portal": portal,
        }
