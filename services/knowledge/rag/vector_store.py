import json
from pathlib import Path
from typing import Any

import chromadb

from .embedder import Embedder


COLLECTION_NAME = "rgai_regulations"


class RegulationVectorStore:
    def __init__(self, persist_dir: str) -> None:
        self.client = self.initialize_store(persist_dir)
        self.collection = self.client.get_or_create_collection(COLLECTION_NAME)
        self.embedder = Embedder()
        self._bootstrap_if_empty()

    def initialize_store(self, persist_dir: str):
        return chromadb.PersistentClient(path=persist_dir)

    def upsert_documents(self, documents: list[dict]) -> None:
        ids = [d["id"] for d in documents]
        docs = [d["content"] for d in documents]
        metadatas = [
            {
                "domain": d["domain"],
                "title": d["title"],
                "source": d["source"],
                "effective_date": d["effective_date"],
                "keywords": ",".join(d.get("keywords", [])),
            }
            for d in documents
        ]
        embeddings = [d.get("embedding") or self.embedder.embed_text(d["content"]) for d in documents]
        self.collection.upsert(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings)

    def similarity_search(self, query: str, n_results: int, domain_filter: str | None = None) -> list[dict[str, Any]]:
        where = {"domain": domain_filter} if domain_filter else None
        result = self.collection.query(query_texts=[query], n_results=n_results, where=where)
        out = []
        ids = result.get("ids", [[]])[0]
        docs = result.get("documents", [[]])[0]
        metas = result.get("metadatas", [[]])[0]
        dists = result.get("distances", [[]])[0]
        for i, doc_id in enumerate(ids):
            out.append(
                {
                    "id": doc_id,
                    "content": docs[i],
                    "metadata": metas[i],
                    "distance": dists[i] if i < len(dists) else None,
                }
            )
        return out

    def get_collection_stats(self) -> dict:
        return {"name": COLLECTION_NAME, "count": self.collection.count()}

    def _bootstrap_if_empty(self) -> None:
        if self.collection.count() > 0:
            return
        corpus_path = Path(__file__).parent / "regulation_corpus" / "regulations.json"
        documents = json.loads(corpus_path.read_text(encoding="utf-8"))
        self.upsert_documents(documents)
