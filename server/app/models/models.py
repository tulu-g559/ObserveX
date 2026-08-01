import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events: Mapped[list["ActivityEvent"]] = relationship(back_populates="session")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    url: Mapped[str] = mapped_column(Text)
    page_title: Mapped[str] = mapped_column(Text, default="")
    event_type: Mapped[str] = mapped_column(String)  # url_change | tab_switch | click | idle_resume | interval

    session: Mapped["Session"] = relationship(back_populates="events")
    screenshot: Mapped["Screenshot | None"] = relationship(back_populates="activity", uselist=False)
    ai_result: Mapped["AIResult | None"] = relationship(back_populates="activity_event", uselist=False)


class Screenshot(Base):
    __tablename__ = "screenshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    activity_id: Mapped[str] = mapped_column(ForeignKey("activity_events.id"), unique=True)
    image_path: Mapped[str] = mapped_column(String)
    hash: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    activity: Mapped["ActivityEvent"] = relationship(back_populates="screenshot")


class AIResult(Base):
    __tablename__ = "ai_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    activity_id: Mapped[str] = mapped_column(ForeignKey("activity_events.id"), unique=True)

    activity: Mapped[str] = mapped_column(String)          # e.g. "Coding"
    application: Mapped[str] = mapped_column(String, default="")
    page_title: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source: Mapped[str] = mapped_column(String, default="gemini")  # gemini | paddleocr
    raw_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    activity_event: Mapped["ActivityEvent"] = relationship(back_populates="ai_result")
