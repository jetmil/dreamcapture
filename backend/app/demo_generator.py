"""Auto-generate demo dreams and moments for public feed"""
from typing import Dict, Any
import json
from openai import AsyncOpenAI
from app.config import settings


class DemoContentGenerator:
    def __init__(self):
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_dream(self) -> Dict[str, Any]:
        """
        Generate random surreal dream scenario in Russian
        Returns: {"title": str, "description": str, "ttl_days": int}
        """
        if not self.openai_client:
            return self._mock_dream()

        prompt = """Создай сюрреалистичный сон на русском языке.

Требования:
- Заголовок: 2-4 слова, поэтичный и загадочный
- Описание: 80-200 слов, яркий и образный
- Тематика: природа, космос, путешествия, превращения, полёты, мистика
- Стиль: позитивный или нейтральный, без ужасов и насилия
- Семейный контент (family-friendly)

Верни JSON:
{
  "title": "...",
  "description": "..."
}"""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "dream_generation",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["title", "description"],
                            "additionalProperties": False
                        }
                    }
                },
                max_completion_tokens=512,
            )

            content = response.choices[0].message.content
            if not content:
                return self._mock_dream()

            result = json.loads(content)
            
            # Random TTL: 1, 7, or 30 days
            import random
            ttl_days = random.choice([1, 7, 30])
            result["ttl_days"] = ttl_days

            print(f"✅ Generated dream: {result['title'][:30]}... (TTL: {ttl_days}d)")
            return result

        except Exception as e:
            print(f"❌ Dream generation error: {e}")
            return self._mock_dream()

    async def generate_moment_caption(self) -> str:
        """
        Generate poetic moment caption in Russian
        Returns: caption string
        """
        if not self.openai_client:
            return self._mock_moment_caption()

        prompt = """Создай поэтичную подпись для момента на русском языке.

Темы: природа, город, эмоции, повседневная жизнь, философия, красота мгновения

Длина: 1-2 предложения (20-80 слов)
Стиль: вдохновляющий, созерцательный, лирический
Семейный контент (family-friendly)

Верни только текст подписи, без кавычек."""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=128,
            )

            content = response.choices[0].message.content
            if not content:
                return self._mock_moment_caption()

            caption = content.strip().strip('"').strip("'")
            print(f"✅ Generated moment caption: {caption[:50]}...")
            return caption

        except Exception as e:
            print(f"❌ Moment caption generation error: {e}")
            return self._mock_moment_caption()

    def _mock_dream(self) -> Dict[str, Any]:
        """Fallback dream when AI unavailable"""
        import random
        
        dreams = [
            {
                "title": "Танец звёзд",
                "description": "Я стоял на краю вселенной, где звёзды танцевали вальс. Каждое созвездие пело свою мелодию, а млечный путь превратился в реку света, по которой плыли корабли из детских мечтаний.",
                "ttl_days": 7
            },
            {
                "title": "Сад времени",
                "description": "В саду росли деревья, на которых вместо листьев были воспоминания. Я гулял по тропинкам, собирая моменты прошлого как спелые плоды. Некоторые были сладкими, другие горькими, но все драгоценными.",
                "ttl_days": 1
            },
            {
                "title": "Летающий город",
                "description": "Город поднялся в небо на рассвете. Здания превратились в облака, улицы стали потоками ветра. Люди учились летать, держась за нити света, протянутые между небоскрёбами.",
                "ttl_days": 30
            }
        ]
        
        return random.choice(dreams)

    def _mock_moment_caption(self) -> str:
        """Fallback moment caption when AI unavailable"""
        import random
        
        captions = [
            "Мгновение тишины в шуме дня. Когда время останавливается, чтобы мы могли услышать себя.",
            "Свет пробивается сквозь облака, напоминая: после каждой бури приходит солнце.",
            "В простых вещах скрыта вся красота мира. Нужно лишь научиться её замечать.",
            "Каждый момент — это подарок. Именно поэтому настоящее называется present.",
            "Между вдохом и выдохом существует целая вечность. Сейчас — единственное время, которое у нас есть.",
        ]
        
        return random.choice(captions)


# Singleton instance
demo_generator = DemoContentGenerator()
