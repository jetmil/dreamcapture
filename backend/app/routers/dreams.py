from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timedelta, timezone
from typing import List
from app.database import get_db
from app.models import User, Dream
from app.schemas import DreamCreate, DreamResponse
from app.auth import get_current_user
from app.config import settings
from app.ai_service import ai_service
from app.moderation import content_moderator

router = APIRouter(prefix="/dreams", tags=["dreams"])


async def process_dream_ai(dream_id: str, description: str, db: AsyncSession):
    """Background task to analyze dream and generate image"""
    try:
        # AI analysis
        analysis = await ai_service.analyze_dream(description)

        # Generate image
        visual_prompt = analysis.get("visual_prompt", description[:200])
        image_url = await ai_service.generate_dream_image(visual_prompt)

        # Update dream
        result = await db.execute(select(Dream).where(Dream.id == dream_id))
        dream = result.scalar_one_or_none()

        if dream:
            dream.ai_analysis = analysis
            dream.ai_tags = analysis.get("tags", [])
            dream.generated_image_url = image_url
            await db.commit()

    except Exception as e:
        print(f"Dream AI processing error: {e}")
        await db.rollback()


@router.post("", response_model=DreamResponse, status_code=status.HTTP_201_CREATED)
async def create_dream(
    dream_data: DreamCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new dream (max 10 per day)"""

    # Moderate content
    text_to_check = f"{dream_data.title or ''} {dream_data.description}"
    moderation_result = await content_moderator.check_text(text_to_check)

    if moderation_result["flagged"]:
        error_msg = content_moderator.get_violation_message(moderation_result)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Check daily limit
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(Dream).where(
            and_(
                Dream.user_id == current_user.id,
                Dream.created_at >= today_start
            )
        )
    )
    today_dreams = result.scalars().all()

    if len(today_dreams) >= settings.MAX_DREAMS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum {settings.MAX_DREAMS_PER_DAY} dreams per day"
        )

    # Create dream
    now = datetime.now(timezone.utc)

    # User can choose TTL: 1, 7, or 30 days
    ttl_days = dream_data.ttl_days if hasattr(dream_data, 'ttl_days') else 1
    if ttl_days not in [1, 7, 30]:
        ttl_days = 1  # Default to 24 hours

    expires_at = now + timedelta(days=ttl_days)

    new_dream = Dream(
        user_id=current_user.id,
        title=dream_data.title,
        description=dream_data.description,
        audio_url=dream_data.audio_url,
        is_public=dream_data.is_public,
        ttl_days=ttl_days,
        is_visible=True,
        created_at=now,
        expires_at=expires_at
    )

    db.add(new_dream)
    await db.commit()
    await db.refresh(new_dream)

    # Process AI in background
    if settings.ENABLE_AI_FEATURES:
        background_tasks.add_task(
            process_dream_ai,
            str(new_dream.id),
            dream_data.description,
            db
        )

    return new_dream


@router.get("", response_model=List[DreamResponse])
async def get_dreams(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get public dreams stream (not expired) - no auth required"""

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Dream)
        .where(
            and_(
                Dream.is_public == True,
                Dream.is_visible == True,  # Only show visible (not expired)
                Dream.expires_at > now
            )
        )
        .order_by(desc(Dream.created_at))
        .offset(skip)
        .limit(limit)
    )

    dreams = result.scalars().all()
    return dreams


@router.get("/my", response_model=List[DreamResponse])
async def get_my_dreams(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's dreams"""

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Dream)
        .where(
            and_(
                Dream.user_id == current_user.id,
                Dream.expires_at > now
            )
        )
        .order_by(desc(Dream.created_at))
        .offset(skip)
        .limit(limit)
    )

    dreams = result.scalars().all()
    return dreams


@router.get("/{dream_id}", response_model=DreamResponse)
async def get_dream(
    dream_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get specific dream (public dreams don't require auth)"""

    result = await db.execute(select(Dream).where(Dream.id == dream_id))
    dream = result.scalar_one_or_none()

    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")

    # Check expiration
    now = datetime.now(timezone.utc)
    if dream.expires_at <= now:
        raise HTTPException(status_code=410, detail="Dream expired")

    # Public dreams are accessible to everyone, private dreams return 403
    if not dream.is_public:
        raise HTTPException(status_code=403, detail="This dream is private")

    # Increment view count
    dream.view_count += 1
    await db.commit()

    return dream


@router.delete("/{dream_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dream(
    dream_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete own dream"""

    result = await db.execute(select(Dream).where(Dream.id == dream_id))
    dream = result.scalar_one_or_none()

    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")

    if dream.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(dream)
    await db.commit()
