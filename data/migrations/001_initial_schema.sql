CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) CHECK (business_type IN ('food_business', 'it_services', 'manufacturing', 'retail', 'healthcare', 'logistics')),
  state VARCHAR(50) CHECK (state IN ('MH', 'KA', 'WB', 'GJ', 'TN')),
  annual_turnover BIGINT,
  employee_count INTEGER,
  gst_registered BOOLEAN DEFAULT false,
  pf_registered BOOLEAN DEFAULT false,
  esi_registered BOOLEAN DEFAULT false,
  fssai_registered BOOLEAN DEFAULT false,
  pt_state VARCHAR(50),
  gstin VARCHAR(20),
  pan VARCHAR(15),
  sector_tags TEXT[],
  onboarded_at TIMESTAMPTZ DEFAULT NOW(),
  dpdp_consent_given BOOLEAN DEFAULT false,
  dpdp_consent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  obligation_id VARCHAR(100),
  domain VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  status VARCHAR(50) CHECK (status IN ('pending', 'compliant', 'overdue', 'hitl_escalated', 'waived')),
  due_date DATE,
  amount NUMERIC(15,2),
  confidence_score NUMERIC(4,3),
  source_portal VARCHAR(100),
  source_regulation_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS regulation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_name VARCHAR(100),
  portal_url TEXT,
  content_hash VARCHAR(64),
  raw_content JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  change_detected BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS regulation_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_name VARCHAR(100),
  previous_hash VARCHAR(64),
  new_hash VARCHAR(64),
  changed_regulation_ids TEXT[],
  delta_summary JSONB,
  affected_business_count INTEGER,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS hitl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  obligation_id UUID REFERENCES obligations(id),
  action_type VARCHAR(100),
  rail_a_response JSONB,
  rail_b_response JSONB,
  divergence_reason TEXT,
  confidence_score NUMERIC(4,3),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS caal_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_did VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  business_id UUID,
  obligation_id UUID,
  regulation_ids TEXT[],
  regulation_version VARCHAR(100),
  business_state_snapshot JSONB,
  action_payload JSONB,
  confidence_score NUMERIC(4,3),
  rail_agreement BOOLEAN,
  human_approved BOOLEAN,
  human_approver_id VARCHAR(255),
  action_hash VARCHAR(64),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source_citations JSONB
);

CREATE TABLE IF NOT EXISTS vault_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  token VARCHAR(100) UNIQUE NOT NULL,
  data_type VARCHAR(50),
  encrypted_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  alert_type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  regulation_delta_id UUID REFERENCES regulation_deltas(id),
  plain_language_card JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gst_filing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  period VARCHAR(20),
  readiness_score NUMERIC(4,1),
  missing_items TEXT[],
  total_gst_liability NUMERIC(15,2),
  input_tax_credit NUMERIC(15,2),
  net_payable NUMERIC(15,2),
  filing_status VARCHAR(50) CHECK (filing_status IN ('not_started', 'in_progress', 'ready', 'filed')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  period VARCHAR(20),
  pf_amount NUMERIC(15,2),
  esi_amount NUMERIC(15,2),
  pt_amount NUMERIC(15,2),
  tds_amount NUMERIC(15,2),
  pf_due_date DATE,
  esi_due_date DATE,
  pt_due_date DATE,
  tds_due_date DATE,
  pf_status VARCHAR(50) DEFAULT 'pending',
  esi_status VARCHAR(50) DEFAULT 'pending',
  pt_status VARCHAR(50) DEFAULT 'pending',
  tds_status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_businesses_clerk_user_id ON businesses(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_gst_registered ON businesses(gst_registered);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON businesses(business_type);

CREATE INDEX IF NOT EXISTS idx_obligations_business_id ON obligations(business_id);
CREATE INDEX IF NOT EXISTS idx_obligations_domain ON obligations(domain);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON obligations(status);
CREATE INDEX IF NOT EXISTS idx_obligations_due_date ON obligations(due_date);

CREATE INDEX IF NOT EXISTS idx_caal_ledger_agent_did ON caal_ledger(agent_did);
CREATE INDEX IF NOT EXISTS idx_caal_ledger_business_id ON caal_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_caal_ledger_timestamp ON caal_ledger(timestamp);

CREATE INDEX IF NOT EXISTS idx_hitl_queue_status ON hitl_queue(status);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_business_id ON hitl_queue(business_id);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_business_id ON compliance_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_is_read ON compliance_alerts(is_read);

CREATE OR REPLACE FUNCTION set_obligations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obligations_updated_at ON obligations;
CREATE TRIGGER trg_obligations_updated_at
BEFORE UPDATE ON obligations
FOR EACH ROW
EXECUTE FUNCTION set_obligations_updated_at();
