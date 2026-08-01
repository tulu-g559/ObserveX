from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.activity_repository import ActivityRepository
from app.schemas.schemas import UploadAck
from app.services.upload_service import UploadService
from app.workers.tasks import process_screenshot

router = APIRouter(prefix="/upload", tags=["upload"])

