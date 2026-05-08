# RegGraph AI (RGAI)

RegGraph AI is a monorepo for building a compliance intelligence platform with:
- A modern web app built on Next.js 14
- Backend and agent services organized under `services/`
- Seed and migration data under `data/`
- Local infrastructure with PostgreSQL, Redis, and pgAdmin via Docker Compose

## Repository Structure

```text
regraph-ai/
├── apps/
│   ├── web/                    # Next.js 14 (App Router, TypeScript)
│   └── mock-portals/
│       ├── gstn/
│       ├── epfo/
│       ├── fssai/
│       └── pt-states/
├── services/
│   ├── api/                    # FastAPI (Python 3.11)
│   ├── agents/
│   ├── knowledge/
│   └── scheduler/
├── data/
│   ├── seed/
│   └── migrations/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.11
- Docker Desktop

## Setup

1. Install web dependencies (already scaffolded):
   - `cd apps/web`
   - `npm install`

2. Configure environment:
   - Copy `.env.example` to `.env` in the repository root
   - Fill in secrets such as Clerk keys and `GEMINI_API_KEY`

3. Start infrastructure:
   - From repository root, run `docker compose up -d`
   - PostgreSQL: `localhost:5432`
   - Redis: `localhost:6379`
   - pgAdmin: [http://localhost:5050](http://localhost:5050)

4. Run the web app:
   - `cd apps/web`
   - `npm run dev`
   - Open [http://localhost:3000](http://localhost:3000)

5. Start the API service (placeholder scaffold):
   - `cd services/api`
   - Create and activate a Python virtual environment
   - Install dependencies from `requirements.txt`
   - Implement and run `main.py` using FastAPI/Uvicorn

## Notes

- shadcn UI has been initialized in `apps/web` and base components have been added.
- The root `memory.md` file tracks project context and completed implementation tasks over time.
