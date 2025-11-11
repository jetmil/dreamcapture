# 🌙 DreamCapture (МирСнов)

**Эфемерная платформа для снов и моментов**
Где сны становятся моментами, а моменты отражают сны.

---

## 📖 Концепция

DreamCapture — это уникальная социальная платформа, объединяющая:
- **Dreams** (Сны) — хранятся 24 часа, анализируются AI, генерируются визуализации
- **Moments** (Моменты) — эфемерный контент (60 секунд), фото/видео real-time
- **Resonances** (Резонансы) — магические связи между снами и моментами

---

## 🏗️ Архитектура

### Backend (FastAPI + Python)
- **Framework**: FastAPI (async/await)
- **Database**: PostgreSQL (async SQLAlchemy)
- **Cache/Streaming**: Redis (pub/sub для WebSocket)
- **AI**: OpenAI GPT-5-nano (анализ снов), DALL-E 3 (генерация изображений)
- **Auth**: JWT tokens (bcrypt, brute-force protection)

### Frontend (Next.js 15 + React 19)
- **Framework**: Next.js 15 (App Router)
- **State**: Zustand (persist middleware для auth)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Real-time**: WebSocket + Server-Sent Events

---

## 🚀 Установка и запуск

### Backend

```bash
cd /var/www/dreamcapture/backend

# Установка зависимостей (uv)
/home/jetmil/.local/bin/uv sync

# Настройка .env
cp .env.example .env
# Отредактировать: DATABASE_URL, REDIS_URL, OPENAI_API_KEY, SECRET_KEY

# Запуск (PM2)
pm2 start ecosystem.config.js --only dreamnow-backend
```

### Frontend

```bash
cd /var/www/dreamcapture/frontend

# Установка зависимостей
pnpm install

# Запуск (PM2)
pm2 start ecosystem.config.js --only dreamnow-frontend
```

---

## 🗄️ База данных

### Схема

**users**
- id (UUID)
- username, email (unique)
- hashed_password
- is_active, is_premium
- failed_login_attempts, locked_until (brute-force protection)

**dreams**
- id (UUID), user_id (FK)
- title, description
- audio_url (опционально)
- ai_analysis (JSON: themes, emotions, symbols, narrative, visual_prompt)
- ai_tags (JSON array)
- generated_image_url (DALL-E 3)
- expires_at (24 hours TTL)
- is_public, view_count

**moments**
- id (UUID), user_id (FK)
- caption, media_type (photo/video)
- media_url
- location (JSON: lat, lon, name)
- ai_tags (JSON array)
- expires_at (60 seconds TTL)
- view_count

**resonances**
- id (UUID), user_id, dream_id, moment_id
- resonance_score (0-100)
- resonance_explanation (AI-generated)
- is_saved (premium feature)

### Миграции

```bash
cd /var/www/dreamcapture/backend
/home/jetmil/.local/bin/uv run alembic upgrade head
```

---

## 🔐 Аутентификация

### Механика (аналогична Magazine)

1. **Zustand persist middleware** — автоматическое сохранение auth state
2. **localStorage['auth-storage']** — хранение токена
3. **Axios interceptor** — автоматическая подстановка Bearer token
4. **Brute-force protection**:
   - 5 неудачных попыток → блокировка на 15 минут
   - Atomic counter для race conditions
   - Email normalization (lowercase, trim)

### Endpoints

```
POST /auth/register — Регистрация
POST /auth/login    — Вход (возвращает access_token)
GET  /auth/me       — Текущий пользователь (требует auth)
```

---

## 🎨 API Endpoints

### Dreams

```
POST /dreams              — Создать сон (требует auth)
GET  /dreams              — Список публичных снов (не требует auth)
GET  /dreams/my           — Мои сны (требует auth)
GET  /dreams/{id}         — Конкретный сон
DELETE /dreams/{id}       — Удалить сон (требует auth)
```

### Moments

```
POST /moments             — Создать момент (требует auth)
GET  /moments             — Список live моментов (не требует auth)
GET  /moments/{id}        — Конкретный момент (требует auth)
```

### Upload

```
POST /upload/moment-media — Загрузка фото/видео для момента (требует auth)
  - Allowed images: .jpg, .jpeg, .png, .gif, .webp (max 10MB)
  - Allowed videos: .mp4, .webm, .mov (max 50MB)
  - Returns: { url, media_type, filename }
```

---

## 🤖 AI Features

### Dream Analysis (OpenAI GPT-5-nano)

```json
{
  "themes": ["journey", "transformation"],
  "emotions": ["curiosity", "wonder"],
  "symbols": ["видел", "летал", "городом"],
  "narrative": "Короткое описание сюжета сна",
  "tags": ["видел", "летал", "город"],
  "visual_prompt": "Детальное описание для DALL-E 3"
}
```

### Image Generation (DALL-E 3)

- Автоматическая генерация визуализации сна
- Основано на visual_prompt из AI анализа
- Ethereal, dreamlike aesthetic

### Resonance Calculation

- Анализ совпадений между тегами сна и момента
- Глубокий анализ через GPT-4o-mini (если score > 20)
- Возвращает score (0-100) и поэтичное объяснение

---

## 🔄 Real-time Features

### WebSocket Stream

```javascript
const ws = new WebSocket('ws://192.168.0.95:8200/ws/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { type: 'new_moment', moment_id: '...' }
};
```

### Redis Pub/Sub

Backend публикует события:
- `moments_stream` — новые моменты
- Подписчики: WebSocket connections

---

## ⏰ Автоматическая очистка

### Cron Job (каждые 5 минут)

```bash
*/5 * * * * cd /var/www/dreamcapture/backend && /home/jetmil/.local/bin/uv run python cleanup_expired.py >> /var/www/dreamcapture/logs/cleanup.log 2>&1
```

Удаляет:
- Моменты с `expires_at <= NOW()` (60 секунд TTL)
- Сны с `expires_at <= NOW()` (24 часа TTL)

---

## 🎭 Frontend Features

### Компоненты

- **AuthModal** — Вход/Регистрация с валидацией
- **CreateDreamModal** — Создание сна (текст или голос)
- **CreateMomentModal** — Создание момента (загрузка медиа + location)
- **DreamCard** — Карточка сна (AI анализ, изображение, теги)
- **MomentCard** — Карточка момента (медиа, таймер истечения)

### Анимации (Framer Motion)

- Floating background gradients
- Stagger animations для списков
- Smooth transitions между страницами

---

## 📊 Лимиты

### Free Users

- **Dreams**: 10 снов в день
- **Moments**: 20 моментов в час
- **Storage**: Эфемерное (автоматическое удаление)

### Premium Users (future)

- **Saved Content**: 1 момент в день (навсегда)
- **Unlimited Dreams**: без лимитов
- **Priority AI**: быстрая обработка

---

## 🔧 Конфигурация

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dreamcapture_db

# Redis
REDIS_URL=redis://host:6380/2

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# Server
HOST=192.168.0.95
PORT=8200
DEBUG=false
CORS_ORIGINS=["http://localhost:3060","https://dreamnow.ligardi.ru"]

# TTL Settings
DREAM_TTL_SECONDS=86400   # 24 hours
MOMENT_TTL_SECONDS=60     # 60 seconds

# Limits
MAX_DREAMS_PER_DAY=10
MAX_MOMENTS_PER_HOUR=20

# AI
DREAM_ANALYSIS_MODEL=gpt-5-nano
IMAGE_GENERATION_MODEL=dall-e-3
ENABLE_AI_FEATURES=true
```

### PM2 Ecosystem

```javascript
{
  name: "dreamnow-backend",
  script: "/home/jetmil/.local/bin/uv",
  args: "run fastapi dev app/main.py --host 192.168.0.95 --port 8200",
  cwd: "/var/www/dreamcapture/backend",
  instances: 1,
  exec_mode: "fork"
},
{
  name: "dreamnow-frontend",
  script: "pnpm",
  args: "dev --port 3060",
  cwd: "/var/www/dreamcapture/frontend",
  instances: 1,
  exec_mode: "fork"
}
```

---

## 🌐 Deployment

### Production URLs

- **Frontend**: https://dreamnow.ligardi.ru
- **Backend API**: https://dreamnow.ligardi.ru/api
- **Docs**: https://dreamnow.ligardi.ru/api/docs

### NGINX Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name dreamnow.ligardi.ru;

    ssl_certificate /etc/letsencrypt/live/dreamnow.ligardi.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dreamnow.ligardi.ru/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://192.168.0.95:3060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://192.168.0.95:8200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://192.168.0.95:8200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Uploads
    location /uploads {
        proxy_pass http://192.168.0.95:8200;
    }
}
```

---

## 🐛 Troubleshooting

### Backend не запускается

```bash
pm2 logs dreamnow-backend --lines 50
# Проверить .env, DATABASE_URL, Redis connection
```

### Frontend 401 Unauthorized

```bash
# Очистить localStorage
localStorage.removeItem('auth-storage')
# Проверить axios interceptor читает токен из auth-storage
```

### Expired контент не удаляется

```bash
# Проверить cron job
crontab -l | grep cleanup
# Логи
tail -f /var/www/dreamcapture/logs/cleanup.log
```

---

## 📝 TODO

- [ ] Frontend: CreateMomentModal с загрузкой медиа
- [ ] Premium features (save moments)
- [ ] Resonance detection algorithm
- [ ] Push notifications для resonances
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard

---

## 👥 Contributors

- **Architecture & Backend**: Claude Code Assistant
- **Concept**: DreamMarket + Moment Capture fusion
- **Inspiration**: Magazine project (auth system), Manara (real-time features)

---

## 📄 License

MIT License — используйте свободно, но с указанием авторства.

---

**Создано с ❤️ и помощью Claude Code**
https://dreamnow.ligardi.ru
