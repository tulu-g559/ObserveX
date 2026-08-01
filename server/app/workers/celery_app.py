from celery import Celery

from app.config.settings import get_settings

settings = get_settings()

celery_app = Celery(
    "observex",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_time_limit=300,
    task_soft_time_limit=270,
    worker_concurrency=4,
)
