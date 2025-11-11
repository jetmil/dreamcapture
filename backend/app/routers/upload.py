from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pathlib import Path
import uuid
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["upload"])

# Allowed MIME types
ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

# Max file sizes (bytes)
MAX_PHOTO_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/moment-media")
async def upload_moment_media(
    file: UploadFile = File(...),
    type: str = Form(...)
):
    """
    Upload photo or video for moment
    Returns: {"url": "/uploads/moments/filename.ext"}
    """

    # Validate type
    if type not in ["photo", "video"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'photo' or 'video'"
        )

    # Validate MIME type
    allowed_types = ALLOWED_PHOTO_TYPES if type == "photo" else ALLOWED_VIDEO_TYPES
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Read file to check size
    contents = await file.read()
    file_size = len(contents)

    max_size = MAX_PHOTO_SIZE if type == "photo" else MAX_VIDEO_SIZE
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum: {max_size / (1024 * 1024)}MB"
        )

    # Create upload directory
    upload_dir = Path("/var/www/dreamcapture/backend/static/uploads/moments")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]

    # Get file extension from MIME type
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
    }
    ext = ext_map.get(file.content_type, "bin")

    filename = f"moment_{timestamp}_{unique_id}.{ext}"
    file_path = upload_dir / filename

    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # Return local URL path
        local_url = f"/uploads/moments/{filename}"
        print(f"✅ Moment media uploaded: {local_url} ({file_size / 1024:.2f}KB)")

        return {"url": local_url}

    except Exception as e:
        print(f"❌ Failed to save moment media: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file"
        )
