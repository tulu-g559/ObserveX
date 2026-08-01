"""
VisionService
-------------
Single entrypoint for turning a screenshot into structured semantic
activity metadata. Tries Gemini Vision first; on ANY failure (timeout,
malformed JSON, quota, network) it falls back to PaddleOCR text
extraction so the pipeline never drops a record.
"""

import json
import re
from abc import ABC, abstractmethod
from typing import Any

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.schemas.schemas import AIResultSchema

logger = get_logger("observex.vision")

GEMINI_PROMPT = """Analyze this browser screenshot.
Return JSON ONLY. No markdown. No explanation.

{
  "activity": "coding",
  "application": "GitHub",
  "page_title": "Fix API Error",
  "summary": "User is debugging a FastAPI endpoint.",
  "tags": ["python", "fastapi", "backend"],
  "confidence": 0.94
}"""


class VisionBackend(ABC):
    name: str

    @abstractmethod
    def analyze(self, image_bytes: bytes) -> AIResultSchema: ...


class GeminiVisionBackend(VisionBackend):
    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    def analyze(self, image_bytes: bytes) -> AIResultSchema:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        import google.generativeai as genai

        genai.configure(api_key=self._api_key)
        model = genai.GenerativeModel(self._model)

        response = model.generate_content(
            [
                GEMINI_PROMPT,
                {"mime_type": "image/jpeg", "data": image_bytes},
            ],
            generation_config={"temperature": 0.2, "max_output_tokens": 1024},
        )

        raw_text = (response.text or "").strip()
        payload = _extract_json(raw_text)
        return AIResultSchema(**payload)


class PaddleOCRBackend(VisionBackend):
    name = "paddleocr"

    def __init__(self) -> None:
        self._ocr = None  # lazy loaded, heavy import

    def _get_ocr(self):
        if self._ocr is None:
            from paddleocr import PaddleOCR

            self._ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        return self._ocr

    def analyze(self, image_bytes: bytes) -> AIResultSchema:
        import io

        import numpy as np
        from PIL import Image

        ocr = self._get_ocr()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        result = ocr.ocr(np.array(image), cls=True)

        lines: list[str] = []
        for block in result or []:
            for line in block or []:
                text = line[1][0]
                lines.append(text)

        joined = " ".join(lines)[:500]
        return AIResultSchema(
            activity="unknown",
            application="",
            page_title="",
            summary=f"OCR fallback extracted text: {joined}" if joined else "OCR found no readable text.",
            tags=["ocr-fallback"],
            confidence=0.3,
        )


def _extract_json(text: str) -> dict[str, Any]:
    """Parse a dict out of model output that may be wrapped in markdown
    fences, surrounded by prose, or truncated at the token limit.
    Raises ValueError only when no JSON object can be found at all
    (caller falls back to OCR)."""
    if not text.strip():
        raise ValueError("empty model output")

    fenced = re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    candidates = fenced + [text]

    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate:
            continue

        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end <= start:
            continue

        payload = candidate[start : end + 1]
        # truncation at the token limit only ever chops the tail, so try
        # progressively shorter prefixes (up to 128 chars back)
        for tail in range(len(payload), max(start, len(payload) - 128) - 1, -1):
            try:
                parsed = json.loads(payload[:tail])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue

    raise ValueError(f"no valid JSON object found in model output: {text[:200]}")


class VisionService:
    """Facade used by Celery workers. Handles fallback + logging."""

    def __init__(self, primary: VisionBackend, fallback: VisionBackend) -> None:
        self._primary = primary
        self._fallback = fallback

    def analyze(self, image_bytes: bytes) -> tuple[AIResultSchema, str]:
        try:
            result = self._primary.analyze(image_bytes)
            return result, self._primary.name
        except Exception as exc:  # noqa: BLE001 - intentional broad catch for fallback
            logger.warning("primary vision backend failed (%s), falling back to OCR", exc)
            result = self._fallback.analyze(image_bytes)
            return result, self._fallback.name


def build_vision_service() -> VisionService:
    settings = get_settings()
    primary = GeminiVisionBackend(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
    fallback = PaddleOCRBackend()
    return VisionService(primary=primary, fallback=fallback)
