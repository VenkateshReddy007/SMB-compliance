from fastapi import APIRouter

from models import ChatMessage, ChatResponse

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
async def rag_chat(payload: ChatMessage):
    text = payload.message.lower()
    sources = ["gstn", "epfo"]
    confidence = 0.86
    hitl_escalated = False
    rail_agreement = True

    if "uncertain" in text or "override" in text:
        confidence = 0.54
        hitl_escalated = True
        rail_agreement = False
        sources.append("hitl_queue")

    response = (
        "Based on the current regulation snapshots and obligations, here is the compliance guidance for your query: "
        + payload.message
    )
    return ChatResponse(
        response=response,
        confidence_score=confidence,
        sources=sources,
        rail_agreement=rail_agreement,
        hitl_escalated=hitl_escalated,
    )
