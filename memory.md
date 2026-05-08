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

## How To Use This Memory File

- Append a new section under **Implementation Log** after each task.
- For every new task, include:
  - Task name/prompt reference
  - Status
  - Date
  - Exactly what was implemented/changed
  - Any deviations/compatibility adjustments made during implementation
