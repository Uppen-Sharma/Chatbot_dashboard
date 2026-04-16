from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from src.db.session import get_db
from src.db.models import Conversation, Message

router = APIRouter()

# --- Hardcoded Metrics ---

@router.get("/stats")
async def get_stats():
    # Replicating the logic from the Node.js dashboardController
    return [
        {
            "title": "Active Users",
            "value": "13",
            "subValue": "/ 20",
            "trend": "65% Engagement Rate",
            "up": True,
            "iconName": "Zap",
        },
        {
            "title": "Total Conversations",
            "value": "1,248",
            "trend": "Selected Period",
            "up": True,
            "iconName": "Eye",
        },
        {
            "title": "Handover Rate",
            "value": "15%",
            "badge": "Moderate",
            "iconName": "Lightbulb",
        },
    ]

@router.get("/peak-usage")
async def get_peak_usage():
    # Sample distribution data mirroring the original JSON patterns
    return [
        {"label": "Mon", "val1": 45, "val2": 17, "val3": 25, "viewType": "Daily View", "hoverLabel": "Monday Usage"},
        {"label": "Tue", "val1": 33, "val2": 17, "val3": 29, "viewType": "Daily View", "hoverLabel": "Tuesday Usage"},
        {"label": "Wed", "val1": 55, "val2": 32, "val3": 28, "viewType": "Daily View", "hoverLabel": "Wednesday Usage"},
        {"label": "Thu", "val1": 27, "val2": 29, "val3": 15, "viewType": "Daily View", "hoverLabel": "Thursday Usage"},
        {"label": "Fri", "val1": 18, "val2": 8, "val3": 24, "viewType": "Daily View", "hoverLabel": "Friday Usage"},
        {"label": "Sat", "val1": 32, "val2": 33, "val3": 4, "viewType": "Daily View", "hoverLabel": "Saturday Usage"},
        {"label": "Sun", "val1": 47, "val2": 32, "val3": 15, "viewType": "Daily View", "hoverLabel": "Sunday Usage"},
    ]

@router.get("/faqs")
async def get_faqs():
    return [
        {"question": "How do I reset my password?", "answer": "Go to settings and click reset.", "count": 145},
        {"question": "Where is my vehicle location?", "answer": "Check the dashboard map interface.", "count": 89},
        {"question": "How to export data?", "answer": "Click the export button on the top right.", "count": 67},
    ]

# --- Dynamic Routes (Database Integrated) ---

@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    # Get unique user emails from the conversations table
    result = await db.execute(select(Conversation.user_email).distinct())
    emails = result.scalars().all()
    # Formatting as simple user objects for the frontend
    return [{"id": email, "email": email, "name": email.split('@')[0]} for email in emails]

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    # userId in the frontend is the email in this new schema
    await db.execute(delete(Conversation).where(Conversation.user_email == user_id))
    await db.commit()
    return {"success": True, "message": f"User {user_id} and related data deleted."}

@router.get("/users/{user_id}/chats")
async def get_user_chats(user_id: str, db: AsyncSession = Depends(get_db)):
    # userId is email
    result = await db.execute(
        select(Conversation).where(Conversation.user_email == user_id).order_by(Conversation.created_at.desc())
    )
    chats = result.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title or "New Conversation",
            "lastMessage": c.last_message,
            "lastMessageAt": c.last_message_at.isoformat() if c.last_message_at else None,
            "totalMessages": c.total_messages
        } for c in chats
    ]

@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.conversation_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    # The frontend expects { id, type: 'user'|'bot', text, timestamp }
    formatted = []
    for m in messages:
        # Add user message
        formatted.append({
            "id": f"{m.id}-user",
            "type": "user",
            "text": m.user_message,
            "timestamp": m.created_at.isoformat() if m.created_at else None
        })
        # Add bot response
        if m.bot_response:
            formatted.append({
                "id": f"{m.id}-bot",
                "type": "bot",
                "text": m.bot_response,
                "timestamp": m.responded_at.isoformat() if m.responded_at else m.created_at.isoformat()
            })
    return formatted
