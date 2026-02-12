import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.config import settings
from app.utils.auth import require_staff_or_admin
import uuid

router = APIRouter(prefix="/api/upload", tags=["Upload"])


@router.post("")
async def upload_file(file: UploadFile = File(...), admin=Depends(require_staff_or_admin)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
    if ext.lower() not in allowed:
        raise HTTPException(400, f"File type {ext} not allowed. Use: {allowed}")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 5MB")

    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/{filename}", "filename": filename}
