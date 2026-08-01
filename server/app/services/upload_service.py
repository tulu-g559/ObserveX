import hashlib
import os
import uuid

from app.config.settings import get_settings
from app.core.exceptions import ObserveXError

STORAGE_DIR = "storage/screenshots"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class UploadService:
    def __init__(self) -> None:
        self._settings = get_settings()
        os.makedirs(STORAGE_DIR, exist_ok=True)

    def validate(self, content_type: str, size_bytes: int) -> None:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ObserveXError(f"unsupported content type: {content_type}", status_code=415)

        max_bytes = self._settings.MAX_UPLOAD_MB * 1024 * 1024
        if size_bytes > max_bytes:
            raise ObserveXError(
                f"file exceeds max size of {self._settings.MAX_UPLOAD_MB}MB", status_code=413
            )

    def store(self, image_bytes: bytes) -> tuple[str, str]:
        """Returns (path, sha256_hash)."""
        image_hash = hashlib.sha256(image_bytes).hexdigest()
        filename = f"{uuid.uuid4()}.jpg"
        path = os.path.join(STORAGE_DIR, filename)
        with open(path, "wb") as f:
            f.write(image_bytes)
        return path, image_hash
