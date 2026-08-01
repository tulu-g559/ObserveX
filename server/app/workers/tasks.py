from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.repositories.activity_repository import ActivityRepository
from app.services.vision_service import build_vision_service
from app.workers.celery_app import celery_app

logger = get_logger("observex.worker")

_vision_service = None  # lazy singleton per worker process


def _get_vision_service():
    global _vision_service
    if _vision_service is None:
        _vision_service = build_vision_service()
    return _vision_service


@celery_app.task(name="process_screenshot", bind=True, max_retries=3, default_retry_delay=5)
def process_screenshot(self, activity_id: str, image_path: str) -> dict:
    """
    Pipeline: read image -> VisionService (Gemini w/ PaddleOCR fallback)
    -> persist structured AIResult row linked to the ActivityEvent.
    """
    logger.info("processing screenshot for activity=%s", activity_id)
    db = SessionLocal()
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        service = _get_vision_service()
        result, source = service.analyze(image_bytes)

        repo = ActivityRepository(db)
        row = repo.save_ai_result(activity_id, result, source)

        logger.info("stored AIResult id=%s source=%s activity=%s", row.id, source, result.activity)
        return {"activity_id": activity_id, "source": source, "activity": result.activity}
    except Exception as exc:  # noqa: BLE001
        logger.exception("task failed for activity=%s", activity_id)
        raise self.retry(exc=exc)
    finally:
        db.close()
