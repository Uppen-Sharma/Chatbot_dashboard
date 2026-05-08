"""
API Routes (HTTP Layer)
=======================
This module only handles HTTP concerns:
  - Declaring routes and their HTTP methods
  - Accepting / validating query parameters
  - Injecting dependencies (db session)
  - Delegating all logic to the service layer

No business logic, SQL, or data formatting lives here.
Equivalent to an Express router file in a Node.js project.
"""

from pathlib import Path
from typing import List, Optional, Any, Dict
import os

from fastapi import APIRouter, Depends, Query, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.dependencies.db import get_db
from src.models.schemas import (
    StatCard,
    PeakUsagePoint,
    FaqItem,
    UserResponse,
    ChatResponse,
    MessageResponse,
    DeleteResponse,
    TranslateRequest,
    TranslateResponse,
    UploadResponse,
    PaginatedUsers,
    PaginatedChats,
)

import src.services.dashboard as svc
from src.dependencies.auth import get_current_user, require_role
from src.core.logging import logger

router = APIRouter()


# Metric Endpoints (live DB queries, date params forwarded to service)

@router.get("/stats", response_model=List[StatCard], dependencies=[Depends(get_current_user)])
async def get_stats(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_stats(start, end, db)


@router.get("/peak-usage", response_model=List[PeakUsagePoint], dependencies=[Depends(get_current_user)])
async def get_peak_usage(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_peak_usage(start, end, db)


@router.get("/faqs", response_model=List[FaqItem], dependencies=[Depends(get_current_user)])
async def get_faqs(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_faqs(start, end, db)


# User & Chat Endpoints (live database)

@router.get("/users", response_model=PaginatedUsers, dependencies=[Depends(get_current_user)])
async def get_users(
    skip:  int          = Query(0,  ge=0,            description="Number of records to skip"),
    limit: int          = Query(50, ge=1,  le=200,   description="Maximum records to return (hard cap: 200)"),
    db:    AsyncSession = Depends(get_db),
):
    """
    Returns a paginated list of enriched users.

    Use `skip` and `limit` to page through results:
      - Page 1: skip=0,  limit=50
      - Page 2: skip=50, limit=50
    """
    items = await svc.fetch_enriched_users(db, skip=skip, limit=limit)
    return {"items": items, "skip": skip, "limit": limit, "count": len(items)}


@router.get("/users/{user_id}/conversations", response_model=PaginatedChats, dependencies=[Depends(get_current_user)])
async def get_user_chats(
    user_id: str,
    skip:    int          = Query(0,  ge=0,           description="Number of conversations to skip"),
    limit:   int          = Query(20, ge=1, le=100,   description="Maximum conversations to return (hard cap: 100)"),
    db:      AsyncSession = Depends(get_db),
):
    """
    Returns a paginated list of conversations for a specific user.

    Use `skip` and `limit` to page through results:
      - Page 1: skip=0,  limit=20
      - Page 2: skip=20, limit=20
    """
    items = await svc.fetch_user_chats(user_id, db, skip=skip, limit=limit)
    return {"items": items, "skip": skip, "limit": limit, "count": len(items)}


@router.get("/conversations/{chat_id}/messages", response_model=List[MessageResponse], dependencies=[Depends(get_current_user)])
async def get_chat_messages(chat_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.fetch_chat_messages(chat_id, db)


@router.delete("/conversations/{chat_id}", response_model=DeleteResponse, dependencies=[Depends(require_role("admin"))])
async def delete_conversation(chat_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.remove_conversation_data(chat_id, db)


# Utilities

# Allowed extensions and their MIME groups
_ALLOWED_FILE_TYPES = {
    "faq":          {".json", ".csv"},
    "persona":      {".json", ".txt"},
    "document":     {".pdf", ".docx", ".txt"},
    "pre-login":    {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"},
    "post-login":   {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"},
}
_MAX_FILE_SIZE_MB = 10
_MAX_FILE_SIZE_BYTES = _MAX_FILE_SIZE_MB * 1024 * 1024
# Resolve upload dir from env var; default to an 'uploads/' folder next to this file's package root.
# Using an absolute path avoids saving to a random CWD-relative location in production.
_UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", Path(__file__).parent.parent / "uploads"))


@router.post("/upload-file", response_model=UploadResponse, dependencies=[Depends(require_role("admin"))])
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    confirm_reupload: Optional[str] = Form(None),
):
    """
    Validates and accepts an uploaded file for the chatbot configuration.

    Validation rules:
      - file_type must be one of: faq, persona, document, pre-login, post-login
      - File extension must match the expected extensions for that type
      - File size must not exceed 10 MB

    Saves the file to the 'uploads/{file_type}/' directory.
    """
    # 1. Validate file_type
    if file_type not in _ALLOWED_FILE_TYPES:
        allowed = ", ".join(_ALLOWED_FILE_TYPES.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file_type '{file_type}'. Allowed values: {allowed}.",
        )

    # 2. Validate file extension
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    allowed_exts = _ALLOWED_FILE_TYPES[file_type]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=415,
            detail=(
                f"File extension '{ext}' is not allowed for type '{file_type}'. "
                f"Expected one of: {', '.join(sorted(allowed_exts))}."
            ),
        )

    # 3. Validate file size
    content = await file.read()
    file_size_bytes = len(content)
    if file_size_bytes > _MAX_FILE_SIZE_BYTES:
        size_mb = round(file_size_bytes / (1024 * 1024), 2)
        raise HTTPException(
            status_code=413,
            detail=f"File is too large ({size_mb} MB). Maximum allowed size is {_MAX_FILE_SIZE_MB} MB.",
        )

    # 4. Check for existing file
    target_dir = _UPLOAD_DIR / file_type
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / file.filename

    if target_path.exists() and not confirm_reupload:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "file_exists": True,
                "message": f"File '{file.filename}' already exists.",
            },
        )

    # 5. Save the file
    try:
        with open(target_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to save file {file.filename}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while saving file.")

    logger.info(
        f"File upload success: '{file.filename}' | type={file_type} | "
        f"size={round(file_size_bytes / 1024, 1)} KB | path={target_path}"
    )

    return {
        "success": True,
        "message": f"File '{file.filename}' uploaded successfully.",
        "file_size": f"{round(file_size_bytes / 1024, 1)} KB",
    }


@router.post("/translate", response_model=TranslateResponse, dependencies=[Depends(require_role("admin"))])
async def translate_texts(req: TranslateRequest):
    """
    Translation endpoint — currently not implemented.

    Returns HTTP 501 so the frontend can correctly handle this as a
    pending feature rather than silently receiving unchanged text.
    """
    raise HTTPException(
        status_code=501,
        detail=(
            "Translation service is not yet implemented. "
            "Integrate a translation provider (e.g. Azure Translator, DeepL) "
            "and replace this placeholder."
        ),
    )