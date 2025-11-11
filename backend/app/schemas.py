from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID


# User schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_premium: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Dream schemas
class DreamCreate(BaseModel):
    description: str = Field(..., min_length=10, max_length=5000)
    title: Optional[str] = Field(None, max_length=200)
    audio_url: Optional[str] = None
    is_public: bool = True
    ttl_days: int = Field(1, ge=1, le=30, description="TTL in days: 1, 7, or 30")


class DreamResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str]
    description: str
    audio_url: Optional[str]
    ai_analysis: Optional[Dict[str, Any]]
    ai_tags: Optional[List[str]]
    generated_image_url: Optional[str]
    created_at: datetime
    expires_at: datetime
    ttl_days: int
    is_public: bool
    is_visible: bool
    view_count: int

    model_config = ConfigDict(from_attributes=True)


# Moment schemas
class MomentCreate(BaseModel):
    caption: Optional[str] = Field(None, max_length=500)
    media_type: str = Field(..., pattern="^(photo|video)$")
    media_url: str
    location: Optional[Dict[str, Any]] = None


class MomentResponse(BaseModel):
    id: UUID
    user_id: UUID
    caption: Optional[str]
    media_type: str
    media_url: str
    location: Optional[Dict[str, Any]]
    ai_tags: Optional[List[str]]
    created_at: datetime
    expires_at: datetime
    view_count: int

    model_config = ConfigDict(from_attributes=True)


# Resonance schemas
class ResonanceResponse(BaseModel):
    id: UUID
    dream_id: UUID
    moment_id: UUID
    resonance_score: int
    resonance_explanation: Optional[str]
    created_at: datetime
    is_saved: bool

    # Nested content
    dream: Optional[DreamResponse] = None
    moment: Optional[MomentResponse] = None

    model_config = ConfigDict(from_attributes=True)


# Stream schemas
class StreamItem(BaseModel):
    """Unified stream item for WebSocket"""
    type: str  # 'dream', 'moment', 'resonance'
    data: Dict[str, Any]
    timestamp: datetime


# Saved content schemas
class SaveContentRequest(BaseModel):
    content_type: str = Field(..., pattern="^(dream|moment|resonance)$")
    content_id: UUID
    note: Optional[str] = Field(None, max_length=1000)


class SavedContentResponse(BaseModel):
    id: UUID
    content_type: str
    content_id: UUID
    content_snapshot: Dict[str, Any]
    saved_at: datetime
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)
