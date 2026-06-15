<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=f97316,ec4899,8b5cf6&height=240&section=header&text=RegGraph%20AI&fontSize=72&fontAlignY=35&fontColor=ffffff&desc=Autonomous%20Compliance%20OS%20for%20Indian%20Enterprise&descSize=22&descAlignY=60" width="100%" />

  <br />



  <p align="center">
    <img src="https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/LangGraph-blue?style=flat-square&logo=langchain&logoColor=white" alt="LangGraph" />
    <img src="https://img.shields.io/badge/PostgreSQL_16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/ChromaDB-green?style=flat-square&logo=google&logoColor=white" alt="ChromaDB" />
    <img src="https://img.shields.io/badge/Groq_Llama_3-orange?style=flat-square&logo=ai&logoColor=white" alt="Groq" />
    <img src="https://img.shields.io/badge/Clerk_Auth-6C47FF?style=flat-square&logo=clerk&logoColor=white" alt="Clerk" />
  </p>

  <p align="center">
    <b>An autonomous, dual-rail compliance engine that monitors Indian regulatory portals, executes obligation cascades, and ensures cryptographic verification for modern enterprise.</b>
  </p>
</div>

## Abstract

RegGraph AI is a full-stack, enterprise-grade compliance APK for mobile first approach designed for Indian SMBs and enterprises. The platform continuously monitors live regulatory portals (GSTN, EPFO, FSSAI, State Professional Tax), detects regulatory shifts in real time, and automatically cascades changes across all affected business profiles. 

Every autonomous decision is strictly verified through a Dual-Rail Architecture: a high-performance LLM reasoning rail is cross-evaluated against a deterministic Python-based rule engine. In the event of a variance or disagreement between the rails, the pipeline triggers a zero-trust human-in-the-loop escalation, guaranteeing high-integrity compliance operations.

---

## Architectural Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS FRONTEND                           │
│  Landing Page · Dashboard · Compliance Feed · Obligation Graph    │
│  GST Filing · Payroll · Audit Trail · KG Explorer · Admin Panel   │
│  HITL Queue · AI Assistant · DPDP Vault                           │
│────────────────────────────────────────────────────────────────────│
│                     FASTAPI BACKEND (8001)                         │
│  /compliance · /gst · /payroll · /audit · /hitl · /admin          │
│  /knowledge · /assistant · /obligations · /demo                   │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│   IRDA       │   COCE       │   DRCA       │   CAAL Ledger        │
│  Watcher     │  Cascade     │  Dual-Rail   │  Crypto Audit        │
│  Agent       │  Engine      │  Classifier  │  Trail               │
├──────────────┴──────────────┴──────────────┴──────────────────────┤
│               LANGGRAPH ORCHESTRATOR                              │
│  IRDA → COCE → DRCA (Rail A + Rail B) → HITL → CAAL              │
└────────────────────────────────────────────────────────────────────┘
         ↕                           ↕
┌─────────────────────┐   ┌──────────────────────┐
│   MOCK PORTALS      │   │   KNOWLEDGE LAYER    │
│   (Vercel-hosted)   │   │                      │
│   • GSTN Portal     │   │   • Obligation Graph │
│   • EPFO Portal     │   │   • Rule Engine      │
│   • FSSAI Portal    │   │   • RAG / ChromaDB   │
│   • State PT Portal │   │                      │
└─────────────────────┘   └──────────────────────┘
```

### Agentic Pipeline Flow

```mermaid
graph TD
    IRDA[IRDA: Portal Monitor] -->|Detects Change| COCE[COCE: Obligation Cascade]
    COCE -->|Triggers Evaluation| DRCA{DRCA: Dual-Rail Engine}
    DRCA -->|Rail A: LLM Reasoning| RailA[Groq LLM + Chroma RAG]
    DRCA -->|Rail B: Deterministic| RailB[Deterministic Rule Engine]
    RailA --> Compare{Compare Confidence}
    RailB --> Compare
    Compare -->|Divergent Results| HITL[HITL: Human Resolver]
    Compare -->|Convergent Results| CAAL[CAAL: Crypto Audit Log]
    HITL -->|Human Approved| CAAL
    CAAL -->|Immutable Log| DB[(PostgreSQL Ledger)]
```

---

## Autonomous Agent Matrix

The platform orchestrates seven specialised agents coordinated via LangGraph state machines:

| Agent | Module | Role | Core Process |
| :--- | :--- | :--- | :--- |
| **IRDA** | Intelligent Regulation Delta Analyzer | Portal scraping & polling | Periodically scans regulatory sites (30s intervals) and triggers alerts on document diffs |
| **COCE** | Cascade Obligation Computation Engine | Dependency traversal | Evaluates transitive impacts across business configurations using directed obligation graphs |
| **DRCA** | Dual-Rail Compliance Assessor | Validation engine | Executes parallel evaluations across statistical (LLM) and deterministic (Rule Engine) paths |
| **HITL** | Human-in-the-Loop Resolver | Exception management | Surfaces confidence anomalies and divergent classifier outputs to humans for validation |
| **CAAL** | Cryptographic Agent Action Ledger | Ledger operations | Signs agent decisions, inputs, and outputs with SHA-256 hashes for immutable auditing |
| **GST Agent** | GST Compliance Manager | Tax operations | Tracks filing deadlines, evaluates readiness scores, and manages draft payloads |
| **Payroll Agent** | Payroll Calculation Engine | Calculation operations | Calculates PF, ESI, PT, and TDS obligations against verified legislative thresholds |

---

## Platform Directories & Map

```
regraph-ai/
├── apps/
│   ├── web/                          # Next.js 14 Web Application
│   │   ├── app/
│   │   │   ├── page.tsx              # Interactive Landing Page
│   │   │   ├── globals.css           # Premium Tailwind Design System
│   │   │   ├── (auth)/               # Clerk Authentication Routes
│   │   │   └── (dashboard)/          # Application Portals
│   │   │       ├── layout.tsx        # Layout Shell with Particle Overlay
│   │   │       ├── admin/            # Administrative Control Board
│   │   │       ├── audit-trail/      # CAAL Cryptographic Ledger Viewer
│   │   │       ├── compliance-feed/  # Real-time Event Streaming
│   │   │       ├── gst-filing/       # GST Obligation Lifecycle
│   │   │       ├── hitl/             # Human Verification Interface
│   │   │       ├── kg-explorer/      # Knowledge Graph Metrics Dashboard
│   │   │       ├── obligation-graph/ # Dynamic D3.js Force Layout
│   │   │       ├── payroll/          # Calculations Sandbox
│   │   │       └── assistant/        # Context-Aware Chatbot Interface
│   │   ├── components/               # Domain Component Library
│   │   └── hooks/                    # Reusable React State Logic
│   └── mock-portals/                 # Vercel Serverless Scrapers Mock Layer
├── services/
│   ├── api/                          # FastAPI Service Layer
│   │   ├── main.py                   # Service Entrypoint
│   │   ├── database.py               # Session Management & Schema Definition
│   │   └── routers/                  # API Sub-routers
│   ├── agents/                       # LangGraph Agent Implementation
│   │   ├── orchestrator.py           # State Machine Wiring
│   │   ├── caal/                     # Audit Packing and Signing
│   │   ├── coce/                     # Graph Evaluation Engine
│   │   ├── drca/                     # Dual-Rail Validation Execution
│   │   └── irda/                     # Portal Watchers and Delta Extraction
│   ├── knowledge/                    # Shared Regulatory Knowledge Base
│   │   ├── rule_engine/              # Python Hardcoded Legal Rules
│   │   └── rag/                      # Vector Search and ChromaDB Connectors
│   └── scheduler/                    # Asynchronous Scheduling Layer
├── data/seed/                        # Initial Database Seeds
├── docker-compose.yml                # Multi-container Infrastructure Setup
└── .env                              # Base Configuration Variables
```

---

## Core Engineering Decisions

### Dual-Rail Verification
To eliminate the unpredictability inherent in large language models, every regulatory assessment proceeds through parallel tracks:
* **Rail A (Probabilistic):** Parses text and queries rules via an LLM (Llama 3 hosted on Groq) informed by a highly localized ChromaDB vector index (RAG).
* **Rail B (Deterministic):** Evaluates exact numeric inputs against static legislative rules (PF, ESI, Professional Tax, TDS).

The orchestrator monitors their confidence outputs. If `|confidence_A - confidence_B| > 0.15`, the system suspends execution and routes the transaction to the human queue.

### Cryptographic Agent Action Ledger (CAAL)
To assure auditors of data integrity, every step of the agent execution lifecycle is logged immutably:
1. Inputs, outputs, and intermediate states are captured and structured.
2. The packet is signed with the unique cryptographic identifier (DID) of the agent.
3. The data is hashed using SHA-256 and appended sequentially to the PostgreSQL ledger.

This creates a high-fidelity, tamper-resistant history trail matching strict corporate compliance requirements.

---

## Technology Directory

| Layer | System Components |
| :--- | :--- |
| **User Interface** | Next.js 14, React 18, TypeScript, Tailwind CSS, D3.js, Framer Motion |
| **App Security** | Clerk SSO Identity Provider |
| **API Backend** | FastAPI, Asyncio, SQLAlchemy Core, Pydantic v2, WebSockets |
| **AI Architecture** | LangGraph Workflow Engine, Groq (Llama 3 70B), Chroma Vector DB |
| **Persistence** | PostgreSQL 16 Enterprise DB, Redis 7 In-Memory Cache & Message Broker |
| **Infrastructure** | Docker, Docker Compose, Vercel Serverless |

---

## Quick Start Configuration

### Prerequisites
* Node.js v18 or later
* Python v3.11 or later
* Docker Desktop installed and running
* Groq API Key
* Clerk credentials

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/rohan-chand-m-01/Reg_Graph.git
cd Reg_Graph

# Install client packages
cd apps/web
npm install
cd ../..

# Install backend dependencies
pip install -r services/api/requirements.txt
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Connections
DATABASE_URL=postgresql+asyncpg://rguser:rgpass123@localhost:5433/regraph
SYNC_DATABASE_URL=postgresql://rguser:rgpass123@localhost:5433/regraph

# Cache Layer
REDIS_URL=redis://localhost:6379

# LLM Providers
GROQ_API_KEY=your_groq_api_key_here

# Clerk Authenticator
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Sandbox Portal Mock URLs
GSTN_PORTAL_URL=https://your-gstn-portal.vercel.app
EPFO_PORTAL_URL=https://your-epfo-portal.vercel.app
FSSAI_PORTAL_URL=https://your-fssai-portal.vercel.app
PT_PORTAL_URL=https://your-pt-portal.vercel.app
```

### 3. Initialize & Launch Services

```bash
# Start Docker containers (PostgreSQL + Redis)
docker compose up -d

# Execute database migrations and seed system records
python -c "from database import init_db; import asyncio; asyncio.run(init_db())"
cd data/seed && python seed_db.py
cd ../..

# Launch FastAPI backend API (port 8001)
cd services/api
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
cd ../..

# Start Next.js development client (port 3000)
cd apps/web
npm run dev
```

Navigate to `http://localhost:3000` to interact with the platform dashboard.

---

## Verification Matrix

To demonstrate the full capability of the autonomous pipeline:
1. Authenticate through the landing page interface to access the main Dashboard.
2. Enter the **Admin Panel** and select **Push GSTN Change** to trigger a simulated regulation modification.
3. Observe the live update flow:
   * **IRDA Watcher** registers the portal modification instantly.
   * **COCE** updates affected obligations and propagates impacts across the graph.
   * **DRCA** runs parallel assessments across the LLM and deterministic rule engine.
   * If divergent, the record appears dynamically in the **HITL Review Queue**.
   * **CAAL** signs and commits the final resolution state into the immutable audit database.
4. Open the **Audit Trail** to view cryptographically signed, timestamped action logs for each agent step.
5. Launch the **D3.js Graph Visualizer** to explore dependency mapping across diverse regulatory domains.

---



## License

This project was engineered and distributed exclusively for hackathon evaluation and demonstration purposes.
