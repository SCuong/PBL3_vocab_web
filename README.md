<p align="center">
  <img src="frontend/public/logo.png" alt="VocabLearning Logo" width="140" />
</p>

<h1 align="center">VocabLearning</h1>

<p align="center">
  <strong>An English vocabulary learning platform — helping learners master words effectively</strong>
</p>

<p align="center">
  <img alt=".NET" src="https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" />
  <img alt="SQL Server" src="https://img.shields.io/badge/SQL%20Server-2022-CC2927?logo=microsoftsqlserver" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker" />
</p>

---

## Introduction

**VocabLearning** is a full-stack English vocabulary learning platform developed as a PBL3 graduation project.  
The system is designed to help learners build, review, and retain English vocabulary efficiently through structured learning paths, interactive exercises, and progress tracking.

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Features](#-features)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Database Design](#-database-design)
6. [API Structure](#-api-structure)
7. [Folder Structure](#-folder-structure)
8. [Installation Guide](#-installation-guide)
9. [Docker Setup](#-docker-setup)
10. [Security Design](#-security-design)
11. [Challenges & Solutions](#-challenges--solutions)
12. [Future Improvements](#-future-improvements)
13. [Screenshots](#-screenshots)
14. [Contributing](#-contributing)
15. [License](#-license)
16. [Author](#-author)

---

## 🎯 Project Overview

VocabLearning is a multi-role web application that helps learners build English vocabulary through structured study sessions, spaced repetition, and interactive exercises. The system distinguishes between **Learner** and **Admin** roles, each with a dedicated workflow.

**What makes this architecture stand out:**

- **Dependency Inversion throughout** — all 8 service classes are accessed only through interfaces (`IVocabularyService`, `ILearningService`, etc.), making the system testable and decoupled.
- **Hybrid rendering** — Admin and auth pages use Razor MVC (server-rendered for security); the learner dashboard is a React 19 SPA (client-rendered for interactivity). Both coexist in one backend.
- **Spaced repetition (SM-2)** implemented at the data layer — `Progress` table tracks `EaseFactor`, `IntervalDays`, `Repetitions`, and `NextReviewDate` per user per word.
- **Cookie-based auth** (not JWT) with PBKDF2-SHA256 at 120,000 iterations — stronger than ASP.NET Identity's default. Legacy Identity hashes auto-migrate on login.
- **AI vocabulary explanation** powered by Google Gemini, injected via `IAIService` interface — optional and gracefully degraded when unconfigured.

---

## ✨ Features

### 🎓 Learner

| Feature | Details |
|---|---|
| Authentication | Register, login/logout, Google OAuth, forgot/reset password |
| Vocabulary browsing | Paginated word list with CEFR level filter, topic filter, full-text search |
| Word detail | IPA, English–Vietnamese meaning, example sentences, audio pronunciation |
| Topic-based study | Structured study sessions per topic with progress tracking |
| Learning flow | StudySession → MatchingGame → Minitest — guided study path per topic |
| Spaced repetition | SM-2 algorithm schedules review intervals per word per user |
| Word notebook | Save words with custom personal notes |
| Progress tracking | Daily learning log, words-learned count, streak display |
| Mini test | Multiple-choice assessment after each study batch |
| Exercise review | Review all answers after minitest submission |
| Leaderboard | Rank learners by learning activity |
| AI explanation | Gemini-powered vocabulary explanation in context |
| Account management | Update profile, change password, delete account |

### 🛠️ Admin

| Feature | Details |
|---|---|
| Vocabulary management | Full CRUD — word, IPA, CEFR level, audio URL, examples |
| Topic management | Hierarchical topics (parent/child), full CRUD |
| User management | View all users, create new admin, block/unblock/delete learner |
| Exercise management | Create and manage exercise items per vocabulary |
| Learning analytics | Filtered overview of user activity by user, topic, date range |
| Admin dashboard | Aggregated stats across users and content |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                     │
│  React SPA (Vite)              Razor Views              │
│  /learning-*, /vocab*, /       /admin/*, /account/*     │
└────────────────┬────────────────────────┬───────────────┘
                 │  HTTP / JSON           │  HTML / Form POST
                 ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 3000)                    │
│         Reverse proxy: /api/* → backend:5152            │
│         Static files: React build assets                │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              ASP.NET Core 10 (Port 5152)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Middleware Pipeline                │    │
│  │  GlobalExceptionHandler → RequestLogging →      │    │
│  │  CORS → Authentication → Authorization          │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │                                │
│  ┌─────────┐   ┌───────┴──────┐   ┌───────────────┐     │
│  │   MVC   │   │  API Routes  │   │  Static Files │     │
│  │(Razor)  │   │  /api/...    │   │  /avatars/*   │     │
│  └────┬────┘   └──────┬───────┘   └───────────────┘     │
│       │               │                                 │
│  ┌────▼───────────────▼──────────────────────────────┐  │
│  │           Service Layer (via interfaces)          │  │
│  │  ICustomAuthenticationService  IVocabularyService │  │
│  │  ILearningService  ILearningFlowService           │  │
│  │  IAdminDataService  IAdminExerciseService         │  │
│  │  IAIService  IPasswordResetEmailService           │  │
│  └─────────────────────────┬─────────────────────────┘  │
│                            │                            │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │       AppDbContext (Entity Framework Core 10)      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│             SQL Server 2022 Express (Port 1433)         │
│           Persistent volume: sqlserver_data             │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**Hybrid rendering strategy** — Admin and auth pages are server-rendered Razor MVC. This eliminates exposing admin APIs over the network, reduces attack surface, and allows CSRF tokens to be embedded in forms. The learner dashboard is a React SPA because it requires rich interactivity.

**Dependency Inversion throughout** — Every service has a corresponding interface. Controllers never reference concrete classes. This enables unit testing with mocked dependencies and lets any service be swapped without controller changes.

**No repository pattern** — Services call `AppDbContext` directly. EF Core provides the unit-of-work pattern; adding a repository layer at this project scope would be abstraction for abstraction's sake.

**Dual routing systems** — API endpoints use attribute routing (`[HttpPost("/api/auth/login")]`). MVC pages use convention routing. API routes are stable and decoupled from admin URL changes.

---

## 🛠 Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| ASP.NET Core MVC | .NET 10 | Web framework — API + server-rendered pages |
| Entity Framework Core | 10.0.5 | ORM with Fluent API configuration |
| SQL Server | 2022 Express | Relational database |
| PBKDF2-SHA256 | 120,000 iterations | Password hashing (custom, not ASP.NET Identity) |
| Google OAuth 2.0 | AspNetCore.Authentication.Google 10.0.5 | Social login |
| Google Gemini | REST API via `HttpClient` | AI vocabulary explanation |
| SMTP (Gmail) | `System.Net.Mail` | Password reset email delivery |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI library |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool + dev server |
| Tailwind CSS | 4.1 | Utility-first styling |
| React Router | v6 | Client-side routing |
| Lucide React | 0.546 | Icon system |
| Motion | 12.23 | Animations |
| Canvas Confetti | 1.9 | Minitest completion celebration |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy + React static file server |
| Docker volumes | Persist SQL Server data and user avatars |

---

## 🗄 Database Design

### Schema Overview

```
users ──────────────────────────────────────────┐
  │                                               │
  ├──< user_vocabulary >── vocabulary ──< example │
  │                             │                 │
  ├──< progress ────────────────┘                 │
  │                                               │
  ├──< learning_log                               │
  │                                               │
  ├──< exercise_session                           │
  │         │                                     │
  └──< exercise_result >── exercise ──────────────┘
                                │
                           vocabulary
                                │
                             topic ──< topic (self-ref hierarchy)
```

### Core Tables

| Table | Primary Key | Description |
|---|---|---|
| `users` | `user_id` | Accounts with role (`ADMIN`/`LEARNER`), status (`ACTIVE`/`INACTIVE`), soft-delete support |
| `vocabulary` | `vocab_id` | Word, IPA, audio URL, CEFR level, topic FK |
| `example` | `example_id` | Example sentences (EN + VI) with optional audio |
| `topic` | `topic_id` | Hierarchical topics — self-referencing `parent_topic_id` |
| `user_vocabulary` | `(user_id, vocab_id)` | Saved words, study status, personal notes |
| `progress` | `(user_id, vocab_id)` | SM-2 spaced repetition state per word per user |
| `learning_log` | `log_id` | Daily activity audit: words studied, score, activity type |
| `exercise` | `exercise_id` | Exercise items linked to vocabulary |
| `exercise_session` | `session_id` | Exercise attempt: total questions, correct count, score |
| `exercise_result` | `result_id` | Per-question answer record |
| `password_reset_token` | `user_id` | One-time reset token with expiry |

### Spaced Repetition — SM-2 Algorithm

The `progress` table implements the SuperMemo 2 algorithm for intelligent review scheduling:

```sql
-- progress table (composite PK: user_id + vocab_id)
ease_factor      FLOAT   DEFAULT 2.5   -- word difficulty multiplier (2.5 = neutral)
interval_days    INT     DEFAULT 1     -- days until next review
repetitions      INT     DEFAULT 0     -- consecutive correct answers
last_review_date DATE
next_review_date DATE                  -- indexed; used for "due today" queries
```

On each review:
- **Correct answer** → `interval_days` multiplied by `ease_factor`; `ease_factor` increases slightly
- **Incorrect answer** → `interval_days` reset to 1; `ease_factor` decreases (floor 1.3)

This means a word answered correctly 5 times in a row won't appear for weeks; a word answered wrong resets to tomorrow.

### Data Integrity

- Foreign keys with cascade delete across all dependent tables
- `CHECK` constraints: `CK_users_role` (`ADMIN`/`LEARNER`), `CK_users_status` (`ACTIVE`/`INACTIVE`) — enforced at DB level
- `updated_at` auto-set via `SaveChangesAsync` override in `AppDbContext`
- Email uniqueness enforced at DB and normalized (trim + lowercase) before insert/lookup

---

## 📡 API Structure

All API endpoints are prefixed `/api/` and follow REST conventions. The React SPA communicates exclusively via these endpoints using `credentials: 'include'` for cookie forwarding.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account — rate-limited: 10 req/min per IP |
| `POST` | `/api/auth/login` | Authenticate, set session cookie — rate-limited: 10 req/min per IP |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `POST` | `/api/auth/forgot-password` | Send reset email — rate-limited: 3 req/5min per IP |
| `POST` | `/api/auth/reset-password` | Reset password with one-time token |

### Account

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/account/profile` | Update username or email |
| `POST` | `/api/account/change-password` | Change password (requires current password) |
| `DELETE` | `/api/account/delete` | Soft-delete account |

### Vocabulary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/vocabulary` | Paginated list — params: `page`, `pageSize`, `search`, `cefr`, `topicId` |
| `GET` | `/api/vocabulary/{id}` | Single word with all examples |
| `GET` | `/api/vocabulary/by-ids` | Batch fetch by ID array |
| `GET` | `/api/vocabulary/topics` | All topics with word counts |
| `GET` | `/api/learning/topics/{topicId}/vocabulary` | Topic word list for study session |

### Learning Progress

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/learning/progress` | User's progress state across all words |
| `POST` | `/api/learning/progress/learn` | Mark batch of words as learned |
| `POST` | `/api/learning/progress/review` | Mark batch as reviewed — triggers SM-2 update |

### Response Format

All API responses use typed response objects. Errors return appropriate HTTP status codes with structured JSON.

```json
{
  "succeeded": true,
  "message": "Login successful",
  "data": { ... }
}
```

`GlobalExceptionHandlerMiddleware` catches all unhandled exceptions — returns JSON for `/api/*` routes, redirects for MVC routes.

---

## 📁 Folder Structure

```
PBL3_vocab_web/
├── frontend/                        # React 19 SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── account/             # DeleteAccountModal, etc.
│   │   │   ├── layout/              # Navbar, Footer, UserWidget
│   │   │   ├── learning/            # LearningTopics, StudySession,
│   │   │   │   │                    #   MatchingGame, Minitest
│   │   │   │   └── streak/          # Learning streak display
│   │   │   └── ui/                  # Badge, Button, Toast
│   │   ├── pages/                   # Route-level page components
│   │   ├── services/                # API clients (fetch + credentials:include)
│   │   │   ├── authApi.ts
│   │   │   ├── vocabularyApi.ts
│   │   │   └── learningProgressApi.ts
│   │   ├── hooks/                   # useAppBootstrap, useGameProgress
│   │   ├── constants/               # Route paths, app constants
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── AppRoutes.tsx            # React Router route definitions
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   └── VocabLearning/               # ASP.NET Core 10 project
│       ├── Controllers/             # 14 controllers (MVC + API)
│       ├── Services/                # 8 interfaces + implementations
│       ├── Models/                  # 12 EF Core entity classes
│       ├── Data/
│       │   └── AppDbContext.cs      # EF context + Fluent API config
│       ├── ViewModels/              # Request/response DTOs
│       ├── Views/                   # Razor views (admin, auth pages)
│       ├── Middleware/
│       │   ├── GlobalExceptionHandlerMiddleware.cs
│       │   └── RequestLoggingMiddleware.cs
│       ├── Constants/               # UserRoles, UserStatuses
│       ├── Program.cs               # DI registration + middleware pipeline
│       ├── appsettings.json
│       ├── VocabLearning.csproj
│       └── Dockerfile
│
├── backend/VocabLearning.Tests/     # xUnit test project
│
├── database/
│   ├── init.sql                     # Full schema DDL — runs on Docker init
│   ├── init-db.sh                   # DB initialization script
│   └── ImportVocabularyPBL3/        # Seed vocabulary data
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Installation Guide

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — includes everything needed
- **OR** for manual local dev: .NET 10 SDK, Node.js 20+, SQL Server 2022

### Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/SCuong/PBL3_vocab_web.git
cd PBL3_vocab_web

# 2. Create your environment file
cp .env.example .env        # Linux/macOS
copy .env.example .env      # Windows

# 3. Fill in required values (see table below)

# 4. Build and start all services
docker compose up --build

# 5. Open in browser after DB is ready (~3-5 min first run)
# http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SA_PASSWORD` | ✅ | SQL Server SA password — must have uppercase, lowercase, digit, special char, ≥8 chars |
| `SMTP_HOST` | ✅ | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | ✅ | SMTP port (e.g. `587`) |
| `SMTP_USERNAME` | ✅ | Sender email address |
| `SMTP_PASSWORD` | ✅ | Gmail App Password — **not** your regular Gmail password |
| `SMTP_FROM_EMAIL` | ✅ | From address in outgoing emails |
| `GOOGLE_CLIENT_ID` | ⬜ | Google OAuth client ID (optional — disables Google login if absent) |
| `GOOGLE_CLIENT_SECRET` | ⬜ | Google OAuth client secret |
| `Gemini__ApiKey` | ⬜ | Google Gemini API key (optional — AI explanation disabled if absent) |
| `FRONTEND_PORT` | ⬜ | Browser port (default: `3000`) |

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords.  
> Generate a 16-character password for "VocabLearning". Paste into `SMTP_PASSWORD`.  
> Do NOT use your Gmail login password — it will not work.

---

## 🐳 Docker Setup

Three-container stack defined in `docker-compose.yml`.

### Container Architecture

```
                    ┌─────────────────────┐
Browser ──:3000──▶  │  frontend (Nginx)   │
                    │  React static files │
                    │  /api/* → backend   │
                    └────────┬────────────┘
                             │ :5152 (internal)
                    ┌────────▼────────────┐
                    │  backend            │
                    │  ASP.NET Core 10    │
                    └────────┬────────────┘
                             │ :1433 (internal)
                    ┌────────▼────────────┐
                    │  db                 │
                    │  SQL Server 2022    │
                    │  vol: sqlserver_data│
                    └─────────────────────┘
```

| Service | Image / Build | Internal Port | Persistent Volume |
|---|---|---|---|
| `db` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 | `sqlserver_data` |
| `backend` | `./backend/VocabLearning/Dockerfile` | 5152 | `avatar_data` |
| `frontend` | `./frontend/Dockerfile` | 80 | — |

### Common Commands

```bash
# Start in background
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f db

# Stop (keeps data)
docker compose down

# Stop and wipe database — WARNING: irreversible
docker compose down -v

# Rebuild single service
docker compose up -d --build backend
```

### Database Initialization

On first startup, `database/init.sql` runs inside the `db` container and creates all tables with:
- Complete schema including foreign keys and CHECK constraints
- Indexes on frequently queried columns
- Seed vocabulary data from `ImportVocabularyPBL3/`

The backend checks `Database:AutoMigrate` on startup to verify schema alignment.

SQL Server takes 30–60 seconds to be ready. Docker Compose `healthcheck` on the `db` service (120-second start period) ensures the backend waits before attempting connection.

---

## 🔒 Security Design

Security is a first-class concern, not an afterthought.

### Authentication & Sessions

- **Cookie-based sessions** — HttpOnly cookies prevent XSS token theft. `SameSite=Lax` blocks CSRF for cross-origin form submissions.
- **PBKDF2-SHA256 at 120,000 iterations** — custom implementation using `CryptographicOperations.FixedTimeEquals` for constant-time comparison to prevent timing attacks. Stronger than ASP.NET Identity's default 10,000 iterations.
- **Legacy hash migration** — passwords hashed with ASP.NET Identity's older algorithm are detected by format prefix and automatically rehashed on the next successful login.
- **Google OAuth** — tied to `google_subject` column (not just email), preventing account takeover if a user's email address is reused.
- **Sliding session expiration** — 14-day session renewed on each request.

### Input Validation & Access Control

- **CSRF protection** — `[ValidateAntiForgeryToken]` on all state-changing MVC actions; XSRF double-submit cookie pattern (`X-XSRF-TOKEN` header) for API endpoints.
- **Rate limiting** — login/register: 10 requests/min per IP; forgot-password: 3 requests/5min per IP. Prevents brute-force and email flooding.
- **Password length enforcement** — min 6, max 128 characters. The 128-char maximum is critical: PBKDF2 with very long inputs is computationally expensive and can be exploited as a DoS vector.
- **Email normalization** — `NormalizeEmail` trims and lowercases before insert and lookup, preventing duplicate account creation via `User@example.com` vs `user@example.com`.
- **Role enforcement** — `[Authorize(Roles = "ADMIN")]` guards all admin routes. DB-level `CHECK` constraints enforce valid role values independently of application code.
- **Soft delete** — accounts set `is_deleted = true` rather than hard-deleting, preserving referential integrity across all related records.

---

## 🧩 Challenges & Solutions

### 1. Hybrid SPA + MVC in One Backend

**Challenge:** Admin pages require server-side CSRF and session handling. Learner pages require SPA interactivity. Serving both from one ASP.NET Core application without duplication or conflicts.

**Solution:** Two routing systems coexist in `Program.cs`. Razor MVC uses convention routing for admin and auth URLs. Nginx serves the React build and proxies `/api/*` to the backend. No iframe embedding and no duplicated auth logic — the same cookie session works for both.

### 2. Custom Password Hashing Without ASP.NET Identity

**Challenge:** ASP.NET Identity's `PasswordHasher` is tightly coupled to the Identity user model and uses weaker default parameters. The project uses a custom `User` entity with no Identity dependency.

**Solution:** Custom PBKDF2 implementation using `Rfc2898DeriveBytes` with 120,000 SHA-256 iterations. Comparison uses `CryptographicOperations.FixedTimeEquals` to prevent timing attacks. Old Identity hashes are detected by their format prefix and auto-migrated to the stronger hash on the next login — zero friction for existing users.

### 3. Spaced Repetition Data Model

**Challenge:** Per-user, per-word review scheduling requires mutable per-pair state. Computing it on the fly from raw history is expensive and fragile.

**Solution:** `progress` table with composite PK `(user_id, vocab_id)` stores SM-2 state directly. Updates happen at review time, not on read. `next_review_date` is precomputed and indexed, enabling efficient "words due for review today" queries without full table scans.

### 4. Optional AI Integration Without Coupling

**Challenge:** Gemini API is optional — deployments without a key should work fully except for the AI feature. Controllers should not contain conditional API-key logic.

**Solution:** `IAIService` interface with `GeminiService` implementation injected via `AddHttpClient<IAIService, GeminiService>()`. If the API key is absent at startup, the service returns a graceful fallback message. The controller has zero knowledge of whether AI is configured.

### 5. SQL Server Startup Timing in Docker

**Challenge:** SQL Server takes 30–90 seconds to be ready. The ASP.NET backend starts immediately and crashes on failed DB connection, causing restart loops.

**Solution:** `docker-compose.yml` uses `healthcheck` on the `db` service (120-second start period, checks with `sqlcmd`). Backend `depends_on: db: condition: service_healthy` ensures it only starts after SQL Server passes health checks. No sleep hacks, no retry loops in application code.

---

## 🔮 Future Improvements

| Feature | Priority | Notes |
|---|---|---|
| Mobile app | High | React Native, same REST API |
| Word audio upload | High | Replace URL-based audio with file upload to server |
| Listening exercises | Medium | Audio-first vocabulary testing |
| Vocabulary CSV/Excel import | Medium | Bulk admin workflow |
| Push notifications | Medium | Daily review reminders via Web Push API |
| Advanced analytics | Medium | Learning velocity, retention rate, forgetting curve charts |
| Progressive Web App | Low | Offline study sessions via service worker |
| Community word sets | Low | User-contributed vocabulary groups |
| Additional language pairs | Low | Currently English–Vietnamese only |

---

## 📸 Screenshots

> *Screenshots will be added after final UI polish.*

| Page | Description |
|---|---|
| Home | Landing page with feature overview |
| Vocabulary list | Paginated word browser with CEFR + topic filters |
| Study session | Flashcard-style word study with audio and IPA |
| Matching game | Interactive word–definition matching exercise |
| Minitest | Multiple-choice quiz after each study batch |
| Progress dashboard | Learning streak, daily stats, word count |
| Admin dashboard | User and content management panel |

---

## 🤝 Contributing

This is a graduation project. Contributions are welcome after the submission deadline.

```bash
# Fork and clone
git clone https://github.com/<your-fork>/PBL3_vocab_web.git

# Create a feature branch
git checkout -b feat/your-feature-name

# Commit using Conventional Commits
git commit -m "feat: add vocabulary export to CSV"

# Push and open a PR against main
git push origin feat/your-feature-name
```

### Commit Convention

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code change without behavior change |
| `test:` | Tests only |
| `chore:` | Build, dependencies, config |
| `docs:` | Documentation only |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Vu Manh Cuong (SCuong)**

- GitHub: [@SCuong](https://github.com/SCuong)
- Email: vumanhcuongppt@gmail.com
- Project: PBL3 — Da Nang University of Science and Technology

---

<div align="center">

Built with ASP.NET Core 10 · React 19 · SQL Server 2022 · Docker

*PBL3 Graduation Project — Da Nang University of Science and Technology*

</div>
