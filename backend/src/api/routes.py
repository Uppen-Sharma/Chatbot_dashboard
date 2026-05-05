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

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
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
)
from fastapi import APIRouter, Depends, Query, File, UploadFile, Form, HTTPException
from typing import Any, Dict
import src.services.dashboard as svc
from src.dependencies.auth import get_current_user, require_role

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

@router.get("/users", response_model=List[UserResponse], dependencies=[Depends(get_current_user)])
async def get_users(db: AsyncSession = Depends(get_db)):
    return await svc.fetch_enriched_users(db)


@router.get("/users/{user_id}/conversations", response_model=List[ChatResponse], dependencies=[Depends(get_current_user)])
async def get_user_chats(user_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.fetch_user_chats(user_id, db)


@router.get("/conversations/{chat_id}/messages", response_model=List[MessageResponse], dependencies=[Depends(get_current_user)])
async def get_chat_messages(chat_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.fetch_chat_messages(chat_id, db)


@router.delete("/conversations/{chat_id}", response_model=DeleteResponse, dependencies=[Depends(require_role("admin"))])
async def delete_conversation(chat_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.remove_conversation_data(chat_id, db)


# Utilities

@router.post("/upload-file", response_model=UploadResponse, dependencies=[Depends(require_role("admin"))])
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    confirm_reupload: Optional[str] = Form(None),
):
    """Mock upload endpoint. Accepts a file and returns success."""
    # This is a stub implementation.
    return {"success": True, "message": f"File {file.filename} uploaded successfully."}


@router.post("/translate", response_model=TranslateResponse, dependencies=[Depends(require_role("admin"))])
async def translate_texts(req: TranslateRequest):
    """Mock translation endpoint. Returns the input texts unchanged."""
    # This is a stub implementation.
    return {"translated": req.texts}

