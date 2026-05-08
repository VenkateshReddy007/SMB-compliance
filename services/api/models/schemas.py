from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class BusinessProfile(BaseModel):
    id: UUID
    clerk_user_id: str | None = None
    name: str
    business_type: str | None = None
    state: str | None = None
    annual_turnover: int | None = None
    employee_count: int | None = None
    gst_registered: bool = False
    pf_registered: bool = False
    esi_registered: bool = False
    fssai_registered: bool = False
    pt_state: str | None = None
    gstin: str | None = None
    pan: str | None = None
    sector_tags: list[str] | None = None
    onboarded_at: datetime | None = None

    model_config = {"from_attributes": True}


class BusinessCreate(BaseModel):
    clerk_user_id: str | None = None
    name: str
    business_type: str | None = None
    state: str | None = None
    annual_turnover: int | None = None
    employee_count: int | None = None
    gst_registered: bool = False
    pf_registered: bool = False
    esi_registered: bool = False
    fssai_registered: bool = False
    pt_state: str | None = None
    gstin: str | None = None
    pan: str | None = None
    sector_tags: list[str] | None = None


class BusinessUpdate(BaseModel):
    name: str | None = None
    business_type: str | None = None
    state: str | None = None
    annual_turnover: int | None = None
    employee_count: int | None = None
    gst_registered: bool | None = None
    pf_registered: bool | None = None
    esi_registered: bool | None = None
    fssai_registered: bool | None = None
    pt_state: str | None = None
    gstin: str | None = None
    pan: str | None = None
    sector_tags: list[str] | None = None


class ObligationCreate(BaseModel):
    business_id: UUID
    obligation_id: str
    domain: str
    title: str
    description: str | None = None
    status: str = "pending"
    due_date: date | None = None
    amount: Decimal | None = None
    confidence_score: Decimal | None = None
    source_portal: str | None = None
    source_regulation_version: str | None = None


class ObligationResponse(BaseModel):
    id: UUID
    business_id: UUID | None = None
    obligation_id: str | None = None
    domain: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None
    due_date: date | None = None
    amount: Decimal | None = None
    confidence_score: Decimal | None = None
    source_portal: str | None = None
    source_regulation_version: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    version: int | None = None

    model_config = {"from_attributes": True}


class HITLQueueItem(BaseModel):
    id: UUID
    business_id: UUID | None = None
    obligation_id: UUID | None = None
    action_type: str | None = None
    rail_a_response: dict[str, Any] | None = None
    rail_b_response: dict[str, Any] | None = None
    divergence_reason: str | None = None
    confidence_score: Decimal | None = None
    status: str
    escalated_at: datetime | None = None
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    resolution_notes: str | None = None

    model_config = {"from_attributes": True}


class HITLResolveRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    notes: str
    approver_id: str


class AuditLedgerEntry(BaseModel):
    id: UUID
    agent_did: str
    agent_name: str
    action_type: str
    business_id: UUID | None = None
    obligation_id: UUID | None = None
    regulation_ids: list[str] | None = None
    regulation_version: str | None = None
    business_state_snapshot: dict[str, Any] | None = None
    action_payload: dict[str, Any] | None = None
    confidence_score: Decimal | None = None
    rail_agreement: bool | None = None
    human_approved: bool | None = None
    human_approver_id: str | None = None
    action_hash: str | None = None
    timestamp: datetime | None = None
    source_citations: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class ComplianceAlert(BaseModel):
    id: UUID
    business_id: UUID | None = None
    alert_type: str | None = None
    title: str | None = None
    message: str | None = None
    regulation_delta_id: UUID | None = None
    plain_language_card: dict[str, Any] | None = None
    is_read: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    alerts: list[ComplianceAlert]
    unread_count: int


class GSTFilingStatus(BaseModel):
    id: UUID
    business_id: UUID | None = None
    period: str | None = None
    readiness_score: Decimal | None = None
    missing_items: list[str] | None = None
    total_gst_liability: Decimal | None = None
    input_tax_credit: Decimal | None = None
    net_payable: Decimal | None = None
    filing_status: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PayrollDues(BaseModel):
    id: UUID
    business_id: UUID | None = None
    period: str | None = None
    pf_amount: Decimal | None = None
    esi_amount: Decimal | None = None
    pt_amount: Decimal | None = None
    tds_amount: Decimal | None = None
    pf_due_date: date | None = None
    esi_due_date: date | None = None
    pt_due_date: date | None = None
    tds_due_date: date | None = None
    pf_status: str | None = None
    esi_status: str | None = None
    pt_status: str | None = None
    tds_status: str | None = None

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    message: str
    business_id: UUID
    conversation_history: list[dict[str, Any]] = []


class ChatResponse(BaseModel):
    response: str
    confidence_score: float
    sources: list[str]
    rail_agreement: bool
    hitl_escalated: bool


class RegulationDelta(BaseModel):
    id: UUID
    portal_name: str | None = None
    previous_hash: str | None = None
    new_hash: str | None = None
    changed_regulation_ids: list[str] | None = None
    delta_summary: dict[str, Any] | None = None
    affected_business_count: int | None = None
    detected_at: datetime | None = None
    processed: bool = False

    model_config = {"from_attributes": True}


class DeltaNotification(BaseModel):
    event: str
    portal: str
    affected_count: int
    delta_id: str
    message: str
    timestamp: datetime
