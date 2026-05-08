from sqlalchemy import select

from services.agents.coce.dependency_map import BUSINESS_EVENTS
from services.api.database import Business, HITLQueue, Obligation
from services.knowledge.obligation_graph.graph_builder import ObligationGraphBuilder


class CascadeEngine:
    def __init__(self) -> None:
        self.graph_builder = ObligationGraphBuilder()
        self.graph_builder.build_graph()

    def _threshold_match(self, profile: dict, rule: dict) -> bool:
        if "condition" in rule:
            k, v = rule["condition"].split("=")
            if str(profile.get(k)) != v:
                return False
        field = rule.get("field")
        operator = rule.get("operator")
        value = rule.get("value")
        current = profile.get(field, 0)
        if operator == "gte":
            return current >= value
        if operator == "gt":
            return current > value
        if operator == "lte":
            return current <= value
        if operator == "lt":
            return current < value
        if operator == "eq":
            return current == value
        return False

    async def fire_event(self, event_type: str, business_profile: dict, additional_context: dict, db_session) -> dict:
        event = BUSINESS_EVENTS.get(event_type, {})
        checks = event.get("checks", [])
        thresholds = event.get("thresholds", {})
        triggered = []
        cascaded_domains = set()

        for check in checks:
            if check == "ALL_AFFECTED_OBLIGATIONS":
                triggered.extend(self.graph_builder.get_applicable_obligations(business_profile))
                continue
            rule = thresholds.get(check)
            if rule is None or self._threshold_match(business_profile, rule):
                node = self.graph_builder.graph.nodes.get(check, {}).get("data")
                if node:
                    triggered.append(node)
                    cascaded_domains.add(node.domain)
                    if check == "PF_REGISTRATION":
                        esi = self.graph_builder.graph.nodes.get("ESI_REGISTRATION", {}).get("data")
                        if esi:
                            triggered.append(esi)
                            cascaded_domains.add("ESI")
                    if check.startswith("FSSAI"):
                        gst = self.graph_builder.graph.nodes.get("GST_REGISTRATION", {}).get("data")
                        if gst:
                            triggered.append(gst)
                            cascaded_domains.add("GST")

        return {
            "event": event_type,
            "triggered_obligations": [n.node_id for n in triggered],
            "cascaded_domains": sorted(cascaded_domains),
            "total_new_obligations": len(triggered),
        }

    async def evaluate_regulation_change_cascade(self, changed_regulation_ids: list[str], all_businesses: list, db_session) -> dict:
        created = 0
        updated = 0
        for business in all_businesses:
            profile = business if isinstance(business, dict) else business.__dict__
            applicable = self.graph_builder.get_applicable_obligations(profile)
            current = (
                await db_session.scalars(select(Obligation).where(Obligation.business_id == business.id))
                if not isinstance(business, dict)
                else []
            )
            current_ids = {o.obligation_id for o in (current.all() if current else [])}
            for node in applicable:
                if node.regulation_id in changed_regulation_ids and node.regulation_id not in current_ids:
                    db_session.add(
                        Obligation(
                            business_id=business.id,
                            obligation_id=node.regulation_id,
                            domain=node.domain,
                            title=node.title,
                            description=node.description,
                            status="pending",
                            source_portal=node.source_portal,
                            source_regulation_version=str(node.version),
                        )
                    )
                    created += 1
                elif node.regulation_id in changed_regulation_ids:
                    updated += 1
        await db_session.commit()
        return {"created": created, "updated": updated, "businesses_checked": len(all_businesses)}

    async def process_hitl_resolution(self, hitl_item_id: str, decision: str, db_session) -> None:
        item = await db_session.get(HITLQueue, hitl_item_id)
        if not item:
            return
        item.status = "approved" if decision == "approved" else "rejected"
        await db_session.commit()
