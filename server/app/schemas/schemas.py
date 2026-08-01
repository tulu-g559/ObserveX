from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class EventType(str, Enum):
    URL_CHANGE = "url_change"
    TAB_SWITCH = "tab_switch"
    CLICK = "click"
    IDLE_RESUME = "idle_resume"
    INTERVAL = "interval"
    FORM_SUBMIT = "form_submit"


class ActivityEventCreate(BaseModel):
    session_id: str
    url: str
    page_title: str = ""
    event_type: EventType
    timestamp: datetime | None = None


class ActivityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    timestamp: datetime
    url: str
    page_title: str
    event_type: str


class AIResultSchema(BaseModel):
    """Shape returned by Gemini / used for structured semantic enrichment."""

    activity: str = Field(description="e.g. Coding, Reading, Watching, Browsing")
    application: str = Field(default="", description="e.g. GitHub, YouTube, VSCode Web")
    page_title: str = Field(default="")
    summary: str
    tags: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class AIResultOut(AIResultSchema):
    model_config = ConfigDict(from_attributes=True)

    id: str
    activity_id: str
    source: str
    created_at: datetime


class UploadAck(BaseModel):
    activity_id: str
    task_id: str
    status: str = "queued"


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    start_time: datetime
    end_time: datetime | None


class StatsOut(BaseModel):
    total_events: int
    total_sessions: int
    top_activities: list[dict]
    top_tags: list[dict]


class HealthOut(BaseModel):
    status: str = "ok"
    service: str = "ObserveX"
