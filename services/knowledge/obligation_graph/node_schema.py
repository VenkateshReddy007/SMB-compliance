from dataclasses import dataclass, field
from typing import Any, List


@dataclass
class ObligationNode:
    node_id: str
    domain: str
    title: str
    description: str
    regulation_id: str
    threshold_type: str
    threshold_value: Any
    threshold_operator: str
    applies_to_business_types: List[str]
    applies_to_states: List[str]
    due_date_rule: str
    amount_formula: str
    version: int
    effective_date: str
    source_portal: str
    parent_nodes: List[str] = field(default_factory=list)
    child_nodes: List[str] = field(default_factory=list)


@dataclass
class CrossDomainEdge:
    source_node_id: str
    target_node_id: str
    trigger_event: str
    edge_type: str
    description: str
