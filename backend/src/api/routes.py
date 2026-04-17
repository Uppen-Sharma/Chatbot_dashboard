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
)
import src.services.dashboard as svc

router = APIRouter()


# Metric Endpoints (live DB queries, date params forwarded to service)

@router.get("/stats", response_model=List[StatCard])
async def get_stats(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_stats(start, end, db)


@router.get("/peak-usage", response_model=List[PeakUsagePoint])
async def get_peak_usage(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_peak_usage(start, end, db)


@router.get("/faqs", response_model=List[FaqItem])
async def get_faqs(
    start: Optional[str] = Query(None),
    end:   Optional[str] = Query(None),
    db:    AsyncSession  = Depends(get_db),
):
    return await svc.get_faqs(start, end, db)


# User & Chat Endpoints (live database)

@router.get("/users", response_model=List[UserResponse])
async def get_users(db: AsyncSession = Depends(get_db)):
    return await svc.fetch_enriched_users(db)


@router.delete("/users/{user_id}", response_model=DeleteResponse)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.remove_user_data(user_id, db)


@router.get("/users/{user_id}/chats", response_model=List[ChatResponse])
async def get_user_chats(user_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.fetch_user_chats(user_id, db)


@router.get("/chats/{chat_id}/messages", response_model=List[MessageResponse])
async def get_chat_messages(chat_id: str, db: AsyncSession = Depends(get_db)):
    return await svc.fetch_chat_messages(chat_id, db)
