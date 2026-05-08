# RegGraph AI Memory

## Project Context

- **Project name:** RegGraph AI (RGAI)
- **Architecture:** Monorepo with web app, service layer, data layer, and local infra.
- **Primary stacks:**
  - `apps/web`: Next.js 14 (App Router, TypeScript, Tailwind, shadcn UI)
  - `services/api`: FastAPI scaffold targeting Python 3.11
  - Data + infra: PostgreSQL, Redis, pgAdmin, and env-driven local config

## Implementation Log

### Task: PRE-PHASE Prompt 0.1 - Monorepo Scaffold
**Status:** Completed  
**Date:** 2026-05-08

Implemented:
1. Created monorepo directory structure:
   - `apps/web`
   - `apps/mock-portals/{gstn,epfo,fssai,pt-states}`
   - `services/{api,agents,knowledge,scheduler}`
   - `data/{seed,migrations}`
2. Scaffolded `apps/web` using Next.js 14 with TypeScript, App Router, Tailwind, and alias `@/*`.
3. Installed web dependencies:
   - `@clerk/nextjs` (Next 14-compatible major)
   - `shadcn-ui`, `lucide-react`, `d3`, `@types/d3`, `recharts`, `socket.io-client`
4. Initialized shadcn setup and configured component registry to use:
   - style: `default`
   - base color: `slate`
   - css variables: enabled
5. Added shadcn components:
   - `button`, `card`, `badge`, `dialog`, `sheet`, `tabs`, `toast`, `progress`, `alert`, `separator`, `skeleton`
6. Created FastAPI scaffold files:
   - `services/api/main.py`
   - `services/api/requirements.txt`
   - `services/api/config.py`
   - Added starter FastAPI health endpoint and basic settings wiring
7. Added root infrastructure and config files:
   - `docker-compose.yml` with `postgres`, `redis`, `pgadmin`
   - `.env.example` with all required keys/URLs from the prompt
   - `README.md` with overview + setup instructions

### Task: PHASE 1 Prompt 1.1 + 1.2 + 1.3 - Mock Portals, DB Schema, Seed Data
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. Built 4 standalone mock regulatory portals under `apps/mock-portals/`:
   - `gstn`, `epfo`, `fssai`, `pt-states`
2. For each portal, created:
   - `index.html` (minimal static UI, inline CSS, regulation table rendered from local JSON)
   - `regulations.json` (exact regulation payloads from prompt)
   - `vercel.json` rewrite config for SPA-style route handling
3. Added complete PostgreSQL migration at:
   - `data/migrations/001_initial_schema.sql`
   - Includes all required tables:
     - `businesses`, `obligations`, `regulation_snapshots`, `regulation_deltas`, `hitl_queue`, `caal_ledger`, `vault_tokens`, `compliance_alerts`, `gst_filing_status`, `payroll_dues`
   - Includes required indexes for businesses/obligations/caal_ledger/hitl_queue/compliance_alerts
   - Added `pgcrypto` extension and trigger function to auto-update `obligations.updated_at` on row updates
4. Added seed data files:
   - `data/seed/users.json` with exactly 18 demo Indian business profiles using the requested business mix
   - `data/seed/obligations.json` with pre-seeded obligations (3-4 per business) across GST, PF, ESI, FSSAI, PT, TDS with varied statuses and 2026 due dates
   - `data/seed/audit_history.json` with 25 sample CAAL ledger entries
5. Added DB seed loader:
   - `data/seed/seed_db.py`
   - Reads `DATABASE_URL` from environment
   - Upserts businesses by `id`
   - Inserts obligations linked by `business_id`
   - Inserts CAAL entries
   - Prints progress and completion counts

### Task: PHASE 2 Prompt 2.1 + 2.2 - FastAPI Backend Core
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. Updated backend dependency lockfile:
   - Replaced `services/api/requirements.txt` with all exact pinned versions requested for FastAPI, DB, scheduler, Gemini/LangGraph, and numerical/network libraries.
2. Expanded environment-driven settings:
   - `services/api/config.py` now loads all required `.env` keys:
     - Gemini, DB/Redis, Chroma/embeddings, mock portal URLs, API/Clerk keys, vault encryption key.
3. Added complete async SQLAlchemy layer:
   - `services/api/database.py` with asyncpg engine/session dependency (`get_db`).
   - ORM models for all schema tables from Phase 1.2:
     - `businesses`, `obligations`, `regulation_snapshots`, `regulation_deltas`, `hitl_queue`, `caal_ledger`, `vault_tokens`, `compliance_alerts`, `gst_filing_status`, `payroll_dues`.
4. Added Pydantic model package:
   - `services/api/models/schemas.py` and `services/api/models/__init__.py`.
   - Includes all requested model names:
     - `BusinessProfile`, `BusinessCreate`, `BusinessUpdate`
     - `ObligationResponse`, `ObligationCreate`
     - `HITLQueueItem`, `HITLResolveRequest`
     - `AuditLedgerEntry`
     - `ComplianceAlert`, `AlertResponse`
     - `GSTFilingStatus`
     - `PayrollDues`
     - `ChatMessage`, `ChatResponse`
     - `RegulationDelta`, `DeltaNotification`
5. Created all backend routers with working endpoints in `services/api/routers/`:
   - `compliance.py`
   - `obligations.py`
   - `gst.py`
   - `payroll.py`
   - `hitl.py`
   - `audit.py`
   - `assistant.py`
   - `admin.py`
6. Implemented websocket retrigger channel:
   - `services/api/websocket/retrigger_ws.py` with `ConnectionManager` and `/ws/retrigger`.
   - Added broadcast helpers for regulation changes, HITL escalations, and compliance updates.
7. Rebuilt FastAPI app bootstrap:
   - `services/api/main.py` now includes:
     - CORS (allow all)
     - startup table creation
     - APScheduler startup
     - in-memory obligation graph loading
     - router registration for all required modules
     - `/health` with UTC timestamp
     - static mount for demo-serving support

### Task: PHASE 3 Prompt 3.1 + 3.2 + 3.3 - Knowledge Layer (KG + Rule Engine + RAG)
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. Added complete Obligation Knowledge Graph module under `services/knowledge/obligation_graph/`:
   - `node_schema.py` with `ObligationNode` and `CrossDomainEdge` dataclasses.
   - `graph_builder.py` with NetworkX `DiGraph` builder and methods:
     - `build_graph`
     - `get_applicable_obligations`
     - `get_cascade_from_event`
     - `get_affected_businesses_for_regulation`
     - `to_json`
     - `update_node_from_portal`
     - `get_graph_delta`
   - `versioner.py` with version history tracking, version incrementing, and delta response object.
   - `cross_domain_edges.py` with critical cross-domain edge constants and methods:
     - `propagate_event`
     - `get_plain_language_card`
2. Added deterministic Rail-B rule engine under `services/knowledge/rule_engine/`:
   - `gst_rules.py`, `pf_rules.py`, `esi_rules.py`, `pt_rules.py`, `tds_rules.py`
   - Implemented all requested computation and due-date helper functions.
   - `__init__.py` now exposes `RuleEngine.evaluate(query_type, params, portal_data)` returning:
     - `result`
     - `rule_used`
     - `computation_trace`
3. Added RAG stack under `services/knowledge/rag/`:
   - `regulation_corpus/regulations.json` with 60 chunks:
     - 15 GST
     - 15 PF/ESI (plus additional PF/ESI coverage to complete 30 total)
     - 15 FSSAI
     - 10 PT
     - 5 DPDP
   - `embedder.py` for Gemini embeddings (`models/text-embedding-004`) with exponential backoff.
   - `vector_store.py` for local persistent ChromaDB with startup bootstrap from corpus.
   - `retriever.py` for profile-aware domain filtering and context prompt construction.
   - `gemini_client.py` with:
     - `generate_compliance_response`
     - `generate_plain_language_card`
     - `generate_audit_packet_summary`
     - required compliance system prompt constraints.
4. Added package init files for knowledge modules to support imports and composition.

### Task: PHASE 4 Prompt 4.1 to 4.6 - Multi-Agent System
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. Added IRDA agent module in `services/agents/irda/`:
   - `watcher.py` with `RegulationWatcher`:
     - portal fetch via HTTP
     - snapshot hash generation (SHA-256 sorted JSON)
     - per-portal and all-portal change checks against `regulation_snapshots`
   - `delta_extractor.py` with `DeltaExtractor`:
     - changed regulation ID extraction
     - field-level delta summary generation
     - obligation graph update hooks
   - `notifier.py` with `DeltaNotifier`:
     - affected business detection via KG
     - compliance alert creation and plain-language card generation
     - websocket event broadcasting
   - `orchestrator.py` with `IRDAOrchestrator`:
     - full cycle execution and CAAL logging (`irda` DID)
     - scheduling helper
2. Added DRCA module in `services/agents/drca/`:
   - `rail_a.py` for LLM+RAG+KG grounded responses and heuristic confidence scoring
   - `rail_b.py` for deterministic query classification and rule-engine backed responses
   - `comparator.py` for rail comparison, HITL escalation, and CAAL writing
3. Added COCE module in `services/agents/coce/`:
   - `dependency_map.py` with complete `BUSINESS_EVENTS` mapping
   - `cascade_engine.py`:
     - event firing and threshold checks
     - cross-domain cascades (PF→ESI, FSSAI→GST)
     - regulation-change cascade evaluation
     - HITL resolution processing
   - `plain_language.py` for human-friendly change cards and notifications
4. Added CAAL module in `services/agents/caal/`:
   - `agent_identity.py`:
     - deterministic DID generation registry
     - action signing hash utility
   - `ledger_writer.py`:
     - append-only CAAL writes
     - business and paginated retrieval APIs
   - `audit_packet.py`:
     - 90-day self-certifying audit packet generation with packet hash
5. Added DPDP and HITL utilities:
   - `services/agents/dpdp/vault_manager.py`:
     - Fernet tokenization/detokenization
     - profile scrubbing and payroll summarization
   - `services/agents/dpdp/consent_manager.py`:
     - consent record/check and consent text generation
   - `services/agents/dpdp/breach_detector.py`:
     - breach simulation structure + DPB notification draft
   - `services/agents/hitl/escalation.py` and `services/agents/hitl/resolution.py`:
     - escalation creation/context retrieval
     - resolution update + CAAL write + websocket notification
6. Added remaining agents:
   - `services/agents/gst_agent/readiness_checker.py`
   - `services/agents/payroll_agent/calculator.py`
7. Added scheduler job orchestration:
   - `services/scheduler/polling_jobs.py`
   - jobs defined:
     - `poll_portals` every 120s
     - `compute_due_dates` daily 9am
     - `gst_readiness` daily 10am
     - `hitl_reminder` every 30min
8. Added LangGraph orchestrator:
   - `services/agents/orchestrator.py`
   - StateGraph with full pipeline nodes and conditional HITL routing:
     - context load
     - RAG retrieval
     - Rail A
     - Rail B
     - rail comparison
     - cascade / HITL
     - CAAL write
     - final response
   - exposed:
     - `run_compliance_check`
     - `run_event_cascade`

## How To Use This Memory File

- Append a new section under **Implementation Log** after each task.
- For every new task, include:
  - Task name/prompt reference
  - Status
  - Date
  - Exactly what was implemented/changed
  - Any deviations/compatibility adjustments made during implementation
