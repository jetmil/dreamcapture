"""
Cleanup expired dreams and moments
Run this script periodically (cron job) to remove expired content
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete
from datetime import datetime, timezone
import logging

from app.config import settings
from app.models import Dream, Moment

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def cleanup_expired_content():
    """Hide expired dreams and moments (soft delete)"""
    async with AsyncSessionLocal() as session:
        now = datetime.now(timezone.utc)

        try:
            # Hide expired moments (24 hours TTL)
            result = await session.execute(
                select(Moment).where(
                    Moment.expires_at <= now,
                    Moment.is_visible == True
                )
            )
            expired_moments = result.scalars().all()
            for moment in expired_moments:
                moment.is_visible = False
            hidden_moments = len(expired_moments)

            # Hide expired dreams (variable TTL)
            result = await session.execute(
                select(Dream).where(
                    Dream.expires_at <= now,
                    Dream.is_visible == True
                )
            )
            expired_dreams = result.scalars().all()
            for dream in expired_dreams:
                dream.is_visible = False
            hidden_dreams = len(expired_dreams)

            await session.commit()

            logger.info(f"Cleanup complete: {hidden_moments} moments, {hidden_dreams} dreams hidden")

            return {
                "hidden_moments": hidden_moments,
                "hidden_dreams": hidden_dreams,
                "timestamp": now.isoformat()
            }

        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            await session.rollback()
            raise


async def main():
    """Main cleanup function"""
    logger.info("Starting expired content cleanup...")
    result = await cleanup_expired_content()
    logger.info(f"Cleanup result: {result}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
