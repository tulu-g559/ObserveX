from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ObserveXError
from app.repositories.activity_repository import ActivityRepository
from app.schemas.schemas import ActivityEventCreate, ActivityEventOut, AIResultOut ## to be made

router = APIRouter(tags=["activity"])


@router.post("/activity", response_model=ActivityEventOut)
def create_activity(payload: ActivityEventCreate, db: Session = Depends(get_db)) -> ActivityEventOut:
    repo = ActivityRepository(db)
    event = repo.create_event(payload)
    return ActivityEventOut.model_validate(event)


@router.get("/activities", response_model=list[ActivityEventOut])
def list_activities(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[ActivityEventOut]:
    repo = ActivityRepository(db)
    events = repo.list_events(limit=limit, offset=offset)
    return [ActivityEventOut.model_validate(e) for e in events]


@router.get("/activity/{activity_id}")
def get_activity(activity_id: str, db: Session = Depends(get_db)):
    repo = ActivityRepository(db)
    event = repo.get_event(activity_id)
    if event is None:
        raise ObserveXError("activity not found", status_code=404)

    shot = event.screenshot
    screenshot_url = None
    if shot is not None:
        posix_path = shot.image_path.replace("\\", "/")
        screenshot_url = f"/storage/{posix_path.split('storage/', 1)[-1]}" if "storage/" in posix_path else None

    return {
        "event": ActivityEventOut.model_validate(event),
        "ai_result": AIResultOut.model_validate(event.ai_result) if event.ai_result else None,
        "screenshot": screenshot_url,
    }


@router.get("/search", response_model=list[AIResultOut])
def search_activities(q: str, db: Session = Depends(get_db)) -> list[AIResultOut]:
    repo = ActivityRepository(db)
    results = repo.search(q)
    return [AIResultOut.model_validate(r) for r in results]
