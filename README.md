# RegGraph AI (RGAI) — Autonomous Compliance OS

RegGraph AI is an advanced, AI-powered Regulatory Technology (RegTech) platform designed to autonomously monitor, analyze, and execute compliance workflows. It features a multi-agent architecture powered by Groq (LLaMA 3) working alongside deterministic rule engines, all represented through a real-time Knowledge Graph.

## Architecture

1. **IRDA (Intelligent Regulation Discovery Agent)**: Polls mock portals (GSTN, EPFO, FSSAI, PT) to detect regulatory changes using checksum hashing, extracting actionable deltas.
2. **COCE (Compliance Obligation Cascade Engine)**: Takes deltas from IRDA and traces them through the Knowledge Graph to find affected downstream obligations (e.g., GST changes affecting TDS).
3. **DRCA (Dual-Rail Compliance Assessor)**: A proprietary verification engine that evaluates new rules concurrently through an LLM (Rail A) and a deterministic rule engine (Rail B). Consensus proceeds automatically; divergence escalates to a Human-In-The-Loop (HITL) queue.
4. **CAAL (Cryptographic Agent Action Ledger)**: An immutable, hash-chained ledger that logs every autonomous agent decision for auditability and explainability.

## Tech Stack
| Component | Technology |
| --- | --- |
| **Frontend** | Next.js 14, TailwindCSS, D3.js, Lucide Icons, Glassmorphism UI |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy, APScheduler |
| **Database** | PostgreSQL, ChromaDB (Vector Store), Redis (Pub/Sub & Caching) |
| **AI Models** | Groq (LLaMA 3) via LangChain |
| **Authentication** | Clerk |

---

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Groq API Key
- Clerk Account

### 2. Environment Setup
Create an `.env` file in `services/api/` and `.env.local` in `apps/web/`. See `.env.local.example` for required variables.

### 3. Bootstrap the Application
Run the setup script to initialize the databases, install dependencies, and seed the demo data:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 4. Run the Stack
**Backend**:
```bash
docker-compose up -d
```
*Note: The FastAPI backend and APScheduler run on port 8000.*

**Frontend**:
```bash
cd apps/web
npm run dev
```

---

## Demo Walkthrough

The platform includes a built-in **Demo Control Panel** located at `/admin/demo-control`. 

1. **Scenario A: GST Late Fee Cap Reduction**
   - Click "Run This Scenario".
   - The IRDA watcher detects a mock override in Redis.
   - The delta is extracted, affecting 8 businesses.
   - The COCE cascade runs, triggering FSSAI checks for food businesses.
   - WebSockets broadcast the updates to the Compliance Feed.
   - A seeded HITL divergence occurs for "Bharat Finserv" (Rail A: ₹300 vs Rail B: ₹250). Review it in the HITL queue.

2. **Verification in Audit Trail**
   - Navigate to the **Audit Trail** page.
   - Expand the latest entry to view the cryptographic hash and the exact JSON payload evaluated by the agents.

## Deployment (Mock Portals)
The `apps/mock-portals` directory contains 4 distinct portal simulations. Each can be deployed instantly using Vercel:
```bash
cd apps/mock-portals/gstn
vercel deploy --prod
```
