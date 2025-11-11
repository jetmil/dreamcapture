"""AI Service for dream analysis and image generation"""
from typing import Dict, List, Optional, Any
import json
import httpx
from pathlib import Path
from datetime import datetime
import uuid
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from app.config import settings


class AIService:
    def __init__(self):
        self.anthropic_client = None
        self.openai_client = None

        if settings.ENABLE_AI_FEATURES:
            if settings.ANTHROPIC_API_KEY:
                self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            if settings.OPENAI_API_KEY:
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def analyze_dream(self, dream_description: str) -> Dict[str, Any]:
        """
        Analyze dream using GPT to extract themes, emotions, symbols
        Returns: {themes: [], emotions: [], symbols: [], narrative: str, tags: []}
        """
        if not self.openai_client:
            return self._mock_dream_analysis(dream_description)

        prompt = f"""Ты - современный толкователь снов для развлекательного сервиса. Твоя задача - дать ИНТЕРЕСНОЕ и ПОНЯТНОЕ толкование на русском языке, которое вдохновит человека задуматься о своём сне. Пиши живым, образным языком!

СОН: {dream_description}

Верни анализ в JSON:
{{
  "themes": ["тема1", "тема2", "тема3"],
  "emotions": ["эмоция1", "эмоция2", "эмоция3"],
  "symbols": ["символ1", "символ2", "символ3", "символ4"],
  "narrative": "интересное толкование сна (2-3 предложения)",
  "tags": ["тег1", "тег2", "тег3", "тег4", "тег5"],
  "visual_prompt": "описание для DALL-E на английском"
}}

**themes** (3 темы - ПОНЯТНЫЕ обычному человеку):
- Не академические термины! Пиши просто и интересно
- Что РЕАЛЬНО происходит в сне с психологической точки зрения?
Примеры: "поиск своего пути", "встреча с прошлым", "внутренняя свобода", "мудрость жизни", "преодоление страхов"

**emotions** (3 эмоции - ЯРКИЕ, но понятные):
- Пиши красиво, но не заумно
- Какие чувства несёт этот сон?
Примеры: "тихая грусть", "светлая надежда", "тревожное ожидание", "радостное открытие", "мистическое волнение", "спокойная уверенность"

**symbols** (4-5 главных символов из сна):
- Возьми КОНКРЕТНЫЕ образы из сна
- Объясни их значение ПРОСТО и ИНТЕРЕСНО
Примеры: "старик - символ мудрости", "дорога - жизненный путь", "вода - поток времени", "дом - внутренний мир"

**narrative** (2-3 предложения - пиши ЖИВО и КРАСИВО):
- Расскажи, что сон ГОВОРИТ человеку
- Какой смысл он несёт для его жизни?
- Пиши как мудрый друг, а не как учебник психологии!
Пример: "Этот сон - знак, что вы стоите на пороге важных перемен. Старые страхи отступают, освобождая место для новых открытий и смелых шагов в будущее."

**tags** (5 тегов для поиска):
Примеры: "мудрость", "жизненный путь", "внутренние перемены", "символы судьбы", "поиск себя"

**visual_prompt** (НА АНГЛИЙСКОМ для DALL-E 3):
КРИТИЧЕСКИ ВАЖНО:
- БЕЗ насилия, крови, смерти, мрачных образов!
- БЕЗ слов: dark, gloomy, death, blood, violence, suffering, pain
- ТОЛЬКО позитивные/нейтральные/мистические образы
- Стиль: dreamy, surreal, magical, ethereal, mystical
- Атмосфера: soft light, gentle colors, peaceful, serene
Пример: "A wise old traveler walking through a mystical landscape with soft moonlight, ethereal atmosphere, dreamlike surrealism in the style of Marc Chagall, peaceful and contemplative mood"""

        try:
            # GPT-5-nano uses Structured Outputs (JSON Schema), not json_object
            response = await self.openai_client.chat.completions.create(
                model=settings.DREAM_ANALYSIS_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "dream_analysis",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "themes": {"type": "array", "items": {"type": "string"}},
                                "emotions": {"type": "array", "items": {"type": "string"}},
                                "symbols": {"type": "array", "items": {"type": "string"}},
                                "narrative": {"type": "string"},
                                "tags": {"type": "array", "items": {"type": "string"}},
                                "visual_prompt": {"type": "string"}
                            },
                            "required": ["themes", "emotions", "symbols", "narrative", "tags", "visual_prompt"],
                            "additionalProperties": False
                        }
                    }
                },
                max_completion_tokens=1024,
            )

            content = response.choices[0].message.content

            # Debug: log the raw response
            print(f"🔍 GPT-5-nano raw response: {content[:200] if content else 'EMPTY/NONE'}")

            if not content:
                print("❌ GPT-5-nano returned empty response, using fallback")
                return self._mock_dream_analysis(dream_description)

            analysis = json.loads(content)
            print(f"✅ GPT-5-nano analysis successful: {len(analysis)} keys")
            return analysis

        except json.JSONDecodeError as e:
            print(f"❌ Dream analysis JSON error: {e}")
            print(f"   Raw content: {content[:500] if content else 'NONE'}")
            return self._mock_dream_analysis(dream_description)
        except Exception as e:
            print(f"❌ Dream analysis error: {e}")
            return self._mock_dream_analysis(dream_description)

    async def generate_dream_image(self, visual_prompt: str, dream_title: Optional[str] = None) -> Optional[str]:
        """
        Generate dream visualization using DALL-E 3
        Returns: image URL or None
        """
        if not self.openai_client:
            return None

        try:
            # Enhance prompt for dreamlike aesthetic
            enhanced_prompt = f"Dreamlike surreal artwork: {visual_prompt}. Ethereal, soft focus, mystical atmosphere, artistic interpretation."

            if dream_title:
                enhanced_prompt = f"{dream_title} - {enhanced_prompt}"

            response = await self.openai_client.images.generate(
                model=settings.IMAGE_GENERATION_MODEL,
                prompt=enhanced_prompt[:4000],  # DALL-E limit
                size="1024x1024",  # Smallest available size for DALL-E 3
                quality="standard",  # Most economical quality
                n=1,
            )

            temp_url = response.data[0].url

            # Download and save image locally (OpenAI URLs expire after 2 hours)
            local_url = await self._download_and_save_image(temp_url)
            return local_url if local_url else temp_url

        except Exception as e:
            print(f"Image generation error: {e}")
            return None

    async def _download_and_save_image(self, image_url: str) -> Optional[str]:
        """Download OpenAI generated image and save locally"""
        try:
            # Create upload directory
            upload_dir = Path("/var/www/dreamcapture/backend/static/uploads/dreams")
            upload_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"dream_{timestamp}_{unique_id}.png"
            file_path = upload_dir / filename

            # Download image
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()

                # Save to file
                with open(file_path, "wb") as f:
                    f.write(response.content)

            # Return local URL path
            local_url = f"/uploads/dreams/{filename}"
            print(f"✅ Image saved locally: {local_url}")
            return local_url

        except Exception as e:
            print(f"❌ Failed to download image: {e}")
            return None

    async def analyze_moment(self, caption: Optional[str], media_type: str) -> List[str]:
        """
        Quick tag extraction for moments (lightweight, fast)
        Returns: list of tags
        """
        if not caption:
            return [media_type, "moment", "now"]

        # For now, simple keyword extraction
        # In production, use Claude or lightweight model
        words = caption.lower().split()
        tags = [w for w in words if len(w) > 3][:5]
        tags.append(media_type)
        tags.append("moment")

        return tags

    async def calculate_resonance(
        self,
        dream_analysis: Dict[str, Any],
        moment_tags: List[str],
        moment_caption: Optional[str]
    ) -> Dict[str, Any]:
        """
        Calculate resonance between dream and moment
        Returns: {score: 0-100, explanation: str}
        """
        if not self.openai_client:
            return self._mock_resonance(dream_analysis, moment_tags)

        dream_tags = dream_analysis.get("tags", [])
        dream_themes = dream_analysis.get("themes", [])
        dream_emotions = dream_analysis.get("emotions", [])

        # Simple overlap scoring
        common_tags = set(dream_tags) & set(moment_tags)
        score = len(common_tags) * 20

        # Ask GPT for deeper analysis if initial score > 20
        if score > 20 and moment_caption:
            prompt = f"""Analyze resonance between a dream and a moment:

Dream themes: {', '.join(dream_themes)}
Dream emotions: {', '.join(dream_emotions)}
Dream tags: {', '.join(dream_tags)}

Moment caption: {moment_caption}
Moment tags: {', '.join(moment_tags)}

Provide JSON:
{{
  "score": 0-100,
  "explanation": "poetic one-sentence explanation of connection"
}}"""

            try:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Fast model
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_completion_tokens=256,
                )

                content = response.choices[0].message.content
                result = json.loads(content)
                return result

            except Exception as e:
                print(f"Resonance calculation error: {e}")

        return {
            "score": min(score, 100),
            "explanation": f"Shared elements: {', '.join(common_tags)}" if common_tags else "Subtle connection"
        }

    def _mock_dream_analysis(self, description: str) -> Dict[str, Any]:
        """Fallback when AI is disabled"""
        words = description.lower().split()
        tags = [w for w in words if len(w) > 4][:5]

        return {
            "themes": ["journey", "transformation"],
            "emotions": ["curiosity", "wonder"],
            "symbols": tags[:3] if tags else ["dream", "night", "mystery"],
            "narrative": description[:100] + "..." if len(description) > 100 else description,
            "tags": tags if tags else ["dream", "sleep", "night"],
            "visual_prompt": description[:200]
        }

    def _mock_resonance(self, dream_analysis: Dict, moment_tags: List[str]) -> Dict[str, Any]:
        """Fallback resonance calculation"""
        dream_tags = set(dream_analysis.get("tags", []))
        common = dream_tags & set(moment_tags)

        return {
            "score": len(common) * 25,
            "explanation": "Subtle resonance detected"
        }


# Singleton instance
ai_service = AIService()
