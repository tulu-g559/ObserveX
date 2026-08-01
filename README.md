<div align="center">

# 👁️ ObserveX

### Real-time Visual AI Browser Agent

**Capture browser activity. Understand it with vision AI. Visualize your day.**

![Hero Image](https://via.placeholder.com/1200x400/0f172a/ffffff?text=ObserveX+%E2%80%94+Real-time+Visual+AI+Browser+Agent)

<!-- TODO: Add real product screenshots -->

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Celery](https://img.shields.io/badge/Celery-5.4-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Request Flow](#request-flow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Docker Setup](#docker-setup)
  - [Manual Setup](#manual-setup)
- [Running the Stack](#running-the-stack)
- [Database Migrations](#database-migrations)
- [API Reference](#api-reference)
- [Chrome Extension Workflow](#chrome-extension-workflow)
- [AI Pipeline](#ai-pipeline)
- [Redis Queue Flow](#redis-queue-flow)
- [Celery Worker Flow](#celery-worker-flow)
- [Logging & Error Handling](#logging--error-handling)
- [Architecture Decisions](#architecture-decisions)
- [Scalability](#scalability)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Example Requests](#example-requests)
- [Example Responses](#example-responses)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## About

**ObserveX** is a visual AI browser agent that runs entirely in your browser and on your own stack:

1. A **Chrome Extension** (Manifest V3) silently observes meaningful browser events — navigation, tab switches, clicks, form submissions, idle resumption — and captures screenshots of the active tab.
2. A **FastAPI backend** ingests activity events and screenshots, and enqueues them for AI analysis.
3. **Celery workers** (backed by Redis) analyze each screenshot with **Gemini Vision**, falling back to **PaddleOCR** on any failure so no record is ever dropped.
4. Structured, semantic activity metadata (activity type, application, summary, tags, confidence) is persisted to **PostgreSQL**.
5. A **React dashboard** presents the day as a timeline, session list, statistics, searchable archive, and per-event detail view.

The architecture is **event-driven and asynchronous**: the extension only captures and uploads; all AI processing happens in background workers.

> ⚠️ **WIP** — this project is under active development. Anything not yet implemented is listed in [Roadmap](#roadmap) instead of being documented as existing.

---

## Features

| Area | Feature |
|---|---|
| **Chrome Extension** | Manifest V3 service worker, content script, popup, and options page |
| **Event-driven capture** | `url_change`, `tab_switch`, `click`, `form_submit`, `idle_resume`, and periodic `interval` events |
| **Screenshot capture** | `chrome.tabs.captureVisibleTab` with configurable JPEG quality |
| **Offline-tolerant uploads** | `chrome.storage.local` queue with retries (max 5 attempts) and a 1-minute flush alarm |
| **Async processing** | FastAPI → Redis → Celery pipeline, API never blocks on AI inference |
| **Gemini Vision analysis** | Structured JSON extraction (activity, application, summary, tags, confidence) |
| **PaddleOCR fallback** | Automatic local OCR fallback when Gemini fails (offline-capable) |
| **PostgreSQL storage** | Sessions, activity events, screenshots (SHA-256 dedupe hash), AI results (JSON tags/raw payload) |
| **Dashboard** | React 18 + Vite + Tailwind CSS |
| **Timeline** | Activities grouped by day |
| **Session history** | Session list with computed durations |
| **Activity summaries** | AI-generated semantic understanding per event |
| **Search** | Full-text `LIKE` search over AI summaries and activity labels |
| **Statistics** | Total events/sessions and top-5 activity distribution |
| **Dockerized deployment** | `docker compose up --build` runs the full stack |

---

## Architecture

### System Overview

```mermaid
flowchart LR
    EXT[Chrome Extension<br/>MV3 Service Worker]
    API[FastAPI API<br/>:8000]
    RQ[(Redis<br/>:6379)]
    CW[Celery Workers<br/>x4 concurrency]
    GEM[Gemini Vision]
    OCR[PaddleOCR<br/>fallback]
    PG[(PostgreSQL<br/>:5432)]
    DASH[React Dashboard<br/>:5173]

    EXT -->|"POST /activity +<br/>POST /upload"| API
    API -->|"enqueue<br/>process_screenshot"| RQ
    RQ --> CW
    CW -->|"1. try"| GEM
    GEM -->|"any failure"| OCR
    GEM -->|"AIResult"| CW
    OCR -->|"AIResult"| CW
    CW -->|"persist AIResult"| PG
    API -->|"create event / attach screenshot"| PG
    PG --> DASH
    API -->|"serve screenshots<br/>/storage/*"| DASH
```

### Upload & AI Processing Sequence

```mermaid
sequenceDiagram
    participant EXT as Chrome Extension
    participant API as FastAPI
    participant RQ as Redis Queue
    participant CW as Celery Worker
    participant AI as VisionService
    participant G as Gemini Vision
    participant O as PaddleOCR
    participant DB as PostgreSQL

    EXT->>API: POST /activity (event metadata)
    API->>DB: insert activity_events row
    API-->>EXT: ActivityEventOut { id, ... }
    EXT->>API: POST /upload?activity_id= (image bytes)
    API->>API: validate type/size, store to disk, SHA-256
    API->>DB: insert screenshots row
    API->>RQ: enqueue process_screenshot(activity_id, path)
    API-->>EXT: UploadAck { activity_id, task_id, status: "queued" }

    RQ->>CW: dequeue task
    CW->>AI: analyze(image_bytes)
    AI->>G: generate_content(prompt + image)
    alt Gemini succeeds
        G-->>AI: JSON payload
        AI->>AI: _extract_json (fences/prose/truncation-safe)
    else Gemini fails (timeout, quota, malformed JSON)
        G-->>AI: raises
        AI->>O: PaddleOCR.ocr(image)
        O-->>AI: extracted text (first 500 chars)
    end
    AI-->>CW: (AIResultSchema, source)
    CW->>DB: insert ai_results row (1:1 with activity)
    CW-->>RQ: mark task done (result backend)
```

### Extension Event Flow

```mermaid
flowchart TD
    CS["Content Script<br/>click (2s debounce) / form_submit"] -->|runtime.sendMessage| BG[Background Service Worker]
    T1[tabs.onUpdated → url_change] --> BG
    T2[tabs.onActivated → tab_switch] --> BG
    T3[idle.onStateChanged active → idle_resume] --> BG
    AL[alarms → interval snapshot] --> BG

    BG --> CHECK{enabled? active tab?<br/>not chrome:// URL?}
    CHECK -- no --> DONE[skip]
    CHECK -- yes --> CAP[captureVisibleTab<br/>JPEG, quality 60%]
    CAP --> Q[(chrome.storage.local<br/>upload queue)]
    Q --> FLUSH[flushQueue]
    FLUSH -->|POST /activity| API
    FLUSH -->|POST /upload| API
    FLUSH -->|failure < 5 attempts| Q
    FLUSH -->|success or 5 attempts| REMOVE[drop from queue]
```

---

## Technology Stack

### Backend — `server/`

| Component | Choice | Purpose |
|---|---|---|
| Language | Python 3.12 | |
| Web framework | FastAPI 0.115 + Uvicorn 0.30 | Async REST API, automatic OpenAPI docs |
| ORM | SQLAlchemy 2.0 + psycopg 3 | Typed ORM over PostgreSQL |
| Migrations | Alembic 1.13 | Schema versioning |
| Task queue | Celery 5.4 + Redis 5.0 | Distributed async workers |
| Vision AI | google-generativeai 0.8 | Gemini Vision (structured JSON output) |
| OCR fallback | PaddleOCR 2.8 + PaddlePaddle 2.6 | Local text extraction fallback |
| Validation | Pydantic 2 + pydantic-settings | Request/response schemas, env config |
| Tests | pytest + httpx | Health & validation tests |

### Frontend — `client/`

| Component | Choice |
|---|---|
| React 18 + TypeScript 5.6 | UI |
| Vite 5 | Dev server & bundling |
| Tailwind CSS 3 | Styling |
| React Router 6 | Routing |
| TanStack Query 5 | Server-state / caching |
| Axios | HTTP client |

### Extension — `extension/`

| Component | Choice |
|---|---|
| Chrome Manifest V3 | API surface (tabs, activeTab, scripting, storage, idle, alarms) |
| TypeScript 5.6 + esbuild 0.23 | Source & bundling (target `chrome116`) |

### Infra

| Component | Choice |
|---|---|
| PostgreSQL 16 (alpine) | Primary database |
| Redis 7 (alpine) | Celery broker + result backend |
| Docker Compose | Single-command local stack |

---

## Project Structure

```
ObserveX/
├── docker-compose.yml          # postgres + redis + server + worker + client
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── build.mjs               # esbuild bundler (out: extension root)
│   └── src/
│       ├── background/         # service worker: capture, queue, flush, alarms
│       ├── content/            # content script: forwards click / form_submit
│       ├── lib/                # apiClient, storageManager, shared types
│       ├── popup/              # popup UI: enable/disable + queue status
│       └── options/            # options page: API URL, interval, quality
├── server/                     # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                # migration environment + versions/
│   ├── tests/                  # pytest suite
│   └── app/
│       ├── main.py             # app factory, CORS, middleware, exception handlers
│       ├── api/routers/        # health, upload, activity, session
│       ├── config/settings.py  # pydantic-settings env config
│       ├── core/               # database engine, logging, exceptions
│       ├── models/models.py    # Session, ActivityEvent, Screenshot, AIResult
│       ├── repositories/       # ActivityRepository (data access layer)
│       ├── schemas/schemas.py  # Pydantic request/response models
│       ├── services/           # UploadService, VisionService (Gemini + OCR)
│       ├── utils/              # (reserved)
│       └── workers/            # celery_app + process_screenshot task
└── client/                     # React dashboard
    ├── Dockerfile
    ├── vite.config.ts
    └── src/
        ├── api/client.ts       # Axios API wrapper
        ├── hooks/queries.ts    # TanStack Query hooks
        ├── types/index.ts      # shared API types
        ├── components/         # Layout, ActivityCard
        └── pages/              # Dashboard, Timeline, Sessions, Statistics,
                                # Search, Settings, ActivityDetail
```

---

## Getting Started

### Prerequisites

- **Docker** + **Docker Compose** (easiest path) — or alternatively:
- **Python 3.12** and a virtual environment
- **Node.js 20+** and npm
- **Google AI API key** (for Gemini Vision; the PaddleOCR fallback works without it, but everything will be tagged as OCR fallback)

### Environment Variables

Copy `server/.env.example` to `server/.env` and fill in your values:

```bash
cp server/.env.example server/.env
```

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `ObserveX` | Application name used in logs |
| `ENV` | `development` | Runtime environment label |
| `DATABASE_URL` | `postgresql+psycopg://observex:observex@postgres:5432/observex` | SQLAlchemy connection string (psycopg3 driver) |
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker + result backend URL |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio API key for Gemini Vision |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model identifier used for vision analysis |
| `MAX_UPLOAD_MB` | `5` | Maximum accepted screenshot size (MB) |
| `JWT_SECRET` | `change-me` | **TODO:** reserved for future auth (no auth is enforced yet) |

Frontend (optional override at build/dev time):

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL consumed by the dashboard (Axios) |

> ⚠️ **Note:** `server/.env` is git-ignored. The Docker Compose file loads it via `env_file`, and `docker-compose.yml` overrides `DATABASE_URL` / `REDIS_URL` with the in-network service names.

### Docker Setup

```bash
docker compose up --build
```

This starts five services on a shared Compose network (services reach each other by name):

| Service | Image / Build | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | Credentials `observex`/`observex`, DB `observex`; healthcheck via `pg_isready` |
| `redis` | `redis:7-alpine` | `6379` | Broker + result backend; healthcheck via `redis-cli ping` |
| `server` | `./server` | `8000` | Uvicorn API (`app.main:app`) |
| `worker` | `./server` | — | `celery -A app.workers.celery_app worker --loglevel=info` |
| `client` | `./client` | `5173` | Vite dev server (React dashboard) |

**Volumes**

| Volume | Mount | Purpose |
|---|---|---|
| `observex_pg_data` | `/var/lib/postgresql/data` | Persistent PostgreSQL data |
| `observex_screenshots` | `/app/storage` (server **and** worker) | Shared screenshot storage; API writes, workers read |

> ⚠️ **Note:** `server` and `worker` must share the screenshot volume — the API stores images to disk, while the Celery worker reads them by path.

### Manual Setup

#### 1. Backend

```bash
cd server
python -m venv venv
# Windows: .\venv\Scripts\activate    |  Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then set GEMINI_API_KEY
```

#### 2. Infrastructure (Redis + PostgreSQL)

```bash
docker compose up -d postgres redis
```

#### 3. Run migrations

```bash
alembic upgrade head
```

#### 4. Backend API

```bash
uvicorn app.main:app --reload
```

#### 5. Celery worker

```bash
celery -A app.workers.celery_app worker --loglevel=info
```

#### 6. Frontend

```bash
cd client
npm install
npm run dev
```

#### 7. Chrome Extension

```bash
cd extension
npm install
npm run build        # bundles background/, content/, popup/, options/ into extension root
```

Then:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

> ⚠️ **Note:** the extension requires Chrome **116+** (MV3 module service worker). The default API base URL is `http://localhost:8000` — adjust it on the extension's options page if your backend runs elsewhere.

---

## Running the Stack

| What | Command |
|---|---|
| Full stack (Docker) | `docker compose up --build` |
| Backend only | `uvicorn app.main:app --reload` (from `server/`) |
| Celery worker | `celery -A app.workers.celery_app worker --loglevel=info` |
| Frontend dev server | `npm run dev` (from `client/`) |
| Redis | `docker compose up -d redis` |
| PostgreSQL | `docker compose up -d postgres` |
| Extension build | `npm run build` (from `extension/`) |
| Extension watch | `npm run watch` |
| Tests | `pytest` (from `server/`, venv active) |
| API docs (Swagger) | http://localhost:8000/docs |
| Dashboard | http://localhost:5173 |

---

## Database Migrations

```bash
# create a new revision after model changes
alembic revision --autogenerate -m "describe change"

# apply migrations
alembic upgrade head

# roll back one revision
alembic downgrade -1
```

The current schema (initial revision `6a30b04d75f8`):

```mermaid
erDiagram
    SESSIONS ||--o{ ACTIVITY_EVENTS : contains
    ACTIVITY_EVENTS ||--o| SCREENSHOTS : has
    ACTIVITY_EVENTS ||--o| AI_RESULTS : enriched_by

    SESSIONS {
        string id PK
        string user_id "indexed"
        datetime start_time
        datetime end_time "nullable"
    }
    ACTIVITY_EVENTS {
        string id PK
        string session_id FK "indexed"
        datetime timestamp
        text url
        text page_title
        string event_type "url_change|tab_switch|click|idle_resume|interval|form_submit"
    }
    SCREENSHOTS {
        string id PK
        string activity_id FK "unique"
        string image_path
        string hash "sha256, indexed"
        datetime created_at
    }
    AI_RESULTS {
        string id PK
        string activity_id FK "unique"
        string activity "e.g. coding"
        string application "e.g. GitHub"
        text page_title
        text summary
        json tags
        float confidence
        string source "gemini|paddleocr"
        json raw_json
        datetime created_at
    }
```

---

## API Reference

Base URL: `http://localhost:8000` — interactive docs at `/docs`.

### Endpoints

| Method | Endpoint | Description | Payload | Response |
|---|---|---|---|---|
| `GET` | `/health` | Liveness check | — | `HealthOut` |
| `POST` | `/activity` | Create an activity event (called by the extension) | `ActivityEventCreate` (JSON) | `ActivityEventOut` |
| `GET` | `/activities` | List events, newest first | Query: `limit` (≤200, default 50), `offset` (≥0) | `list[ActivityEventOut]` |
| `GET` | `/activity/{activity_id}` | Event detail incl. AI result and screenshot URL | Path: `activity_id` | `{ event, ai_result, screenshot }` |
| `GET` | `/search` | Search AI results by summary/activity (case-insensitive `LIKE`) | Query: `q` (required) | `list[AIResultOut]` |
| `GET` | `/sessions` | List sessions, newest first | — | `list[SessionOut]` |
| `GET` | `/stats` | Aggregated counts and top-5 activities | — | `StatsOut` |
| `POST` | `/upload` | Upload a screenshot; queues the `process_screenshot` Celery task | Multipart: `file`; Query: `activity_id` | `UploadAck` |
| `GET` | `/storage/*` | Static serving of stored screenshots | — | image bytes |

### Schemas

**`ActivityEventCreate`** — body for `POST /activity`

| Field | Type | Notes |
|---|---|---|
| `session_id` | string | Created client-side (UUID); row upserted if unknown |
| `url` | string | Page URL |
| `page_title` | string | Optional, default `""` |
| `event_type` | enum | `url_change` · `tab_switch` · `click` · `idle_resume` · `interval` · `form_submit` |
| `timestamp` | datetime | Optional; defaults to DB `now()` |

**`UploadAck`** — response for `POST /upload`

| Field | Type | Notes |
|---|---|---|
| `activity_id` | string | Linked event |
| `task_id` | string | Celery task ID (result backend) |
| `status` | string | Always `"queued"` |

**`AIResultOut`** — returned by `/activity/{id}.ai_result` and `/search`

| Field | Type | Notes |
|---|---|---|
| `id` | string | AI result row ID |
| `activity_id` | string | Linked event ID |
| `activity` | string | e.g. `coding`, `reading` |
| `application` | string | e.g. `GitHub`, `YouTube` |
| `page_title` | string | Detected title |
| `summary` | string | Semantic summary |
| `tags` | list[str] | Detected tags |
| `confidence` | float | 0.0 – 1.0 |
| `source` | string | `gemini` or `paddleocr` |
| `created_at` | datetime | |

**Error format** — all errors return JSON: `{ "error": "<message>" }`

| Status | When |
|---|---|
| `404` | `activity not found` |
| `413` | file exceeds `MAX_UPLOAD_MB` |
| `415` | unsupported content type (allowed: `image/jpeg`, `image/png`, `image/webp`) |
| `422` | validation failure (e.g. missing `q` on `/search`) |
| `500` | unhandled exception (logged) |

---

## Chrome Extension Workflow

The extension is intentionally thin: **capture and upload only**. All intelligence lives in the backend.

**Event sources** (background service worker):

| Event | Listener | Emitted `event_type` |
|---|---|---|
| Page navigation completes | `chrome.tabs.onUpdated` (status `complete`, URL changed) | `url_change` |
| Active tab changes | `chrome.tabs.onActivated` | `tab_switch` |
| Click (debounced 2 s) | content script → `OBSERVEX_ACTIVITY_EVENT` message | `click` |
| Form submitted | content script → message | `form_submit` |
| Idle → active transition | `chrome.idle.onStateChanged` | `idle_resume` |
| Periodic snapshot | `chrome.alarms` (`observex-interval-capture`, default 60 s) | `interval` |

**Capture & queue:**

1. `recordEvent()` checks: extension enabled, tab active, URL not `chrome://` / `chrome-extension://`.
2. Captures the visible tab as JPEG with the configured quality (`chrome.tabs.captureVisibleTab`).
3. Builds an `ActivityPayload` (session id from `chrome.storage.local`, URL, title, event type, timestamp).
4. Enqueues `{ payload, screenshotDataUrl, attempts: 0 }` in `chrome.storage.local`.
5. Best-effort immediate `flushQueue()`; a 1-minute alarm (`observex-flush-queue`) retries failures.

**Upload queue (`flushQueue`)** — for each queued item:

1. `POST /activity` → create event, get its `id`.
2. `POST /upload?activity_id=<id>` → upload screenshot blob.
3. Success → drop from queue. Failure → `attempts += 1`; retried until **5 attempts**, then dropped with a warning.

This makes capture resilient to network hiccups and backend restarts.

**Popup** shows active/paused state + pending queue count. **Options page** configures `apiBaseUrl`, `captureIntervalSeconds`, `jpegQuality`.

---

## AI Pipeline

Implemented as the `VisionService` facade (`server/app/services/vision_service.py`), used only by the Celery worker:

```mermaid
flowchart LR
    IMG[image_bytes] --> VS{VisionService.analyze}
    VS -->|primary| GV[GeminiVisionBackend]
    GV -->|"generate_content(prompt, image)<br/>temp 0.2 · max 1024 tokens"| RAW[model text]
    RAW --> EX[_extract_json]
    EX -->|dict| SCHEMA[AIResultSchema]
    GV -->|ANY exception| OCR[PaddleOCRBackend]
    OCR -->|"OCR text ≤ 500 chars"| FALLBACK[AIResultSchema<br/>activity=unknown · conf 0.3 · tags=ocr-fallback]
    SCHEMA --> OUT[(source: gemini)]
    FALLBACK --> OUT2[(source: paddleocr)]
```

1. **Gemini Vision** is tried first. The model receives a fixed JSON-only prompt plus the raw image, with `temperature=0.2` and `max_output_tokens=1024`.
2. **`_extract_json`** robustly parses the model output: strips markdown code fences, tolerates surrounding prose, and recovers from token-limit truncation by trying progressively shorter JSON prefixes (up to 128 chars back).
3. **On ANY failure** (missing API key, timeout, quota, malformed JSON, empty output) the `VisionService` catches it and falls back to **PaddleOCR**, which extracts visible text (truncated to 500 chars) and emits a low-confidence (`0.3`) result tagged `ocr-fallback` — so the pipeline never drops a record.
4. The worker persists an `AIResult` row (1:1 with the activity event) including the full `raw_json` payload.

---

## Redis Queue Flow

- Redis (`redis://redis:6379/0`) acts as **both** the Celery **broker** (task transport) and **result backend**.
- The API never performs AI work synchronously — `POST /upload` returns `UploadAck` with `status: "queued"` immediately after `process_screenshot.delay()`.
- Queue name: default `celery` (not custom-named in code).

---

## Celery Worker Flow

**Worker config** (`server/app/workers/celery_app.py`):

| Setting | Value | Effect |
|---|---|---|
| `task_serializer` / `result_serializer` | `json` | JSON wire format |
| `task_track_started` | `True` | Worker started state visible in results |
| `task_acks_late` | `True` | Acknowledges only after completion → at-least-once delivery |
| `worker_prefetch_multiplier` | `1` | One task at a time per worker process |
| `task_time_limit` | `300` s | Hard kill (soft: `270` s) |
| `worker_concurrency` | `4` | 4 processes per worker node |

**Task: `process_screenshot`** (`server/app/workers/tasks.py`)

```python
@celery_app.task(name="process_screenshot", bind=True, max_retries=3, default_retry_delay=5)
def process_screenshot(self, activity_id: str, image_path: str) -> dict:
```

1. Opens a fresh DB session (`SessionLocal`).
2. Reads the screenshot bytes from the shared volume.
3. Lazily builds (once per worker process) the `VisionService` — heavy PaddleOCR import is deferred until actually needed.
4. `analyze()` → `(AIResultSchema, source)` → persists `AIResult` row.
5. On any exception → `self.retry(exc=exc)` — up to **3 retries** with a **5-second** backoff.
6. Returns `{ activity_id, source, activity }` to the result backend.

---

## Logging & Error Handling

**Logging** (`server/app/core/logging.py`):

- Single stdout handler, structured format:

  ```
  2026-08-01 12:00:00 | INFO | req=a1b2c3d4 | observex.main | ObserveX API starting up (env=development)
  ```

- Every HTTP request gets a short request id (`ContextVar`), echoed in logs and returned in the `X-Request-ID` response header.
- Loggers are namespaced: `observex.main`, `observex.worker`, `observex.vision`, `observex.exceptions`.

**Error handling** (`server/app/core/exceptions.py`):

- Domain errors raise `ObserveXError(message, status_code)` → JSON `{ "error": message }` with the proper status (404/413/415).
- Unhandled exceptions → logged via `logger.exception` and answered with generic `500 {"error": "internal server error"}`.
- The Celery task logs exceptions before retrying, so failures are always visible in worker logs.

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **FastAPI** | Async-first framework with Pydantic validation, typed schemas shared between routers/repositories, and auto-generated OpenAPI docs (`/docs`). |
| **Redis** | Lightweight in-memory broker with sub-millisecond enqueue; doubles as the result backend, avoiding an extra moving part. |
| **Celery** | Mature distributed task queue with retries, time limits, acks-late semantics, and horizontal scaling — exactly what a slow AI pipeline needs. |
| **PostgreSQL** | Relational integrity (1:1 screenshot/AI-result links, indexed FKs), plus JSON columns for flexible AI payloads (`tags`, `raw_json`). |
| **Event-driven architecture** | Capturing is cheap and latency-sensitive; AI inference is expensive and slow. Decoupling via a queue keeps the extension and API instant and never drops work. |
| **Async workers** | Gemini calls and PaddleOCR inference each take seconds — blocking the API thread would make uploads unusable. |
| **Gemini Vision** | Zero-shot visual understanding directly from a screenshot; structured JSON output drives the dashboard without hand-written heuristics. |
| **PaddleOCR fallback** | Keeps the pipeline complete even when Gemini is down, out of quota, or unconfigured — at the cost of lower confidence (`0.3`), explicitly surfaced via the `source` field. |

---

## Scalability

| Lever | How ObserveX supports it |
|---|---|
| **Horizontal workers** | Stateless workers: `docker compose up --scale worker=4` (concurrency is per-node, 4). Tasks are re-enqueued on failure via retries. |
| **Redis queue** | Natural buffering — bursts of captured events are drained at worker pace; `task_acks_late` + prefetch 1 prevents lost work on crash. |
| **Stateless API** | All state lives in PostgreSQL/Redis/disk volume; API instances can be replicated behind a load balancer. |
| **AI abstraction** | `VisionBackend` interface makes the primary model or fallback swappable (e.g. another Gemini model, Claude, or a local model) without touching the pipeline. |
| **Worker isolation** | Heavy PaddlePaddle import is lazy and per-process; CPU-bound OCR runs only on worker nodes, not the API. |
| **Database indexing** | Indexes on `sessions.user_id`, `activity_events.session_id`, `screenshots.hash`, plus unique constraints on the 1:1 links; FKs keep joins cheap. |
| **Screenshot dedupe** | SHA-256 hashing is stored per screenshot — **TODO:** deduplication/compaction job not yet implemented. |

---

## Configuration

| What | Where |
|---|---|
| Backend env | `server/.env` (see [Environment Variables](#environment-variables)) |
| Frontend API URL | `VITE_API_BASE_URL` env var, overridable in `client/src/api/client.ts` and the Settings page |
| Extension settings | Options page (API URL, capture interval in seconds, JPEG quality 0–1); defaults in `extension/src/lib/types.ts` |
| CORS origins | `ALLOWED_ORIGINS` setting (default `["http://localhost:5173", "chrome-extension://*"]`) |
| Celery tuning | `server/app/workers/celery_app.py` |

---

## Development Workflow

```bash
# 1. Start infra (Docker)
docker compose up -d postgres redis

# 2. Backend (terminal 1)
cd server && .\venv\Scripts\activate   # or source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload

# 3. Worker (terminal 2)
cd server && celery -A app.workers.celery_app worker --loglevel=info

# 4. Frontend (terminal 3)
cd client && npm run dev

# 5. Extension (terminal 4) — then Load unpacked at chrome://extensions
cd extension && npm run watch
```

---

## Testing

```bash
cd server && pytest
```

Current coverage (`server/tests/test_health.py`):

- `GET /health` returns `200` + `{"status": "ok"}`
- `GET /search` without `q` returns `422`

<!-- TODO: add tests for activity CRUD, upload validation, and the vision fallback -->

---

## Example Requests

### Create an activity event

```bash
curl -X POST http://localhost:8000/activity \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "3f2a9b1e-5f1a-4c9d-8b3a-1234567890ab",
    "url": "https://github.com/anomalyco/opencode",
    "page_title": "opencode: An open-source coding agent",
    "event_type": "url_change"
  }'
```

### Upload a screenshot (queues the AI task)

```bash
curl -X POST "http://localhost:8000/upload?activity_id=<activity_id>" \
  -F "file=@screenshot.jpg;type=image/jpeg"
```

### List recent activities

```bash
curl "http://localhost:8000/activities?limit=10&offset=0"
```

### Get activity detail (event + AI result + screenshot URL)

```bash
curl http://localhost:8000/activity/<activity_id>
```

### Search AI results

```bash
curl "http://localhost:8000/search?q=coding"
```

### Stats

```bash
curl http://localhost:8000/stats
```

---

## Example Responses

**`POST /upload` → `200 UploadAck`**

```json
{
  "activity_id": "b1d9c7a2-...",
  "task_id": "e5f6a3c1-...",
  "status": "queued"
}
```

**`GET /activity/<id>` → `200`**

```json
{
  "event": {
    "id": "b1d9c7a2-...",
    "session_id": "3f2a9b1e-...",
    "timestamp": "2026-08-01T10:15:30.000Z",
    "url": "https://github.com/anomalyco/opencode",
    "page_title": "opencode: An open-source coding agent",
    "event_type": "url_change"
  },
  "ai_result": {
    "id": "c9e1f2b3-...",
    "activity_id": "b1d9c7a2-...",
    "activity": "coding",
    "application": "GitHub",
    "page_title": "opencode: An open-source coding agent",
    "summary": "User is browsing the opencode repository documentation.",
    "tags": ["github", "coding", "docs"],
    "confidence": 0.94,
    "source": "gemini",
    "created_at": "2026-08-01T10:15:45.000Z"
  },
  "screenshot": "/storage/screenshots/5d8f2a1c-9b3e-4f6a-8c7d-0e1f2a3b4c5d.jpg"
}
```

**`GET /search?q=coding` → `200`** (fallback source example)

```json
[
  {
    "id": "c9e1f2b3-...",
    "activity_id": "b1d9c7a2-...",
    "activity": "unknown",
    "application": "",
    "page_title": "",
    "summary": "OCR fallback extracted text: FastAPI Swagger UI docs ...",
    "tags": ["ocr-fallback"],
    "confidence": 0.3,
    "source": "paddleocr",
    "created_at": "2026-08-01T10:15:45.000Z"
  }
]
```

**`GET /stats` → `200`**

```json
{
  "total_events": 142,
  "total_sessions": 3,
  "top_activities": [
    { "activity": "coding", "count": 61 },
    { "activity": "reading", "count": 38 }
  ],
  "top_tags": []
}
```

---

## Roadmap

- [ ] **Authentication** — `JWT_SECRET` / `JWT_ALGORITHM` settings exist, but no auth middleware or login flow is implemented yet
- [ ] **Session lifecycle** — `Session.end_time` is never written by the current pipeline
- [ ] **Top tags statistics** — `/stats` currently returns an empty `top_tags` array
- [ ] **Screenshot rendering** — the detail page shows the screenshot URL as text; embed it as an `<img>` for preview
- [ ] **Screenshot deduplication** — SHA-256 hashes are stored but not yet used to skip duplicates
- [ ] **Production frontend build** — the Docker `client` service runs the Vite dev server; a nginx/static-serve production image is pending
- [ ] **Extended test suite** — only health/search endpoints are covered
- [ ] **CI/CD** — no GitHub Actions workflow yet
- [ ] **Sample screenshots & hero image** — add real product captures

---

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Make your changes — keep the extension thin, put AI work in workers, and keep schemas in `server/app/schemas`.
4. Run `pytest` for backend changes, `npm run typecheck` for extension changes, and `npm run build` for the client.
5. Open a pull request with a clear description.

---

## License

<!-- TODO: License not yet chosen. MIT is the recommended default for open-source publication. -->

This project does not currently include a `LICENSE` file. Until a license is added, all rights are reserved by the author.

---

## Acknowledgements

- **Google Gemini** — vision model powering semantic screenshot understanding
- **PaddlePaddle / PaddleOCR** — offline OCR fallback
- Built with FastAPI, Celery, Redis, PostgreSQL, React, Vite, Tailwind CSS, esbuild, and Docker
