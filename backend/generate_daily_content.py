#!/usr/bin/env python3
"""
Daily cron job to generate demo dreams and moments
Schedule: 0 9 * * * (every day at 9:00 AM)
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import uuid

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Dream, Moment
from app.demo_generator import demo_generator
from app.ai_service import ai_service


async def get_or_create_system_user(db):
    """Get or create system user for demo content"""
    result = await db.execute(
        select(User).where(User.username == "DreamCapture_AI")
    )
    user = result.scalar_one_or_none()

    if not user:
        # Create user with pre-hashed password (bcrypt hash of "DemoAI_System_2025")
        # Generated with: python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('DemoAI'))"
        user = User(
            username="DreamCapture_AI",
            email="ai@dreamcapture.internal",
            hashed_password="$2b$12$KIX8YFO.OvUvN7tJQjB1b.5zxKvqEV9d.xGYzHZ3uZ8S7bK6YWEyC",  # "DemoAI"
            is_active=True,
            is_premium=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"✅ Created system user: {user.username} (ID: {user.id})")

    return user


async def generate_demo_dream(db, system_user):
    """Generate one demo dream"""
    try:
        # Generate dream content
        dream_data = await demo_generator.generate_dream()

        # Create dream
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=dream_data["ttl_days"])

        new_dream = Dream(
            user_id=system_user.id,
            title=dream_data["title"],
            description=dream_data["description"],
            is_public=True,
            is_visible=True,
            ttl_days=dream_data["ttl_days"],
            created_at=now,
            expires_at=expires_at,
        )

        db.add(new_dream)
        await db.commit()
        await db.refresh(new_dream)

        print(f"✅ Dream created: {new_dream.title} (ID: {new_dream.id})")

        # Generate AI analysis and image in background
        analysis = await ai_service.analyze_dream(new_dream.description)
        if analysis:
            new_dream.ai_analysis = analysis
            new_dream.ai_tags = analysis.get("tags", [])

            # Generate image
            visual_prompt = analysis.get("visual_prompt", new_dream.description[:500])
            image_url = await ai_service.generate_dream_image(visual_prompt, new_dream.title)

            if image_url:
                new_dream.generated_image_url = image_url

            await db.commit()
            print(f"   AI analysis & image: ✅")
        else:
            print(f"   AI analysis: ❌ (using fallback)")

        return True

    except Exception as e:
        print(f"❌ Failed to generate dream: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return False


async def generate_demo_moment(db, system_user):
    """Generate one demo moment with placeholder"""
    try:
        # Generate moment caption
        caption = await demo_generator.generate_moment_caption()

        # Use placeholder URL (moments need actual images, but for demo we'll use a placeholder path)
        placeholder_filename = f"demo_moment_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}.jpg"
        placeholder_url = f"/uploads/moments/{placeholder_filename}"

        # Note: In production, you should download and save actual images from Unsplash or generate them
        print(f"⚠️  Note: Moment will use placeholder image path: {placeholder_url}")
        print(f"   To make it visible, you need to provide actual images for moments.")

        # Create moment
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=86400)  # 24 hours

        new_moment = Moment(
            user_id=system_user.id,
            caption=caption,
            media_type="photo",
            media_url=placeholder_url,
            created_at=now,
            expires_at=expires_at,
            is_visible=True,
        )

        db.add(new_moment)
        await db.commit()
        await db.refresh(new_moment)

        print(f"✅ Moment created: {caption[:50]}... (ID: {new_moment.id})")

        # Generate AI tags
        tags = await ai_service.analyze_moment(caption, "photo")
        if tags:
            new_moment.ai_tags = tags
            await db.commit()

        return True

    except Exception as e:
        print(f"❌ Failed to generate moment: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return False


async def main():
    """Generate 2 dreams and 2 moments daily"""
    print(f"🌙 DreamCapture Daily Content Generation")
    print(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # Get or create system user
        system_user = await get_or_create_system_user(db)

        # Generate 2 dreams
        print("\n📖 Generating dreams...")
        dream_success = 0
        for i in range(2):
            print(f"\nDream {i+1}/2:")
            if await generate_demo_dream(db, system_user):
                dream_success += 1
            await asyncio.sleep(2)  # Small delay between generations

        # Skip moments for now (need actual images)
        print("\n\n📸 Skipping moments generation (need actual image sources)")
        print("   Moments require real images - configure image download first")
        moment_success = 0

    print("\n" + "=" * 60)
    print(f"✅ Daily generation complete!")
    print(f"   Dreams: {dream_success}/2")
    print(f"   Moments: {moment_success}/2 (skipped)")
    print(f"   Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    asyncio.run(main())
