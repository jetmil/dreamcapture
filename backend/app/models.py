from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Security: Brute-force protection
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    dreams = relationship("Dream", back_populates="user", cascade="all, delete-orphan")
    moments = relationship("Moment", back_populates="user", cascade="all, delete-orphan")
    resonances = relationship("Resonance", back_populates="user", cascade="all, delete-orphan")


class Dream(Base):
    """Dreams - stored for 24 hours"""
    __tablename__ = "dreams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Content
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)  # User's dream description
    audio_url = Column(String(500), nullable=True)  # If recorded as voice

    # AI Analysis
    ai_analysis = Column(JSON, nullable=True)  # {themes, emotions, symbols, narrative}
    ai_tags = Column(JSON, nullable=True)  # Generated tags for matching
    generated_image_url = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ttl_days = Column(Integer, default=1, nullable=False)  # 1, 7, or 30 days
    is_public = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True, index=True)  # Soft delete after expiration
    view_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="dreams")
    resonances = relationship("Resonance", back_populates="dream", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_dreams_created_expires", "created_at", "expires_at"),
        Index("idx_dreams_user_created", "user_id", "created_at"),
    )


class Moment(Base):
    """Moments - ephemeral, stored for 60 seconds"""
    __tablename__ = "moments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Content
    caption = Column(String(500), nullable=True)
    media_type = Column(String(20), nullable=False)  # 'photo', 'video'
    media_url = Column(String(500), nullable=False)
    location = Column(JSON, nullable=True)  # {lat, lon, name}

    # AI Analysis (lightweight)
    ai_tags = Column(JSON, nullable=True)  # Quick tags for resonance matching

    # Metadata
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_visible = Column(Boolean, default=True, index=True)  # Soft delete after 24h
    view_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="moments")
    resonances = relationship("Resonance", back_populates="moment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_moments_expires", "expires_at"),
        Index("idx_moments_created", "created_at"),
    )


class Resonance(Base):
    """Magical connections between dreams and moments"""
    __tablename__ = "resonances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dream_id = Column(UUID(as_uuid=True), ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False)
    moment_id = Column(UUID(as_uuid=True), ForeignKey("moments.id", ondelete="CASCADE"), nullable=False)

    # AI-calculated resonance
    resonance_score = Column(Integer, nullable=False)  # 0-100
    resonance_explanation = Column(Text, nullable=True)  # Why they resonate

    # Metadata
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    is_saved = Column(Boolean, default=False)  # Premium: save resonance

    # Relationships
    user = relationship("User", back_populates="resonances")
    dream = relationship("Dream", back_populates="resonances")
    moment = relationship("Moment", back_populates="resonances")

    __table_args__ = (
        Index("idx_resonance_user_score", "user_id", "resonance_score"),
        Index("idx_resonance_created", "created_at"),
    )


class SavedContent(Base):
    """Premium feature: save one moment per day"""
    __tablename__ = "saved_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # What's saved
    content_type = Column(String(20), nullable=False)  # 'dream', 'moment', 'resonance'
    content_id = Column(UUID(as_uuid=True), nullable=False)
    content_snapshot = Column(JSON, nullable=False)  # Full content at time of save

    # Metadata
    saved_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    note = Column(Text, nullable=True)  # Personal note

    __table_args__ = (
        Index("idx_saved_user_date", "user_id", "saved_at"),
    )
