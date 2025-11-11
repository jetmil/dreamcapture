# DreamCapture Modernization Roadmap
**Дата:** 2025-11-11
**Статус:** В процессе

---

## ✅ Выполнено

### 1. Авторизация JWT
- [x] Исправлен баг с передачей токена (напрямую в header, минуя interceptor)
- [x] Production build с правильной обработкой токенов
- [x] Zustand persist middleware из Magazine проекта

### 2. AI Models Fix
- [x] GPT-5-nano → gpt-4o-mini (GPT-5-nano возвращал empty response)
- [x] Добавлено debug логирование для AI ответов
- [x] Локальное сохранение DALL-E изображений (исправлена проблема истекающих URL)

### 3. Soft Delete & TTL System
- [x] Добавлены поля `is_visible` и `ttl_days` в базу данных
- [x] Dreams TTL: выбор 1, 7, или 30 дней
- [x] Moments TTL: изменено с 60 секунд на 24 часа
- [x] Expired контент скрывается (is_visible=false), НЕ удаляется
- [x] Обновлен cleanup_expired.py - soft delete вместо hard delete
- [x] Обновлены GET endpoints - показывают только is_visible=true

### 4. UI Improvements
- [x] Кнопка "Поделиться моментом" добавлена в header (рядом с "Поделиться сном")
- [x] Placeholder модальное окно для моментов (Coming soon)

---

## 🔄 В процессе

### 5. Frontend: TTL Selector для Dreams
**Задача:** Добавить выбор TTL при создании сна

**Файлы:**
- `/var/www/dreamcapture/frontend/components/CreateDreamModal.tsx`

**Реализация:**
```typescript
// Добавить radio buttons/dropdown:
// - 24 часа (по умолчанию)
// - 7 дней
// - 30 дней

const [ttlDays, setTtlDays] = useState(1);

// В handleSubmit:
await dreamsAPI.create({
  description,
  title,
  ttl_days: ttlDays,
  is_public: true
});
```

### 6. Auto-Generation System (Demo Content)
**Задача:** Генерировать примеры снов и моментов для новых пользователей

**Подзадачи:**
- [ ] Создать endpoint `/admin/generate-demo-content`
- [ ] Генерация 2 случайных снов через OpenAI
- [ ] Генерация 2 случайных моментов через OpenAI
- [ ] Scheduled task (cron) для поддержания минимума контента

**Детали реализации:**

#### 6.1 Backend: Demo Content Generator

**Файл:** `/var/www/dreamcapture/backend/app/demo_generator.py`
```python
"""Auto-generate demo dreams and moments"""

class DemoContentGenerator:
    async def generate_dream(self) -> dict:
        """Generate random dream using GPT-4o-mini"""
        prompt = """Generate a surreal dream scenario in Russian.
        Include:
        - Short title (2-4 words)
        - Description (50-150 words)
        - Must be family-friendly and poetic

        Return JSON:
        {
          "title": "...",
          "description": "..."
        }
        """
        # OpenAI call with json_object response

    async def generate_moment(self) -> dict:
        """Generate random moment caption"""
        prompt = """Generate a poetic moment caption in Russian.
        Theme: nature, city, emotions, or daily life.
        Length: 1-2 sentences.

        Return JSON:
        {"caption": "..."}
        """
        # OpenAI call
```

#### 6.2 Admin Endpoint

**Файл:** `/var/www/dreamcapture/backend/app/routers/admin.py`
```python
@router.post("/generate-demo-content")
async def generate_demo_content(
    count_dreams: int = 2,
    count_moments: int = 2,
    db: AsyncSession = Depends(get_db),
    # TODO: Add admin auth check
):
    """Generate demo content"""
    generator = DemoContentGenerator()

    # Create system user if not exists
    system_user = await get_or_create_system_user(db)

    # Generate dreams
    for _ in range(count_dreams):
        dream_data = await generator.generate_dream()
        # Create dream with system_user.id

    # Generate moments (with stock photos from Unsplash API)
    for _ in range(count_moments):
        moment_data = await generator.generate_moment()
        # Download random photo from Unsplash
        # Upload to /static/uploads/moments/
        # Create moment

    return {"created_dreams": count_dreams, "created_moments": count_moments}
```

#### 6.3 Cron Job для Auto-Generation

**Файл:** `/var/www/dreamcapture/backend/auto_generate_demo.py`
```python
"""
Cron job to maintain minimum demo content
Run: */30 * * * * (every 30 minutes)
"""

async def main():
    # Check count of visible public dreams
    dream_count = await get_visible_dreams_count()

    if dream_count < 5:
        # Generate 2 more dreams
        await generate_demo_content(count_dreams=2)

    # Same for moments
    moment_count = await get_visible_moments_count()

    if moment_count < 5:
        await generate_demo_content(count_moments=2)
```

**Добавить в crontab:**
```bash
*/30 * * * * cd /var/www/dreamcapture/backend && /home/jetmil/.local/bin/uv run python auto_generate_demo.py >> /var/www/dreamcapture/logs/demo-generation.log 2>&1
```

---

## 📋 Не начато

### 7. Dream Detail Page (Открытие карточек снов)
**Задача:** Сделать карточки снов кликабельными с переходом на детальную страницу

**Файлы:**
- `/var/www/dreamcapture/frontend/app/dreams/[id]/page.tsx` (создать)
- `/var/www/dreamcapture/frontend/components/DreamCard.tsx` (обновить)

**Реализация:**
```typescript
// DreamCard.tsx
<Link href={`/dreams/${dream.id}`}>
  <div className="cursor-pointer hover:scale-105 transition-transform">
    {/* Existing card content */}
  </div>
</Link>

// app/dreams/[id]/page.tsx
export default async function DreamDetailPage({ params }: { params: { id: string } }) {
  const dream = await dreamsAPI.getById(params.id);

  return (
    <div>
      {/* Full dream view with:
          - Large generated image
          - Full AI analysis (themes, emotions, symbols)
          - Share buttons
          - Resonance matches (future)
      */}
    </div>
  );
}
```

### 8. CreateMomentModal Component
**Задача:** Полноценный компонент создания моментов с загрузкой медиа

**Файл:** `/var/www/dreamcapture/frontend/components/CreateMomentModal.tsx`

**Features:**
- [ ] Upload photo/video (drag-and-drop + file picker)
- [ ] Preview uploaded media
- [ ] Caption input (optional, max 500 chars)
- [ ] Location picker (optional, использовать Geolocation API)
- [ ] Progress bar during upload
- [ ] Validation: max 10MB images, 50MB videos

**API Flow:**
1. Upload media → POST `/upload/moment-media` → get URL
2. Create moment → POST `/moments` with media_url, caption, location

### 9. Moments Feed Improvements
**Задача:** Улучшить отображение моментов

**Features:**
- [ ] Instagram-like stories UI (horizontal scroll на мобильных)
- [ ] Full-screen viewer для фото/видео
- [ ] Countdown timer (показывать сколько осталось до истечения)
- [ ] Auto-refresh каждые 30 секунд (WebSocket уже есть)

### 10. Resonance System
**Задача:** Автоматическое нахождение "резонансов" между снами и моментами

**Endpoints:**
```python
GET /resonances/my          # Мои найденные резонансы
GET /resonances/{id}        # Детали резонанса
POST /resonances/{id}/save  # Сохранить резонанс (premium)
```

**Frontend:**
- [ ] Страница `/resonances` с найденными совпадениями
- [ ] Notification badge при новом резонансе
- [ ] Кнопка "Найти резонансы" на странице сна

### 11. Premium Features
**Задача:** Монетизация

**Features:**
- [ ] Сохранение моментов навсегда (1 в день)
- [ ] Расширенная статистика (views, engagement)
- [ ] Приоритетная AI обработка (без очереди)
- [ ] Unlimited dreams (вместо 10 в день)
- [ ] Custom TTL (вместо фиксированных 1/7/30)

**Payment Integration:**
- [ ] Stripe или ЮKassa
- [ ] Подписка: 299₽/месяц или 2990₽/год

### 12. Mobile App (Future)
**Задача:** React Native приложение

**Priority Features:**
- [ ] Push notifications для резонансов
- [ ] Camera integration для моментов
- [ ] Voice recording для снов (Whisper API)
- [ ] Offline mode (PWA first)

---

## 🛠️ Technical Debt

### Priority 1 (Critical)
- [ ] Добавить Alembic для миграций БД
- [ ] Unit tests для AI service
- [ ] Integration tests для auth flow
- [ ] Error monitoring (Sentry)

### Priority 2 (Important)
- [ ] Rate limiting для всех endpoints (не только auth)
- [ ] CDN для uploaded images (Cloudflare R2)
- [ ] Database indexes optimization
- [ ] Redis caching для GET /dreams endpoint

### Priority 3 (Nice to have)
- [ ] GraphQL вместо REST (Apollo Server)
- [ ] WebSocket reconnection logic
- [ ] Progressive image loading (blur placeholder)
- [ ] Dark mode toggle

---

## 📊 Success Metrics

### Phase 1 (MVP - Current)
- [x] Working auth system
- [x] Dreams creation with AI analysis
- [x] Local image storage
- [ ] Demo content generation

### Phase 2 (Beta)
- [ ] 100+ generated demo dreams/moments
- [ ] Moments creation fully functional
- [ ] Dream detail pages
- [ ] Mobile-responsive UI

### Phase 3 (Launch)
- [ ] Resonance system working
- [ ] Premium subscriptions
- [ ] 1000+ organic users
- [ ] <200ms API response time

---

## 🚀 Deployment Checklist

**Before Production:**
- [ ] Environment variables review (remove DEBUG flags)
- [ ] HTTPS only (HSTS headers)
- [ ] Database backups (automated daily)
- [ ] PM2 log rotation configured
- [ ] Monitoring dashboard (Grafana?)
- [ ] Incident response plan

**DNS:**
- [x] dreamnow.ligardi.ru → 37.79.241.86
- [x] SSL certificate (Let's Encrypt)
- [x] Nginx reverse proxy configured

---

## 📝 Notes

### Why gpt-4o-mini instead of gpt-5-nano?
- GPT-5-nano API key compatibility issue (returns empty response)
- GPT-4o-mini proven to work reliably
- Cost-effective for demo generation
- Can revisit GPT-5-nano when API access confirmed

### Why 24h for moments instead of 60s?
- User request for more persistent content
- Allows for better resonance detection
- Still ephemeral enough to feel "in the moment"
- Can adjust based on user feedback

### Why soft delete instead of hard delete?
- Analytics retention
- Possible "archive" feature for premium users
- Legal compliance (audit trail)
- Can implement "restore" functionality later

---

**Следующий шаг:** Начать с пункта #5 (TTL Selector) и #6 (Auto-Generation)
