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

### Task: PHASE 5 Prompt 5.1 to 5.6 - Next.js Frontend
**Status:** In Progress  
**Date:** 2026-05-09

Implemented so far:
1. Clerk auth + routing shell:
   - Added `apps/web/middleware.ts` route protection with public auth routes.
   - Updated `apps/web/app/layout.tsx` with `ClerkProvider`, RGAI metadata, dark theme, and global toaster.
   - Added auth pages:
     - `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
     - `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
   - Added dashboard shell:
     - `app/(dashboard)/layout.tsx`
     - fixed 240px sidebar nav, header with agent indicator and notifications, websocket integration.
2. Frontend data layer:
   - `apps/web/lib/api-client.ts` typed fetch wrapper with Clerk JWT auth and toast-based error handling.
   - hooks:
     - `hooks/useWebSocket.ts`
     - `hooks/useComplianceAlerts.ts`
     - `hooks/useAuditTrail.ts`
3. Dashboard pages added:
   - `app/(dashboard)/page.tsx` (main dashboard skeleton + KPIs/feed/activity/business table wired to APIs)
   - `app/(dashboard)/compliance-feed/page.tsx`
   - `app/(dashboard)/obligation-graph/page.tsx`
   - `app/(dashboard)/gst-filing/page.tsx`
   - `app/(dashboard)/payroll/page.tsx`
   - `app/(dashboard)/assistant/page.tsx`
   - `app/(dashboard)/hitl/page.tsx`
   - `app/(dashboard)/audit-trail/page.tsx`
   - `app/(dashboard)/admin/page.tsx`
4. Reusable component additions:
   - `components/compliance/DualRailBadge.tsx`
   - `components/compliance/ConfidenceScore.tsx`
   - `components/compliance/SourceTrace.tsx`
   - `components/compliance/RetriggerBanner.tsx`
   - `components/compliance/ObligationCard.tsx`
   - `components/agents/AgentStatusPanel.tsx`
   - `components/graph/KGVisualization.tsx`
5. Backend endpoints added for frontend support:
   - `GET /knowledge/graph` (`services/api/routers/knowledge.py`)
   - `GET /admin/deltas` (`services/api/routers/admin.py`)
   - `GET /admin/portal-status` (`services/api/routers/admin.py`)
   - `GET /admin/portal/{portal_name}` (`services/api/routers/admin.py`)
   - Enhanced:
     - `GET /admin/stats` now includes `regulation_changes_24h`, `caal_entries`, `graph_nodes`
     - `GET /compliance/businesses` now returns per-business compliance `health_score`, flags (GST/PF/ESI/FSSAI/PT), and `last_updated`
     - `GET /admin/deltas` now includes `affected_businesses` and `skipped_businesses` using the KG cascade mapping
6. Frontend improvements:
   - Updated `apps/web/app/(dashboard)/compliance-feed/page.tsx`:
     - portal status cards via `/admin/portal-status`
     - modal uses portal/regulation selectors via `/admin/portal/{portal_name}`
     - delta rows expand to show before/after field changes and re-triggered vs skipped split.
   - Updated `apps/web/app/(dashboard)/page.tsx` KPI cards and business table health bar to use `health_score` and `regulation_changes_24h` from updated `/compliance/businesses` and `/admin/stats`.
   - Added DPDP endpoints in backend (`/admin/dpdp/stats`, `/admin/dpdp/simulate-breach`) and updated admin page to show DPDP status + simulate button.
   - Added “Highlight recent changes” option in Obligation Graph page using `/admin/deltas` changed regulation IDs to visually outline impacted nodes.
   - Enhanced GST Filing page with a visible checklist from `missing_items`.
   - Enhanced HITL page with a Review modal showing full Rail A/Rail B payloads and divergence reason.
299. Updated CAAL signing to use the entry timestamp so hashes are verifiable client-side.
300. Updated Audit Trail page “Verify Hash” to recompute SHA-256 in the browser and compare to stored `action_hash`.

Validation:
- `npm run lint` passes in `apps/web`.
- `python -m compileall services/api` passes.

### Task: PHASE 6 Prompt 6.1 to 6.3 - Integration + Demo Polish
**Status:** Completed  
**Date:** 2026-05-08

Implemented:
1. Core API Wiring:
   - Added `clerk_auth.py` middleware to check JWT tokens for all protected API routes.
   - Updated `main.py` startup logic to explicitly initialize `ObligationGraphBuilder`, `RegulationVectorStore`, `RuleEngine`, attach them to `app.state`, and log start up metrics. Also added DB auto-seeder if `businesses` table is empty.
   - Refactored `admin/demo/trigger-change` endpoint to save mock overrides to Redis. Immediately triggers the `IRDAOrchestrator` cycle to skip the scheduler interval.
   - Created `/knowledge/graph` and `/knowledge/rag/stats` endpoints in a new `knowledge.py` router.
   - Updated `watcher.py` to check Redis before doing a local/remote HTTP fetch.
2. Demo Content & Orchestration:
   - Created `demo_scenarios.json` with three predefined test cases (GST Late Fee, PF Wage Ceiling, FSSAI Deadline).
   - Created `/demo` router to fetch scenarios, run them, and reset demo state (flush Redis and local tables).
   - Hardcoded a HITL queue trigger entry in `seed_db.py` for "Bharat Finserv" to demonstrate the manual escalation flow natively.
3. Frontend Enhancements:
   - Built a dedicated `/kg-explorer` page utilizing the full-screen `KGVisualization` component.
   - Built the `/admin/demo-control` UI to display 3 scenarios and track execution progress visually.
   - Added a global "Demo Mode" banner to the Dashboard (`page.tsx`) header.
4. Infrastructure & Deployment:
   - Configured `docker-compose.yml` to run `postgres`, `redis`, `api`, and `scheduler`.
   - Built a custom `Dockerfile` for the FastAPI backend.
   - Added `vercel.json` and `package.json` configurations to all 4 mock portals to enable 1-click deployments.
   - Wrote `setup.sh` to scaffold the entire project from scratch and run seeds.
   - Generated the central `README.md` containing architectural overviews and the demo execution path.

### Task: PHASE 7 - Live Scraping Migration & Bug Fixes
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. Live Portal Scraping Migration:
   - Generated realistic JSON compliance payloads for all 4 mock portals (GSTN, EPFO, FSSAI, PT-States) to simulate live environments.
   - User successfully deployed the local static sites from `apps/mock-portals` to Vercel:
     - EPFO: `https://epfo-eight.vercel.app/`
     - FSSAI: `https://fssai-three.vercel.app/`
     - GSTN: `https://gstn-taupe.vercel.app/`
     - PT-States: `https://pt-states.vercel.app/`
   - Updated the backend environment (`.env`) and `config.py` to point `MOCK_*_URL`s to the live Vercel deployments instead of local fallbacks.
   - Restarted `api` and `scheduler` Docker containers. The `RegulationWatcher` now polls these real external URLs every 2 minutes for compliance scraping.
2. Frontend Architecture Fixes:
   - **WebSockets**: Removed hardcoded `ws://localhost:8000` URLs across `page.tsx`, `layout.tsx`, and `compliance-feed/page.tsx` and wired them to `NEXT_PUBLIC_WS_URL`.
   - **React Rendering Error**: Fixed a DOM validation error ("1 error" toast) in the Delta History table caused by invalid `<tbody>` nesting by utilizing `<Fragment>`.
   - **Duplicate API Calls**: Added a loading/disabling state (`isTriggering`) to the "Push Change" button on the Compliance Feed to prevent duplicate scenario triggers.

### Task: PHASE 8 - AI Assistant Connection & Optimization
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. LLM Core Connection:
   - Wired the `/assistant/chat` endpoint to the actual `GeminiComplianceClient` and `RegulationVectorStore`.
   - Replaced mocked echo-back response with a real RAG (Retrieval-Augmented Generation) pipeline.
   - Connected the chat payload's `business_id` to the database to fetch accurate business profiles for personalized compliance context.
2. Performance & Reliability Fixes:
   - **Async to Thread**: Wrapped blocking synchronous LLM and database calls in `asyncio.to_thread` within the `rag_chat` endpoint. This prevents the FastAPI event loop from hanging and ensures the UI doesn't "load forever."
   - **Manual Embeddings**: Modified the `retrieve_relevant_regulations` function to manually embed queries using the Gemini `text-embedding-004` model before querying ChromaDB. This bypasses potential internal library hangs and ensures embedding consistency between storage and retrieval.

### Task: PHASE 9 - IRDA Live Scraping Migration
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **RegulationWatcher rewrite** (`services/agents/irda/watcher.py`):
   - `fetch_portal_data()` now ALWAYS hits the live Vercel URL by default.
   - Redis demo-override path gated behind `allow_demo_override=True` flag — only the `/admin/demo/trigger-change` endpoint passes this.
   - Added 3-attempt retry with exponential backoff (2s, 4s) for resilient HTTP scraping.
   - Added structured `logging` (portal name, URL, status code, latency, attempt number).
   - Added response validation (checks for `regulations` key before hashing).
   - Removed local-file fallback entirely — if HTTP fails after retries, returns error marker and skips.
   - Added `_last_poll_results` tracking dict exposed via `get_last_poll_results()` for admin dashboard.
   - Hash computation now strips internal `_`-prefixed keys to avoid hashing error markers.

2. **IRDAOrchestrator enhancements** (`services/agents/irda/orchestrator.py`):
   - `run_cycle()` accepts `allow_demo_override` kwarg, passes through to watcher.
   - Per-portal try/catch — if one portal's delta processing fails, others continue.
   - Added per-portal timing metrics (`processing_ms`) in result payload.
   - Sets `delta.processed = True` after successful processing.
   - Returns enriched result dict with `cycle_duration_ms`, `portal_details`, and `poll_statuses`.

3. **Admin router migration** (`services/api/routers/admin.py`):
   - `GET /admin/portal-status` — Now reads from `regulation_snapshots` table (actual scrape results) instead of local files. Shows real `fetched_at` timestamps, `content_hash`, `changes_24h` count, and `status` (live/awaiting_first_scrape).
   - `GET /admin/portal/{portal_name}` — Fetches live from Vercel URL first, falls back to latest DB snapshot, then local file as last resort.
   - `POST /admin/demo/trigger-change` — Now passes `allow_demo_override=True` to the IRDA cycle so only demo triggers use Redis; scheduled polls always hit Vercel.
   - Added `GET /admin/scraping-health` — Returns `last_poll_at`, `poll_interval_seconds`, `next_poll_at` from the scheduler for the live status indicator.

4. **Scheduler optimization** (`services/scheduler/polling_jobs.py`):
   - Reduced polling interval from 120s → 30s for more responsive change detection.
   - `poll_portals()` explicitly passes `allow_demo_override=False` so scheduled polls always hit live Vercel URLs.
   - Added portal-unreachable WebSocket alerts — broadcasts `portal_unreachable` event when a portal fails all retry attempts.
   - Added `get_poll_status()` method returning last poll time, result, and computed next poll time for the admin dashboard.
   - Portals are polled sequentially with 2s stagger to avoid thundering herd.

5. **Frontend Compliance Feed** (`apps/web/app/(dashboard)/compliance-feed/page.tsx`):
   - Added "Live Scraping Active" health bar with pulsing green dot, last scrape timestamp, and countdown to next scrape.
   - Portal status cards now display DB-sourced data: `status` (live/awaiting), `scraped` time, `changes_24h` badge.
   - Added portal-unreachable alert banner via WebSocket `portal_unreachable` event.
   - Auto-refreshes delta history + portal statuses every 30s.
   - Empty state message updated to indicate active scraping instead of "use trigger button".
   - Added portal label mapping for cleaner display names (pt_states → PT States).

Design Decision:
- Redis override is preserved for demo purposes ONLY (via the `allow_demo_override` flag). All automated/scheduled polling hits the real Vercel URLs, ensuring the system detects genuine changes autonomously.

### Task: PHASE 10 - External Mock Portal URLs Updated
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **Updated Environment Configuration (`.env` and `services/api/config.py`)**:
   - Replaced internal demo URLs with user-provided external deployments managed independently.
   - `MOCK_GSTN_URL` updated to `https://gstn-xi.vercel.app/`
   - `MOCK_EPFO_URL` updated to `https://epfo-coral.vercel.app/`
   - `MOCK_FSSAI_URL` updated to `https://fssai-nine.vercel.app/`
   - `MOCK_PT_URL` updated to `https://state-pt.vercel.app/`
   - Verified that the IRDA Watcher can fetch the HTML from these URLs and extract the embedded JSON regulations via regex correctly.

### Task: PHASE 11 - System Deployment and Version Control
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **Local Deployment Verification**:
   - Started the backend microservices (`api`, `postgres`, `redis`, `scheduler`) using `docker-compose up -d`.
   - Started the Next.js frontend dashboard using `npm run dev` in `apps/web` (running on port 3002).
   - Verified system readiness for real-time monitoring of external portals.
2. **Version Control Sync**:
   - Merged the `fallback` branch containing all live-scraping and embedded JSON portal changes into the `main` branch.
   - Pushed the finalized architecture to the remote repository (`origin/main`).

### Task: PHASE 12 - Dynamic GST Filing Data Update
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **Dynamic Financial Generation (`services/api/routers/gst.py`)**:
   - Replaced hardcoded values (`total_gst_liability`, `input_tax_credit`, `net_payable`) with deterministic dynamic values.
   - Introduced `_deterministic_financials(business_id: UUID)` which uses a hash of the `business_id` to generate realistic but consistent financial figures for each business.
2. **Integrated `GSTReadinessChecker`**:
   - Refactored `compute_filing_status` to use the actual `GSTReadinessChecker` agent (`compute_readiness_score` and `get_filing_checklist`) instead of hardcoded rules.
   - The checklist and missing items in the UI are now accurately populated from the actual `Obligation` status corresponding to the specific business.

### Task: PHASE 13 - Cascade Engine Wiring & Demo Trigger Fix
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **Wired `CascadeEngine` to `IRDAOrchestrator` (`services/agents/irda/orchestrator.py`)**:
   - Fixed a bug where the IRDA agent detected portal deltas and created `ComplianceAlert` records, but failed to actually generate the new database `Obligation` records.
   - Instantiated `CascadeEngine` in the Orchestrator and executed `evaluate_regulation_change_cascade` for any `changed_ids`, ensuring that changes actually reflect in the database for the GST filing UI to render.
2. **Fixed Demo Trigger Endpoint (`services/api/routers/admin.py`)**:
   - The UI "Trigger Change" button was crashing (HTTP 404) because it was attempting to read from deleted local mock JSON files (`regulations.json`).
   - Refactored `trigger_change` to query the latest `RegulationSnapshot` from the Postgres database. It now correctly pulls the real, live-scraped baseline data, mutates it, pushes the override to Redis, and triggers the Cascade Engine.

### Task: PHASE 14 - Assistant Resilience & Ledger Fixes
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **RAG Embedding Fallback (`services/knowledge/rag/embedder.py` & `rail_a.py`)**:
   - The RAG system was permanently crashing and hanging the assistant due to the `models/text-embedding-004` model returning a 404 error combined with a 5-attempt exponential backoff.
   - Reduced backoff to fail-fast.
   - Wrapped the RAG retrieval in `RailA` with a `try/except` block. If embeddings fail, the Assistant now safely falls back to a direct LLM call using just the business profile and rule engine nodes, preventing the `POST /assistant/chat` endpoint from hanging.
2. **CAAL Ledger Serialization (`services/api/routers/assistant.py`)**:
   - The `Assistant` endpoint was crashing with a 500 Internal Server Error when DRCA attempted to write to the `caal_ledger`.
   - The `business.__dict__` passed into the payload contained a non-serializable SQLAlchemy internal state (`_sa_instance_state`) and Python `UUID` objects.
   - Implemented a parser to strip internal states and convert `UUID` and `datetime` objects to strings, allowing Postgres to successfully insert the `JSONB` audit trail.

### Task: PHASE 15 - Groq AI Assistant Fixes
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **Removed Gemini Dependencies**: Cleaned up remaining Gemini references across the codebase to finalize the Groq migration. Removed `gemini-2.0-flash` and `GEMINI_API_KEY` from `.env`, `config.py`, and `docker-compose.yml`. Removed unused `google-generativeai` and `langchain-google-genai` dependencies from `requirements.txt`.
2. **Groq Client Fix**: Updated `services/knowledge/rag/groq_client.py` to dynamically read `settings.groq_model` instead of hardcoding the Llama model.
3. **Frontend UI Update**: Updated the Assistant chat interface (`apps/web/app/(dashboard)/assistant/page.tsx`) to display 'Model: Groq LLaMA + DRCA'.

### Task: PHASE 16 - GST Filing & Admin UI Fixes
**Status:** Completed  
**Date:** 2026-05-09

Implemented:
1. **GST Filing Date Synchronization (`services/api/routers/gst.py` & `gst_agent/readiness_checker.py`)**:
   - Fixed a bug where the Filing Readiness Score and Calendar ignored the UI selected "Period".
   - The backend `/compute` endpoint now accepts an optional `period` query parameter.
   - The `GSTReadinessChecker` dynamically filters Obligations so that it correctly computes a score based on the selected month, while also factoring in un-cleared `overdue` obligations from past months.
2. **Demo Seed Script (`seed_demo_data.py`)**:
   - Wrote and executed a script to inject distinct edge-case businesses (e.g., a fully compliant tech startup, a highly non-compliant manufacturing firm, and an unregistered freelancer) into the local database to better demonstrate system capabilities without manual data entry.
3. **Admin Portal Breach Simulation (`services/api/routers/admin.py`)**:
   - Fixed a bug where the "Simulate Breach Detection" button was silently failing (HTTP 422).
   - Refactored the `POST /admin/dpdp/simulate-breach` endpoint to accept the `business_id` inside a JSON body via a Pydantic `BaseModel`, rather than expecting a URL query parameter, matching the React frontend's behavior.
4. **GST UI Adjustments (`apps/web/app/(dashboard)/gst-filing/page.tsx`)**:
   - Removed the `ConfidenceScore` graph component from the GST page as requested, adjusting the CSS Grid to perfectly center and expand the remaining summary cards.

## How To Use This Memory File

- Append a new section under **Implementation Log** after each task.
- For every new task, include:
  - Task name/prompt reference
  - Status
  - Date
  - Exactly what was implemented/changed
  - Any deviations/compatibility adjustments made during implementation
