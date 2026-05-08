import networkx as nx
from fastapi import APIRouter
from fastapi.requests import Request
from services.knowledge.rag.vector_store import RegulationVectorStore

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.get("/graph")
async def get_graph(request: Request):
    graph: nx.DiGraph = request.app.state.obligation_graph
    
    # We need to construct nodes and edges from the graph to return as JSON
    # Nodes might be strings or dicts, depending on how it's built
    nodes = []
    edges = []
    
    for n in graph.nodes(data=True):
        node_id = n[0]
        data = n[1]
        nodes.append({
            "node_id": node_id,
            "domain": data.get("domain", node_id),
            "title": data.get("title", f"{node_id} Obligation"),
            "threshold_type": data.get("threshold_type", "N/A"),
            "threshold_value": data.get("threshold_value", "N/A"),
            "due_date_rule": data.get("due_date_rule", "N/A")
        })
        
    for e in graph.edges(data=True):
        edges.append({
            "source": e[0],
            "target": e[1],
            "edge_type": e[2].get("type", "dependency")
        })
        
    return {"nodes": nodes, "edges": edges}

@router.get("/rag/stats")
async def get_rag_stats():
    import os
    from pathlib import Path
    persist_dir = Path(__file__).resolve().parents[2] / "chroma_db"
    store = RegulationVectorStore(str(persist_dir))
    return store.get_collection_stats()
