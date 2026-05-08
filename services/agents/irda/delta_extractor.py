from typing import Any


class DeltaExtractor:
    def extract_changed_regulations(self, old_content: dict, new_content: dict) -> list[str]:
        old_regs = {r["id"]: r for r in old_content.get("regulations", [])}
        new_regs = {r["id"]: r for r in new_content.get("regulations", [])}
        changed = []
        for reg_id, new_reg in new_regs.items():
            old_reg = old_regs.get(reg_id)
            if old_reg is None or old_reg != new_reg:
                changed.append(reg_id)
        return changed

    def build_delta_summary(self, old_content: dict, new_content: dict, changed_ids: list[str]) -> dict:
        old_regs = {r["id"]: r for r in old_content.get("regulations", [])}
        new_regs = {r["id"]: r for r in new_content.get("regulations", [])}
        changes: list[dict[str, Any]] = []
        for reg_id in changed_ids:
            old_reg = old_regs.get(reg_id, {})
            new_reg = new_regs.get(reg_id, {})
            for key in sorted(set(old_reg.keys()) | set(new_reg.keys())):
                if old_reg.get(key) != new_reg.get(key):
                    impact = "financial" if key in {"value", "unit"} else "procedural"
                    changes.append(
                        {
                            "regulation_id": reg_id,
                            "field_changed": key,
                            "old_value": old_reg.get(key),
                            "new_value": new_reg.get(key),
                            "impact_category": impact,
                        }
                    )
        return {"changes": changes}

    def update_obligation_graph(self, delta_summary: dict, graph_builder) -> list[str]:
        updated_nodes: list[str] = []
        for change in delta_summary.get("changes", []):
            result = graph_builder.update_node_from_portal(change["regulation_id"], change["new_value"])
            if result and result.get("node_id"):
                updated_nodes.append(result["node_id"])
        return sorted(set(updated_nodes))
