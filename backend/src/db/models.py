import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_email = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    last_message = Column(Text, nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    total_messages = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_message = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=True)
    total_tokens = Column(Integer, default=0)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    responded_at = Column(DateTime, nullable=True)

    # Relationship
    conversation = relationship("Conversation", back_populates="messages")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(100), nullable=False)
    conversation_id = Column(String(100), nullable=True)
    user_email = Column(String(255), nullable=True)
    feedback_type = Column(String(20), nullable=False)  # Using String for simplicity with the Enum requirement
    rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
