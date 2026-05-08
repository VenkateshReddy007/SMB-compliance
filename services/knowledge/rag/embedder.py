import time
from typing import List

import google.generativeai as genai

from services.api.config import settings


class Embedder:
    def __init__(self) -> None:
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.embedding_model or "models/text-embedding-004"

    def embed_text(self, text: str) -> List[float]:
        return self._with_backoff(lambda: genai.embed_content(model=self.model_name, content=text)["embedding"])

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for text in texts:
            vectors.append(self.embed_text(text))
        return vectors

    def _with_backoff(self, fn, max_retries: int = 5):
        delay = 1.0
        for attempt in range(max_retries):
            try:
                return fn()
            except Exception:
                if attempt == max_retries - 1:
                    raise
                time.sleep(delay)
                delay *= 2
