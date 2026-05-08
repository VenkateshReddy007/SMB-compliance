from typing import Any

from .vector_store import RegulationVectorStore


def _domain_filters_from_profile(business_profile: dict[str, Any]) -> list[str]:
    domains = ["GST", "PF", "ESI", "PT", "TDS", "DPDP"]
    if business_profile.get("business_type") == "food_business" or business_profile.get("fssai_registered"):
        domains.append("FSSAI")
    return domains


def retrieve_relevant_regulations(
    query: str, business_profile: dict[str, Any], n_results: int = 5, persist_dir: str = "./chroma_db"
) -> list[dict]:
    store = RegulationVectorStore(persist_dir=persist_dir)
    domains = _domain_filters_from_profile(business_profile)
    per_domain = max(1, n_results // max(1, len(domains)))
    docs: list[dict] = []
    for domain in domains:
        docs.extend(store.similarity_search(query=query, n_results=per_domain, domain_filter=domain))
    docs = sorted(docs, key=lambda d: d.get("distance") or 9999)
    return docs[:n_results]


def build_context_prompt(query: str, retrieved_docs: list[dict], business_profile: dict[str, Any]) -> str:
    business_name = business_profile.get("name", "Unknown Business")
    lines = [f"Business: {business_name}", f"Query: {query}", "Relevant regulations:"]
    for idx, doc in enumerate(retrieved_docs, start=1):
        meta = doc.get("metadata", {})
        lines.append(
            f"[{idx}] {meta.get('title')} ({meta.get('domain')}) | Source: {meta.get('source')} | Effective: {meta.get('effective_date')}"
        )
        lines.append(doc.get("content", "")[:1000])
    return "\n".join(lines)
