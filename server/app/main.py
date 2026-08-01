import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import activity_router, health_router, session_router, upload_router
from app.config.settings import get_settings
from app.core.exceptions import ObserveXError, observex_exception_handler, unhandled_exception_handler
from app.core.logging import configure_logging, get_logger, new_request_id

settings = get_settings()
configure_logging()
logger = get_logger("observex.main")

os.makedirs("storage/screenshots", exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("ObserveX API starting up (env=%s)", settings.ENV)
    yield


app = FastAPI(title="ObserveX", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    new_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = str(uuid.uuid4())[:8]
    return response


app.add_exception_handler(ObserveXError, observex_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(health_router.router)
app.include_router(upload_router.router)
app.include_router(activity_router.router)
app.include_router(session_router.router)

app.mount("/storage", StaticFiles(directory="storage"), name="storage")
