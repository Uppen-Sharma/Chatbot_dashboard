"""
Pydantic Response Schemas
=========================
Defines the exact shape of every API response.  FastAPI uses these to:
  - Automatically validate outgoing data
  - Generate accurate OpenAPI / Swagger documentation
  - Strip any extra fields that shouldn't reach the client

Equivalent to DTOs (Data Transfer Objects) or response-model files in a
Node.js / TypeScript project.
"""

from typing import Optional
from pydantic import BaseModel


# Metric Endpoints

class StatCard(BaseModel):
    """Shape returned by GET /api/stats.
    badge values: 'Good' | 'Moderate' | 'Bad' | 'No Data'
    """
    title: str
    value: str
    subValue: Optional[str] = None
    trend: Optional[str] = None
    up: Optional[bool] = None
    badge: Optional[str] = None
    iconName: str


class PeakUsagePoint(BaseModel):
    """Single bar entry returned by GET /api/peak-usage"""
    label: str
    val1: int
    val2: int
    val3: int
    viewType: str
    hoverLabel: str


class FaqItem(BaseModel):
    """Single FAQ entry returned by GET /api/faqs (derived from most-asked messages)"""
    question: str
    answer: str
    count: Optional[int] = None


# User / Chat Endpoints

class UserResponse(BaseModel):
    """Shape returned by GET /api/users"""
    id: str
    email: str
    name: str
    handle: str
    convos: int
    lastActive: str
    rating: int
    avgDur: str
    progress: int


class ChatResponse(BaseModel):
    """Shape returned by GET /api/users/{user_id}/chats"""
    id: str
    title: str
    lastMessage: Optional[str] = None
    lastMessageAt: Optional[str] = None
    totalMessages: int


class MessageResponse(BaseModel):
    """Single message entry returned by GET /api/chats/{chat_id}/messages"""
    id: str
    type: str          # "user" | "bot"
    text: str
    timestamp: Optional[str] = None


class DeleteResponse(BaseModel):
    """Shape returned by DELETE /api/users/{user_id}"""
    success: bool
    message: str


# Upload / Translate Endpoints

class TranslateRequest(BaseModel):
    texts: list[str]
    target_lang: str

class TranslateResponse(BaseModel):
    translated: list[str]

class UploadResponse(BaseModel):
    success: bool
    message: str
    file_exists: Optional[bool] = False
