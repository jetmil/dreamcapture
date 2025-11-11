from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timedelta, timezone
from typing import List
from app.database import get_db, get_redis
from app.models import User, Moment
from app.schemas import MomentCreate, MomentResponse
from app.auth import get_current_user
from app.config import settings
from app.ai_service import ai_service
from app.moderation import content_moderator
import redis.asyncio as redis

router = APIRouter(prefix="/moments", tags=["moments"])


async def process_moment_ai(moment_id: str, caption: str, media_type: str, db: AsyncSession):
    """Background task to tag moment"""
    try:
        tags = await ai_service.analyze_moment(caption, media_type)

        # Update moment
        result = await db.execute(select(Moment).where(Moment.id == moment_id))
        moment = result.scalar_one_or_none()

        if moment:
            moment.ai_tags = tags
            await db.commit()

    except Exception as e:
        print(f"Moment AI processing error: {e}")
        await db.rollback()


@router.post("", response_model=MomentResponse, status_code=status.HTTP_201_CREATED)
async def create_moment(
    moment_data: MomentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    """Create ephemeral moment (max 20 per hour)"""

    # Moderate caption if present
    if moment_data.caption:
        moderation_result = await content_moderator.check_text(moment_data.caption)

        if moderation_result["flagged"]:
            error_msg = content_moderator.get_violation_message(moderation_result)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

    # Check hourly limit
    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    result = await db.execute(
        select(Moment).where(
            and_(
                Moment.user_id == current_user.id,
                Moment.created_at >= hour_ago
            )
        )
    )
    recent_moments = result.scalars().all()

    if len(recent_moments) >= settings.MAX_MOMENTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum {settings.MAX_MOMENTS_PER_HOUR} moments per hour"
        )

    # Create moment
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.MOMENT_TTL_SECONDS)

    new_moment = Moment(
        user_id=current_user.id,
        caption=moment_data.caption,
        media_type=moment_data.media_type,
        media_url=moment_data.media_url,
        location=moment_data.location,
        created_at=now,
        expires_at=expires_at
    )

    db.add(new_moment)
    await db.commit()
    await db.refresh(new_moment)

    # Publish to Redis stream for WebSocket
    await redis_client.publish(
        "moments_stream",
        f"new_moment:{new_moment.id}"
    )

    # Process AI in background
    if settings.ENABLE_AI_FEATURES and moment_data.caption:
        background_tasks.add_task(
            process_moment_ai,
            str(new_moment.id),
            moment_data.caption,
            moment_data.media_type,
            db
        )

    return new_moment


@router.get("", response_model=List[MomentResponse])
async def get_moments(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get live moments stream (not expired) - no auth required"""

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Moment)
        .where(
            and_(
                Moment.is_visible == True,  # Only show visible moments
                Moment.expires_at > now
            )
        )
        .order_by(desc(Moment.created_at))
        .offset(skip)
        .limit(limit)
    )

    moments = result.scalars().all()
    return moments


@router.get("/{moment_id}", response_model=MomentResponse)
async def get_moment(
    moment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific moment (if not expired)"""

    result = await db.execute(select(Moment).where(Moment.id == moment_id))
    moment = result.scalar_one_or_none()

    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")

    now = datetime.now(timezone.utc)
    if moment.expires_at <= now:
        raise HTTPException(status_code=410, detail="Moment expired")

    # Increment view count
    moment.view_count += 1
    await db.commit()

    return moment
