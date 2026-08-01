from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger("observex.exceptions")


class ObserveXError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def observex_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, ObserveXError):
        raise exc
    logger.warning("handled error: %s", exc.message)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal server error"},
    )
