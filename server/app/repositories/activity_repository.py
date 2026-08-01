from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session as OrmSession

from app.models.models import ActivityEvent, AIResult, Screenshot
from app.models.models import Session as SessionModel
from app.schemas.schemas import ActivityEventCreate, AIResultSchema


class ActivityRepository:
    def __init__(self, db: OrmSession) -> None:
        self._db = db

    def get_or_create_session(self, session_id: str, user_id: str = "anon") -> None:
        existing = self._db.get(SessionModel, session_id)
        if existing:
            return
        stmt = (
            pg_insert(SessionModel)
            .values(id=session_id, user_id=user_id)
            .on_conflict_do_nothing(index_elements=["id"])
        )
        self._db.execute(stmt)
        self._db.flush()

    def create_event(self, payload: ActivityEventCreate) -> ActivityEvent:
        self.get_or_create_session(payload.session_id)
        event = ActivityEvent(
            session_id=payload.session_id,
            url=payload.url,
            page_title=payload.page_title,
            event_type=payload.event_type.value,
            timestamp=payload.timestamp or func.now(),
        )
        self._db.add(event)
        self._db.commit()
        self._db.refresh(event)
        return event

    def get_event(self, activity_id: str) -> ActivityEvent | None:
        return self._db.get(ActivityEvent, activity_id)

    def list_events(self, limit: int = 50, offset: int = 0) -> list[ActivityEvent]:
        stmt = (
            select(ActivityEvent)
            .order_by(ActivityEvent.timestamp.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self._db.execute(stmt).scalars())

    def attach_screenshot(self, activity_id: str, image_path: str, image_hash: str) -> Screenshot:
        shot = Screenshot(activity_id=activity_id, image_path=image_path, hash=image_hash)
        self._db.add(shot)
        self._db.commit()
        self._db.refresh(shot)
        return shot

    def save_ai_result(self, activity_id: str, result: AIResultSchema, source: str) -> AIResult:
        row = AIResult(
            activity_id=activity_id,
            activity=result.activity,
            application=result.application,
            page_title=result.page_title,
            summary=result.summary,
            tags=result.tags,
            confidence=result.confidence,
            source=source,
            raw_json=result.model_dump(),
        )
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def list_sessions(self, limit: int = 20) -> list[SessionModel]:
        stmt = select(SessionModel).order_by(SessionModel.start_time.desc()).limit(limit)
        return list(self._db.execute(stmt).scalars())

    def search(self, keyword: str, limit: int = 50) -> list[AIResult]:
        like = f"%{keyword.lower()}%"
        stmt = (
            select(AIResult)
            .where(func.lower(AIResult.summary).like(like) | func.lower(AIResult.activity).like(like))
            .order_by(AIResult.created_at.desc())
            .limit(limit)
        )
        return list(self._db.execute(stmt).scalars())

    def stats(self) -> dict:
        total_events = self._db.execute(select(func.count(ActivityEvent.id))).scalar_one()
        total_sessions = self._db.execute(select(func.count(SessionModel.id))).scalar_one()

        activity_counts = self._db.execute(
            select(AIResult.activity, func.count(AIResult.id))
            .group_by(AIResult.activity)
            .order_by(func.count(AIResult.id).desc())
            .limit(5)
        ).all()

        return {
            "total_events": total_events,
            "total_sessions": total_sessions,
            "top_activities": [{"activity": a, "count": c} for a, c in activity_counts],
        }
