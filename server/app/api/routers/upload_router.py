from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.activity_repository import ActivityRepository
from app.schemas.schemas import UploadAck
from app.services.upload_service import UploadService
from app.workers.tasks import process_screenshot

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("", response_model=UploadAck)
async def upload_screenshot(
    activity_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
) -> UploadAck:
    upload_service = UploadService()
    image_bytes = await file.read()

    upload_service.validate(file.content_type or "", len(image_bytes))
    path, image_hash = upload_service.store(image_bytes)

    repo = ActivityRepository(db)
    repo.attach_screenshot(activity_id=activity_id, image_path=path, image_hash=image_hash)

    task = process_screenshot.delay(activity_id=activity_id, image_path=path)

    return UploadAck(activity_id=activity_id, task_id=task.id, status="queued")
