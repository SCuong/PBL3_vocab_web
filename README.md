<p align="center">
  <img src="frontend/public/logo.png" alt="VocabLearning Logo" width="140" />
</p>

<h1 align="center">VocabLearning</h1>

<p align="center">
  <strong>Full-stack English vocabulary learning platform.</strong>
</p>

---

## 1. Overview

VocabLearning is a full-stack English vocabulary learning platform built as a PBL3 graduation project. It has two sides: a **Learner** side for browsing words, studying by topic, and tracking progress, and an **Admin** side for managing vocabulary, topics, exercises, and users.

## 2. Features

**Learner**
- Register / login (email + password, Google OAuth)
- Vocabulary browser with CEFR + topic filters and search
- Word detail with IPA, meaning, examples, audio
- Topic-based learning flow: StudySession → MatchingGame → Minitest
- Progress tracking with spaced repetition scheduling
- Personal notebook + sticky notes
- Leaderboard
- AI-powered word explanation (Gemini, optional)

**Admin**
- Vocabulary CRUD (word, IPA, audio, examples, CEFR)
- Topic CRUD with parent/child hierarchy
- Exercise management per word
- User management (block, unblock, delete, promote)
- Learning analytics dashboard

## 3. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, React Router |
| Backend | ASP.NET Core (.NET 10), C#, Entity Framework Core, Razor (admin/auth views) |
| Database | PostgreSQL 16 |
| Auth | Cookie-based sessions + CSRF (anti-forgery), PBKDF2-SHA256 password hashing |

## 4. Local Setup

### Prerequisites
- Node.js 20+
- .NET 10 SDK
- PostgreSQL 16 running locally (or via Docker)

### Database

Create a local Postgres DB and apply the schema:

```bash
createdb vocablearning
psql -d vocablearning -f database/postgres/init.sql
```

### Environment variables

- Copy `.env.example` → `.env` at the repo root (used by Docker Compose / host env).
- Copy `frontend/.env.example` → `frontend/.env` for the Vite dev server.
- Set DB connection in `backend/VocabLearning/appsettings.Development.json` or via `ConnectionStrings__DefaultConnection`.

### Backend

```bash
cd backend/VocabLearning
dotnet restore
dotnet run
# listens on http://localhost:5152
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# opens on http://localhost:3000 — proxies /api → backend
```

### Optional integrations

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — enables Google login
- `GEMINI_API_KEY` — enables AI word explanation
- `SMTP_*` — enables password-reset email

## 5. Deployment Plan

> Not yet deployed. This is the intended deployment model, not the current state.

- **Frontend** — Vite static build (`npm run build`) hosted on Vercel or another static host
- **Backend** — ASP.NET Core service or container on Render / a VPS
- **Database** — managed PostgreSQL (cloud provider) or PostgreSQL on a VPS — not the developer's local machine
- **Config** — all secrets and per-environment values supplied via environment variables, not committed files
- `docker-compose.yml` is provided for local end-to-end runs and as a reference for the eventual container setup
