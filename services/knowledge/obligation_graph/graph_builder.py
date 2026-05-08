from dataclasses import asdict
from typing import Any

import networkx as nx

from .cross_domain_edges import propagate_event
from .node_schema import ObligationNode
from .versioner import GraphVersioner


class ObligationGraphBuilder:
    def __init__(self) -> None:
        self.graph = nx.DiGraph()
        self.versioner = GraphVersioner()

    def _add_node(self, node: ObligationNode) -> None:
        self.graph.add_node(node.node_id, data=node)
        for parent in node.parent_nodes:
            self.graph.add_edge(parent, node.node_id, edge_type="dependency")
        for child in node.child_nodes:
            self.graph.add_edge(node.node_id, child, edge_type="dependency")

    def build_graph(self) -> nx.DiGraph:
        nodes = [
            ObligationNode("GST_REGISTRATION", "GST", "GST Registration", "Registration when turnover crosses statutory threshold", "GST_THRESHOLD_001", "turnover", {"general": 2000000, "special": 4000000}, "gt", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "as_applicable", "N/A", 1, "2026-01-01", "gstn"),
            ObligationNode("GST_MONTHLY_FILING", "GST", "GST Monthly Filing", "GSTR-3B filing obligation for registered entities", "GST_DUE_DATE_001", "business_type", "GST_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "20th_of_next_month", "computed_liability", 1, "2026-01-01", "gstn", ["GST_REGISTRATION"]),
            ObligationNode("GST_LATE_FEE", "GST", "GST Late Fee", "Late filing fee capped as per portal", "GST_LATE_FEE_001", "business_type", "GST_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "post_due_date", "min(days_late*100,500)", 1, "2026-01-01", "gstn", ["GST_MONTHLY_FILING"]),
            ObligationNode("GST_ANNUAL_RETURN", "GST", "GSTR-9 Annual Return", "Annual GST return filing for registered taxpayers", "GST_ANNUAL_RETURN_001", "business_type", "GST_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "31_dec_next_fy", "N/A", 1, "2026-01-01", "gstn", ["GST_REGISTRATION"]),
            ObligationNode("GST_TDS_DEDUCTION", "GST", "GST TDS Deduction", "Deduct TDS when paying GST-registered vendors in applicable scenarios", "GST_TDS_001", "business_type", "GST_REGISTERED", "eq", ["manufacturing", "retail", "healthcare", "logistics", "it_services"], ["ALL"], "monthly", "payment * 0.02", 1, "2026-01-01", "gstn", ["GST_REGISTRATION"]),
            ObligationNode("PF_REGISTRATION", "PF", "PF Registration", "PF registration after reaching employee threshold", "PF_REGISTRATION_THRESHOLD_001", "employee_count", 20, "gte", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "as_applicable", "N/A", 1, "2026-01-01", "epfo"),
            ObligationNode("PF_MONTHLY_CHALLAN", "PF", "PF Monthly Challan", "Monthly PF challan payment", "PF_ECR_DUE_DATE_001", "business_type", "PF_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "15th_of_next_month", "sum(employee_pf)", 1, "2026-01-01", "epfo", ["PF_REGISTRATION"]),
            ObligationNode("PF_ECR_FILING", "PF", "PF ECR Filing", "Upload ECR by due date", "PF_ECR_DUE_DATE_001", "business_type", "PF_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "15th_of_next_month", "N/A", 1, "2026-01-01", "epfo", ["PF_REGISTRATION"]),
            ObligationNode("PF_EMPLOYER_CONTRIBUTION", "PF", "PF Employer Contribution", "Compute 12% contribution with wage ceiling", "PF_EMPLOYER_RATE_001", "employee_count", 1, "gte", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "monthly", "min(basic_salary,15000)*0.12", 1, "2026-01-01", "epfo", ["PF_REGISTRATION"]),
            ObligationNode("ESI_REGISTRATION", "ESI", "ESI Registration", "ESI registration after employee threshold and salary criteria", "ESI_THRESHOLD_001", "employee_count", 10, "gte", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "as_applicable", "N/A", 1, "2026-01-01", "epfo"),
            ObligationNode("ESI_MONTHLY_CHALLAN", "ESI", "ESI Monthly Challan", "Monthly ESI challan payment", "ESI_THRESHOLD_001", "business_type", "ESI_REGISTERED", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "15th_of_next_month", "sum(esi)", 1, "2026-01-01", "epfo", ["ESI_REGISTRATION"]),
            ObligationNode("ESI_EMPLOYER_CONTRIBUTION", "ESI", "ESI Employer Contribution", "Compute 3.25% employer ESI contribution", "ESI_THRESHOLD_001", "employee_count", 1, "gte", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "monthly", "gross_salary*0.0325", 1, "2026-01-01", "epfo", ["ESI_REGISTRATION"]),
            ObligationNode("FSSAI_BASIC_REGISTRATION", "FSSAI", "FSSAI Basic Registration", "Food entities below threshold require basic registration", "FSSAI_THRESHOLD_STATE_001", "turnover", 1200000, "lte", ["food_business"], ["ALL"], "annual", "N/A", 1, "2026-01-01", "fssai"),
            ObligationNode("FSSAI_STATE_LICENSE", "FSSAI", "FSSAI State License", "State license for food entities from 12L to 20Cr", "FSSAI_THRESHOLD_STATE_001", "turnover", {"min": 1200000, "max": 200000000}, "gte", ["food_business"], ["ALL"], "annual", "fee_by_capacity", 1, "2026-01-01", "fssai", ["FSSAI_BASIC_REGISTRATION"]),
            ObligationNode("FSSAI_ANNUAL_RETURN", "FSSAI", "FSSAI Annual Return", "Annual return due by May 31", "FSSAI_ANNUAL_RETURN_001", "business_type", "FOOD_BUSINESSES_STATE_LICENSE", "eq", ["food_business"], ["ALL"], "31_may", "N/A", 1, "2026-01-01", "fssai", ["FSSAI_STATE_LICENSE"]),
            ObligationNode("FSSAI_LICENSE_RENEWAL", "FSSAI", "FSSAI License Renewal", "Renew license every 12 months", "FSSAI_RENEWAL_PERIOD_001", "business_type", "FOOD_BUSINESSES", "eq", ["food_business"], ["ALL"], "12_month_cycle", "renewal_fee", 1, "2026-01-01", "fssai", ["FSSAI_STATE_LICENSE"]),
            ObligationNode("PT_MH_REGISTRATION", "PT", "Maharashtra PT Registration", "Professional tax setup for Maharashtra employers", "PT_MH_SLAB_001", "state", "MH", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["MH"], "as_applicable", "N/A", 1, "2026-01-01", "pt_states"),
            ObligationNode("PT_MH_MONTHLY_DEDUCTION", "PT", "Maharashtra PT Monthly Deduction", "Apply Maharashtra PT slabs monthly", "PT_MH_SLAB_002", "state", "MH", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["MH"], "monthly", "slab_lookup", 1, "2026-01-01", "pt_states", ["PT_MH_REGISTRATION"]),
            ObligationNode("PT_KA_MONTHLY_DEDUCTION", "PT", "Karnataka PT Monthly Deduction", "Apply Karnataka PT slabs monthly", "PT_KA_SLAB_001", "state", "KA", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["KA"], "monthly", "slab_lookup", 1, "2026-01-01", "pt_states"),
            ObligationNode("PT_WB_MONTHLY_DEDUCTION", "PT", "West Bengal PT Monthly Deduction", "Apply West Bengal PT slabs monthly", "PT_WB_SLAB_001", "state", "WB", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["WB"], "monthly", "slab_lookup", 1, "2026-01-01", "pt_states"),
            ObligationNode("TDS_194C", "TDS", "TDS Section 194C", "TDS on contractor payments", "TDS_194C_001", "business_type", "ALL_BUSINESSES", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "monthly", "payment*rate", 1, "2026-01-01", "income_tax"),
            ObligationNode("TDS_194J", "TDS", "TDS Section 194J", "TDS on professional fees", "TDS_194J_001", "business_type", "ALL_BUSINESSES", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "monthly", "payment*0.10", 1, "2026-01-01", "income_tax"),
            ObligationNode("TDS_QUARTERLY_RETURN", "TDS", "TDS Quarterly Return", "Quarterly filing for deducted TDS", "TDS_Q_RETURN_001", "business_type", "ALL_BUSINESSES", "eq", ["food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"], ["ALL"], "quarterly", "N/A", 1, "2026-01-01", "income_tax", ["TDS_194C", "TDS_194J"]),
        ]

        self.graph.clear()
        for node in nodes:
            self._add_node(node)

        self.graph.add_edge("GST_REGISTRATION", "GST_TDS_DEDUCTION", edge_type="triggers")
        self.graph.add_edge("PF_REGISTRATION", "PF_EMPLOYER_CONTRIBUTION", edge_type="triggers")
        return self.graph

    def _matches(self, node: ObligationNode, business_profile: dict[str, Any]) -> bool:
        b_type = business_profile.get("business_type")
        state = business_profile.get("state")
        turnover = float(business_profile.get("annual_turnover", 0))
        employees = int(business_profile.get("employee_count", 0))

        if "ALL" not in node.applies_to_business_types and b_type not in node.applies_to_business_types:
            return False
        if "ALL" not in node.applies_to_states and state not in node.applies_to_states:
            return False

        if node.threshold_type == "turnover":
            t_val = node.threshold_value
            if isinstance(t_val, dict) and "min" in t_val and turnover < t_val["min"]:
                return False
            if node.threshold_operator == "gt" and not (turnover > float(t_val if not isinstance(t_val, dict) else t_val.get("general", 0))):
                return False
            if node.threshold_operator == "lte" and not (turnover <= float(t_val)):
                return False
        if node.threshold_type == "employee_count":
            if node.threshold_operator == "gte" and not (employees >= int(node.threshold_value)):
                return False
        if node.threshold_type == "state":
            if state != node.threshold_value:
                return False
        return True

    def get_applicable_obligations(self, business_profile: dict[str, Any]) -> list[ObligationNode]:
        applicable = []
        for _, attrs in self.graph.nodes(data=True):
            node: ObligationNode = attrs["data"]
            if self._matches(node, business_profile):
                applicable.append(node)
        return applicable

    def get_cascade_from_event(self, event_type: str, business_profile: dict[str, Any]) -> list[ObligationNode]:
        triggered = propagate_event(event_type, business_profile, self.graph)
        return [item["node"] for item in triggered if self._matches(item["node"], business_profile)]

    def get_affected_businesses_for_regulation(self, regulation_id: str, all_businesses: list[dict[str, Any]]) -> list[str]:
        target_nodes = [attrs["data"] for _, attrs in self.graph.nodes(data=True) if attrs["data"].regulation_id == regulation_id]
        if not target_nodes:
            return []
        affected = []
        for business in all_businesses:
            if any(self._matches(node, business) for node in target_nodes):
                affected.append(str(business.get("id")))
        return affected

    def to_json(self) -> dict[str, Any]:
        return {
            "nodes": [asdict(attrs["data"]) for _, attrs in self.graph.nodes(data=True)],
            "edges": [{"source": u, "target": v, **meta} for u, v, meta in self.graph.edges(data=True)],
        }

    def update_node_from_portal(self, regulation_id: str, new_value: Any) -> dict[str, Any] | None:
        for _, attrs in self.graph.nodes(data=True):
            node: ObligationNode = attrs["data"]
            if node.regulation_id == regulation_id:
                return self.versioner.update_node(
                    node=node,
                    changed_field="threshold_value",
                    new_value=new_value,
                    regulation_id=regulation_id,
                    portal=node.source_portal,
                )
        return None

    def get_graph_delta(self, old_snapshot: dict[str, Any], new_snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        old_map = {n["node_id"]: n for n in old_snapshot.get("nodes", [])}
        deltas = []
        for node in new_snapshot.get("nodes", []):
            previous = old_map.get(node["node_id"])
            if previous and previous != node:
                changed_fields = [k for k in node.keys() if previous.get(k) != node.get(k)]
                deltas.append({"node_id": node["node_id"], "changed_fields": changed_fields, "before": previous, "after": node})
        return deltas
