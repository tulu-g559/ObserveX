from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.activity_repository import ActivityRepository
from app.schemas.schemas import SessionOut, StatsOut

router = APIRouter(tags=["sessions"])


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)) -> list[SessionOut]:
    repo = ActivityRepository(db)
    sessions = repo.list_sessions()
    return [SessionOut.model_validate(s) for s in sessions]


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)) -> StatsOut:
    repo = ActivityRepository(db)
    data = repo.stats()
    return StatsOut(
        total_events=data["total_events"],
        total_sessions=data["total_sessions"],
        top_activities=data["top_activities"],
        top_tags=[],
    )
