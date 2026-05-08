#!/bin/bash
set -e

echo "Setting up RegGraph AI..."
echo "1. Starting Postgres and Redis..."
docker-compose up -d postgres redis
sleep 5

echo "2. Installing Python dependencies..."
cd services/api
pip install psycopg2-binary python-dotenv
pip install -r requirements.txt

echo "3. Seeding Database..."
cd ../../
python data/seed/seed_db.py

echo "4. Seeding ChromaDB..."
cd services/api
python -c "from services.knowledge.rag.vector_store import RegulationVectorStore; from pathlib import Path; persist_dir = Path('.').resolve().parent.parent / 'chroma_db'; RegulationVectorStore(str(persist_dir))"

echo "Setup complete! Run: docker-compose up && cd apps/web && npm run dev"
