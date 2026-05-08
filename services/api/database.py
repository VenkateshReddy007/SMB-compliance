from datetime import datetime
from decimal import Decimal
from typing import Any, AsyncGenerator
from uuid import UUID

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from config import settings


def _to_async_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


engine = create_async_engine(_to_async_url(settings.database_url), future=True, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    clerk_user_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_type: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(50))
    annual_turnover: Mapped[int | None] = mapped_column(Integer)
    employee_count: Mapped[int | None] = mapped_column(Integer)
    gst_registered: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    pf_registered: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    esi_registered: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    fssai_registered: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    pt_state: Mapped[str | None] = mapped_column(String(50))
    gstin: Mapped[str | None] = mapped_column(String(20))
    pan: Mapped[str | None] = mapped_column(String(15))
    sector_tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    onboarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    dpdp_consent_given: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    dpdp_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Obligation(Base):
    __tablename__ = "obligations"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"))
    obligation_id: Mapped[str | None] = mapped_column(String(100))
    domain: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(50))
    due_date: Mapped[datetime | None] = mapped_column(Date)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    source_portal: Mapped[str | None] = mapped_column(String(100))
    source_regulation_version: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    version: Mapped[int] = mapped_column(Integer, server_default=text("1"))


class RegulationSnapshot(Base):
    __tablename__ = "regulation_snapshots"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    portal_name: Mapped[str | None] = mapped_column(String(100))
    portal_url: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64))
    raw_content: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    change_detected: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class RegulationDelta(Base):
    __tablename__ = "regulation_deltas"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    portal_name: Mapped[str | None] = mapped_column(String(100))
    previous_hash: Mapped[str | None] = mapped_column(String(64))
    new_hash: Mapped[str | None] = mapped_column(String(64))
    changed_regulation_ids: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    delta_summary: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    affected_business_count: Mapped[int | None] = mapped_column(Integer)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    processed: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class HITLQueue(Base):
    __tablename__ = "hitl_queue"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id"))
    obligation_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("obligations.id"))
    action_type: Mapped[str | None] = mapped_column(String(100))
    rail_a_response: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    rail_b_response: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    divergence_reason: Mapped[str | None] = mapped_column(Text)
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    status: Mapped[str] = mapped_column(String(50), server_default=text("'pending'"))
    escalated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[str | None] = mapped_column(String(255))
    resolution_notes: Mapped[str | None] = mapped_column(Text)


class CAALLedger(Base):
    __tablename__ = "caal_ledger"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    agent_did: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    obligation_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    regulation_ids: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    regulation_version: Mapped[str | None] = mapped_column(String(100))
    business_state_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    action_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    rail_agreement: Mapped[bool | None] = mapped_column(Boolean)
    human_approved: Mapped[bool | None] = mapped_column(Boolean)
    human_approver_id: Mapped[str | None] = mapped_column(String(255))
    action_hash: Mapped[str | None] = mapped_column(String(64))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    source_citations: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class VaultToken(Base):
    __tablename__ = "vault_tokens"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id"))
    token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    data_type: Mapped[str | None] = mapped_column(String(50))
    encrypted_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    last_accessed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ComplianceAlert(Base):
    __tablename__ = "compliance_alerts"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id"))
    alert_type: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str | None] = mapped_column(Text)
    regulation_delta_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("regulation_deltas.id"))
    plain_language_card: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_read: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))


class GSTFilingStatus(Base):
    __tablename__ = "gst_filing_status"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id"))
    period: Mapped[str | None] = mapped_column(String(20))
    readiness_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    missing_items: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    total_gst_liability: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    input_tax_credit: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    net_payable: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    filing_status: Mapped[str | None] = mapped_column(String(50))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))


class PayrollDues(Base):
    __tablename__ = "payroll_dues"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("businesses.id"))
    period: Mapped[str | None] = mapped_column(String(20))
    pf_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    esi_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    pt_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    tds_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    pf_due_date: Mapped[datetime | None] = mapped_column(Date)
    esi_due_date: Mapped[datetime | None] = mapped_column(Date)
    pt_due_date: Mapped[datetime | None] = mapped_column(Date)
    tds_due_date: Mapped[datetime | None] = mapped_column(Date)
    pf_status: Mapped[str] = mapped_column(String(50), server_default=text("'pending'"))
    esi_status: Mapped[str] = mapped_column(String(50), server_default=text("'pending'"))
    pt_status: Mapped[str] = mapped_column(String(50), server_default=text("'pending'"))
    tds_status: Mapped[str] = mapped_column(String(50), server_default=text("'pending'"))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
