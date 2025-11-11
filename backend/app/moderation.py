"""Content moderation using OpenAI Moderation API"""
from typing import Dict, Any
from openai import AsyncOpenAI
from app.config import settings


class ContentModerator:
    def __init__(self):
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def check_text(self, text: str) -> Dict[str, Any]:
        """
        Check text for inappropriate content using OpenAI Moderation API
        Returns: {
            "flagged": bool,
            "categories": {category: bool},
            "category_scores": {category: float}
        }
        """
        if not self.openai_client or not text:
            return {"flagged": False, "categories": {}, "category_scores": {}}

        try:
            response = await self.openai_client.moderations.create(input=text)
            result = response.results[0]

            return {
                "flagged": result.flagged,
                "categories": result.categories.model_dump(),
                "category_scores": result.category_scores.model_dump(),
            }

        except Exception as e:
            print(f"❌ Moderation API error: {e}")
            # Fail open - don't block content on API errors
            return {"flagged": False, "categories": {}, "category_scores": {}}

    async def is_safe(self, text: str) -> bool:
        """
        Quick check if text is safe to publish
        Returns True if safe, False if flagged
        """
        result = await self.check_text(text)
        return not result["flagged"]

    def get_violation_message(self, moderation_result: Dict[str, Any]) -> str:
        """Generate user-friendly error message based on flagged categories"""
        if not moderation_result.get("flagged"):
            return ""

        categories = moderation_result.get("categories", {})
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]

        category_messages = {
            "sexual": "сексуального содержания",
            "sexual/minors": "материалов с участием несовершеннолетних",
            "hate": "языка ненависти",
            "hate/threatening": "угроз и насилия",
            "harassment": "домогательств или издевательств",
            "harassment/threatening": "угроз и запугивания",
            "self-harm": "контента, пропагандирующего членовредительство",
            "self-harm/intent": "намерений причинить себе вред",
            "self-harm/instructions": "инструкций по самоповреждению",
            "violence": "насилия",
            "violence/graphic": "графического насилия",
            "illicit": "незаконной деятельности",
            "illicit/violent": "насильственных преступлений",
        }

        violations = [category_messages.get(cat, cat) for cat in flagged_categories]

        if len(violations) == 1:
            return f"Контент содержит запрещённые материалы: {violations[0]}"
        else:
            return f"Контент содержит запрещённые материалы: {', '.join(violations)}"


# Singleton instance
content_moderator = ContentModerator()
