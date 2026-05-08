# Chatbot Dashboard — Project Documentation

> **Stack**: Python 3.11 · FastAPI · SQLAlchemy (async) · MySQL · React 19 · Vite · Tailwind CSS 4

---

## Directory Tree

```
Chatbot_dashboard-main/
├── .gitignore
├── README.md
│
├── backend/                        ← Python / FastAPI server
│   ├── requirements.txt
│   ├── run.py                      ← Dev server entry point
│   └── src/
│       ├── .env                    ← Secret config (never commit)
│       ├── .env.example            ← Template for new developers
│       ├── main.py                 ← FastAPI app factory + middleware + global error handlers
│       ├── lifespan.py             ← Startup/shutdown events
│       │
│       ├── api/
│       │   └── routes.py           ← HTTP route declarations + auth injection + file upload validation
│       │
│       ├── services/
│       │   ├── dashboard.py        ← All business logic & SQL queries
│       │   └── service.py          ← DEPRECATED stub (safe to ignore)
│       │
│       ├── models/
│       │   └── schemas.py          ← Pydantic response shapes (includes pagination envelopes)
│       │
│       ├── db/
│       │   ├── models.py           ← SQLAlchemy ORM table definitions
│       │   └── session.py          ← DB engine + get_db factory
│       │
│       ├── core/
│       │   ├── cache.py            ← In-memory TTL response cache
│       │   ├── config.py           ← Environment variable loader (includes AUTH_MODE, ADMIN_EMAILS, ALLOWED_DOMAINS)
│       │   ├── logging.py          ← Coloured terminal logger
│       │   └── utils.py            ← Shared helper functions
│       │
│       └── dependencies/
│           ├── auth.py             ← get_current_user() + require_role() RBAC guards
│           ├── db.py               ← Re-exports get_db for clean imports
│           └── services.py         ← DEPRECATED stub (safe to ignore)
│
├── deploy/                         ← Production deployment configs
│   ├── nginx/
│   │   └── toray-dashboard.conf   ← Reverse proxy + oauth2-proxy auth_request integration
│   └── oauth2-proxy/
│       └── oauth2-proxy.cfg       ← Azure AD (TorayDemo) OIDC provider config
│
└── frontend/                       ← React / Vite app
    ├── index.html                  ← HTML shell
    ├── package.json                ← npm dependencies & scripts
    ├── vite.config.js              ← Vite + Tailwind plugin setup
    ├── .env                        ← Frontend env vars (VITE_API_URL, VITE_AUTH_MODE)
    ├── .env.example                ← Template
    │
    ├── public/
    │   └── Tanuki-new 1.png        ← Logo image (served as /Tanuki-new 1.png)
    │
    └── src/
        ├── main.jsx                ← React DOM mount + BrowserRouter + i18n init
        ├── App.jsx                 ← Route definitions + mode-aware ProtectedRoute guard
        ├── Login.jsx               ← SSO login page (dev mock or Azure AD redirect)
        ├── index.css               ← Global styles / Tailwind directives
        │
        ├── services/
        │   └── apiClient.js        ← All fetch() calls to the backend (includes upload, translate)
        │
        └── dashboard/
            ├── Dashboard.jsx       ← Page layout — assembles all panels
            │
            ├── hooks/
            │   ├── useDashboard.js ← All state, data fetching, pagination, global sort logic
            │   ├── useTranslate.js ← Language translation hook (Azure Translator integration)
            │   └── useCountUp.js   ← Animated number count-up hook for stat cards
            │
            ├── sub_components/
            │   ├── StatCards.jsx        ← Three KPI metric cards (top row) with translation support
            │   ├── PeakUsage.jsx        ← Layered-pill bar chart + FAQ panel
            │   ├── UsersTable.jsx       ← Sortable, paginated users grid
            │   ├── ChatListPanel.jsx    ← Slide-in chat list with delete confirmation
            │   ├── ChatConversation.jsx ← Message thread viewer
            │   └── UploadModal.jsx      ← File upload modal (admin only)
            │
            └── utils/
                └── helpers.jsx     ← generatePages(), parseBold(), formatDuration()
```

---

## Backend — File by File

### `backend/run.py`

The development server launcher. Reads `PORT` from config and boots **uvicorn** with hot-reload.

```
python run.py
```

Never used in production — a process manager (e.g. systemd, Docker) starts uvicorn directly.

---

### `backend/requirements.txt`

All Python dependencies:

| Package               | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `fastapi`             | Web framework                               |
| `uvicorn[standard]`   | ASGI server (runs FastAPI)                  |
| `sqlalchemy[asyncio]` | ORM + async support                         |
| `aiomysql`            | Async MySQL driver                          |
| `pydantic`            | Data validation / response models           |
| `pydantic-settings`   | Settings management                         |
| `python-dotenv`       | Loads `.env` files                          |
| `cryptography`        | Required by aiomysql for secure connections |

---

### `backend/src/.env` _(secret, not in git)_

Runtime secrets loaded at startup. All values must use `KEY=value` format (no spaces around `=`).

| Key                    | Description                              | Example                                                   |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `ENV`                  | Environment mode                         | `dev`                                                     |
| `PORT`                 | Server port                              | `5000`                                                    |
| `ALLOWED_CORS_ORIGINS` | Comma-separated allowed origins          | `http://localhost:5173`                                   |
| `DB_URL`               | SQLAlchemy async connection string       | `mysql+aiomysql://root:root@localhost:3306/chat_bot_data` |
| `DB_POOL_SIZE`         | Connection pool size                     | `10`                                                      |
| `DB_MAX_OVERFLOW`      | Max extra connections above pool         | `20`                                                      |
| `DB_POOL_TIMEOUT`      | Seconds to wait for a free connection    | `30`                                                      |
| `AUTH_MODE`            | `dev` = mock admin, `prod` = Azure AD    | `dev`                                                     |
| `ADMIN_EMAILS`         | Comma-separated list of admin emails     | `admin@test.com`                                          |
| `ALLOWED_DOMAINS`      | Comma-separated email domains for access | `@srmtech.com`                                            |
| `UPLOAD_DIR`           | Absolute path for uploaded files         | `/var/app/uploads` (defaults to project root `/uploads`)  |

---

### `backend/src/main.py`

The **FastAPI app factory**. Responsibilities:

- Creates the `FastAPI()` instance with the app title and lifespan hook
- Registers CORS middleware (allows the React dev server to call the API)
- Registers GZip middleware (compresses responses > 1 KB)
- Registers a **request logging middleware** that records method, path, HTTP status, and duration in milliseconds for every request. Root health-check (`GET /`) is excluded to keep logs clean
- Registers **three global exception handlers**:
  - `SQLAlchemyError` → 503 with a safe message (full traceback logged server-side only)
  - `RequestValidationError` → 422 with structured field-level error details
  - `Exception` (catch-all) → 500, prevents raw stack traces from reaching the client
- Mounts the API router at the `/api` prefix
- Exposes a root `GET /` health-check route

---

### `backend/src/lifespan.py`

Runs code **before** the server accepts requests (startup) and **after** it stops (shutdown).

- **Startup**: Executes `SELECT 1` to verify the MySQL connection. If this fails, the server refuses to start.
- **Startup**: Logs the local URL and `/docs` Swagger link (in `dev` mode).
- **Shutdown**: Disposes the connection pool cleanly.

---

### `backend/src/api/routes.py`

**HTTP layer only** — no business logic. Each function:

1. Declares an HTTP method + path
2. Accepts query parameters via `Query()`
3. Injects auth dependencies (`get_current_user` or `require_role("admin")`)
4. Injects a `db` session via `Depends(get_db)`
5. Calls the matching function in `services/dashboard.py`
6. Returns the result (FastAPI serialises it against `response_model`)

| Route                                       | Method | Auth           | Description                         |
| ------------------------------------------- | ------ | -------------- | ----------------------------------- |
| `GET /api/stats`                            | GET    | Logged-in user | KPI metric cards                    |
| `GET /api/peak-usage`                       | GET    | Logged-in user | Bar chart data                      |
| `GET /api/faqs`                             | GET    | Logged-in user | Top 5 most-asked questions          |
| `GET /api/users`                            | GET    | Logged-in user | Paginated enriched user list        |
| `GET /api/users/{user_id}/conversations`    | GET    | Logged-in user | Paginated conversations for a user  |
| `GET /api/conversations/{chat_id}/messages` | GET    | Logged-in user | All messages in a conversation      |
| `DELETE /api/conversations/{chat_id}`       | DELETE | **Admin only** | Hard-delete conversation + messages |
| `POST /api/upload-file`                     | POST   | **Admin only** | Validated file upload (type + size) |
| `POST /api/translate`                       | POST   | **Admin only** | Translation stub (returns 501)      |

**File upload validation rules:**

| `file_type`  | Allowed extensions                                        |
| ------------ | --------------------------------------------------------- |
| `faq`        | `.json`, `.csv`                                           |
| `persona`    | `.json`, `.txt`                                           |
| `document`   | `.pdf`, `.docx`, `.txt`                                   |
| `pre-login`  | `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` |
| `post-login` | `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` |

Maximum file size: **10 MB**. If a file already exists, a 409 is returned with `file_exists: true` so the frontend can prompt for overwrite confirmation before re-submitting with `confirm_reupload=true`.

The upload directory resolves from the `UPLOAD_DIR` environment variable, defaulting to an absolute path anchored to the project root — never a CWD-relative path.

---

### `backend/src/core/cache.py`

A **zero-dependency in-memory TTL cache** for async service functions.

- Cache store: `dict` keyed by SHA-256 hash of `(function_name + serialised arguments)`. Each entry is a 3-tuple `(result, expires_at, owner_fn_name)`.
- SQLAlchemy `AsyncSession` objects are excluded from cache keys automatically (they are not serialisable and differ per request).
- Entries expire lazily on the next read after the TTL elapses.
- The `@cached(ttl_seconds=N)` decorator wraps any async function.
- Each decorated function exposes `.invalidate()` which clears **only** that function's own cache entries, leaving other functions' caches untouched.
- Cache is cleared automatically after any mutation (e.g. conversation delete).

```python
@cached(ttl_seconds=300)
async def get_stats(start, end, db):
    ...
```

---

### `backend/src/services/dashboard.py`

**All business logic and database queries** live here. Routes never touch SQL directly.

#### Metric functions (cached for 5 minutes each)

| Function                         | What it computes                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `get_stats(start, end, db)`      | Active users (distinct emails), total conversations, satisfaction rate via portable `case()` expression |
| `get_peak_usage(start, end, db)` | Conversation counts grouped by time bucket, normalised to 0–95% and split into Low/Med/High layers      |
| `get_faqs(start, end, db)`       | Top 5 most-asked `user_message` values with one representative `bot_response` per question              |

#### Peak-usage grouping strategy

The view type is selected automatically based on the date range span. The no-range default (`delta == -1`) is evaluated first to prevent it from being shadowed:

| Date range span    | Groups by      | Label example |
| ------------------ | -------------- | ------------- |
| No range (default) | Day of week    | "Mon"         |
| 0 days (same day)  | Hour of day    | "09h"         |
| 1 – 14 days        | Actual date    | "Apr 14"      |
| 15 – 90 days       | Day of week    | "Mon"         |
| 91 – 730 days      | Month in range | "Jan"         |
| > 730 days         | Calendar year  | "2025"        |

Cross-year monthly ranges (e.g. Nov 2024 → Mar 2025) are handled correctly — the deduplication key is `(year, month)` so January 2024 and January 2025 produce separate bars.

#### User / chat functions

| Function                                     | Description                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `fetch_enriched_users(db, skip, limit)`      | Paginated. JOINs conversations + feedback → rating, avgDur, progress, handle. All aggregation in SQL. |
| `fetch_user_chats(user_id, db, skip, limit)` | Paginated conversations for one user (newest first)                                                   |
| `fetch_chat_messages(chat_id, db)`           | All messages in a conversation as user/bot pairs                                                      |
| `remove_conversation_data(chat_id, db)`      | Deletes feedback rows, then conversation (CASCADE removes child messages)                             |

**SQL optimisation**: `progress` bar values and all per-user aggregates (avg duration, rating) are computed entirely inside MySQL using subqueries and `func.least` / `func.nullif`. No Python-level loops over result rows.

---

### `backend/src/models/schemas.py`

**Pydantic response models** — the contract between backend and frontend.

| Schema              | Used by                                        |
| ------------------- | ---------------------------------------------- |
| `StatCard`          | `GET /api/stats`                               |
| `PeakUsagePoint`    | `GET /api/peak-usage`                          |
| `FaqItem`           | `GET /api/faqs`                                |
| `UserResponse`      | `GET /api/users`                               |
| `PaginatedUsers`    | `GET /api/users` (pagination envelope)         |
| `ChatResponse`      | `GET /api/users/{id}/conversations`            |
| `PaginatedChats`    | `GET /api/users/{id}/conversations` (envelope) |
| `MessageResponse`   | `GET /api/conversations/{id}/messages`         |
| `DeleteResponse`    | `DELETE /api/conversations/{id}`               |
| `UploadResponse`    | `POST /api/upload-file`                        |
| `TranslateRequest`  | `POST /api/translate` (request body)           |
| `TranslateResponse` | `POST /api/translate`                          |

FastAPI validates outgoing data against these models and generates Swagger docs at `/docs` automatically.

---

### `backend/src/db/models.py`

**SQLAlchemy ORM table definitions** — mirrors the MySQL schema exactly.

| Table           | Key columns                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | `id`, `user_email`, `title`, `last_message`, `last_message_at`, `total_messages`, `total_tokens`, `created_at`                          |
| `messages`      | `id`, `conversation_id` (FK → conversations), `user_message`, `bot_response`, `total_tokens`, `meta_data`, `created_at`, `responded_at` |
| `feedback`      | `id`, `message_id`, `conversation_id`, `user_email`, `feedback_type` ENUM('like','dislike'), `comment`, `created_at`                    |

`conversations → messages` is a one-to-many relationship with `cascade="all, delete-orphan"`.

---

### `backend/src/db/session.py`

Creates the **async SQLAlchemy engine** and the **session factory**.

- `engine` — the connection pool (imported by `lifespan.py` for the startup ping and by `main.py` for the exception handler)
- `AsyncSessionLocal` — a factory that creates database sessions
- `get_db()` — an async generator used as a FastAPI dependency; automatically commits on success and rolls back on any exception

---

### `backend/src/core/config.py`

Loads `.env` using an **explicit path** resolved from `__file__`, so the file is always found regardless of which directory the server is started from.

Exports typed constants: `PORT`, `ENV`, `ALLOWED_CORS_ORIGINS`, `DB_URL`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `AUTH_MODE`, `ADMIN_EMAILS`, `ALLOWED_DOMAINS`.

---

### `backend/src/core/logging.py`

A custom coloured console logger. Each log level prints in a distinct ANSI colour (DEBUG=cyan, INFO=green, WARNING=yellow, ERROR=red). Uvicorn's own access log is disabled so only the application logger is visible.

Exports: `logger` — import this in any module instead of using Python's root logger.

---

### `backend/src/core/utils.py`

Stateless helper functions with **no framework or database imports**.

| Function                       | Description                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `format_dur(seconds)`          | `90 → "1m 30s"`, `None → "N/A"`                                                                                             |
| `format_date(dt)`              | `datetime(2026,4,8) → "Apr 8"`, `None → "N/A"`                                                                              |
| `parse_date_range(start, end)` | Parses ISO strings to `(start_dt, end_dt, delta_days)`; end is set to 23:59:59; `delta_days == -1` means no range was given |

---

### `backend/src/dependencies/auth.py`

Two functions that protect every API route:

**`get_current_user()`**

- Reads `X-Auth-Request-Email` and `X-Auth-Request-User` headers injected by oauth2-proxy.
- If `AUTH_MODE=dev` and headers are missing → injects a mock admin user so local development works without NGINX or Azure.
- If `AUTH_MODE=prod` and headers are missing → returns `401 Unauthorized`.

**`require_role("admin")`**

- Checks if the user's email is in `ADMIN_EMAILS`, **or** if the email's domain exactly matches one of the `ALLOWED_DOMAINS` entries.
- Domain matching extracts the full domain (`@srmtech.com`) and compares it exactly — suffix-only matches (e.g. `evil@notsrmtech.com`) are rejected.
- Returns `403 Forbidden` if neither condition is met.

---

### `backend/src/dependencies/db.py`

Re-exports `get_db` from `db/session.py`. Routes import from here instead of reaching into the implementation module directly, giving a single stable import path.

---

---

## Deployment — Production Infrastructure

### `deploy/oauth2-proxy/oauth2-proxy.cfg`

Connects oauth2-proxy to the **TorayDemo** Azure App Registration using OIDC. Intercepts incoming requests, forces unauthenticated users to the Microsoft login page, and injects validated identity headers (`X-Auth-Request-Email`, `X-Auth-Request-User`) into every upstream request.

### `deploy/nginx/toray-dashboard.conf`

Nginx serves the compiled frontend static files, routes `/api` to FastAPI (port 5000), and routes `/oauth2` to oauth2-proxy (port 4180). Every `/api` request passes through an `auth_request /oauth2/auth` check before being forwarded; unauthenticated requests are redirected to `/oauth2/sign_in`.

---

---

## Frontend — File by File

### `frontend/index.html`

The single HTML page shell that Vite injects the built JavaScript bundle into. Contains the `<div id="root">` mount point and the `<script type="module">` tag pointing to `main.jsx`.

---

### `frontend/vite.config.js`

Configures **Vite** as the bundler and dev server. Enables the `@vitejs/plugin-react` transform (JSX → JS) and the `@tailwindcss/vite` plugin.

---

### `frontend/package.json`

npm dependencies:

| Package               | Purpose                     |
| --------------------- | --------------------------- |
| `react` / `react-dom` | UI library                  |
| `react-router-dom`    | Client-side routing         |
| `tailwindcss`         | Utility-first CSS           |
| `lucide-react`        | Icon library                |
| `react-hot-toast`     | Notification popups/toasts  |
| `react-i18next`       | Internationalisation (i18n) |
| `vite`                | Bundler + dev server        |

---

### `frontend/.env`

```
VITE_API_URL=http://localhost:5000/api
VITE_AUTH_MODE=dev
```

`VITE_AUTH_MODE` controls whether the login page uses the mock dev flow or redirects to Azure AD. `VITE_API_URL` tells the frontend where the backend is. The `VITE_` prefix is required for Vite to expose variables to browser code.

---

### `frontend/src/main.jsx`

Root render entry point. Mounts the app inside `BrowserRouter` and initialises the i18n system before rendering.

---

### `frontend/src/App.jsx`

Defines two routes:

| Path         | Component            | Guard                                                                            |
| ------------ | -------------------- | -------------------------------------------------------------------------------- |
| `/login`     | `Login.jsx`          | Public                                                                           |
| `/dashboard` | `Dashboard.jsx`      | `ProtectedRoute` — mode-aware (trusts proxy in prod, checks localStorage in dev) |
| `*`          | Redirect to `/login` | —                                                                                |

Both pages are lazy-loaded via `React.lazy()` so the initial bundle stays small.

`ProtectedRoute` behaviour by mode:

- **prod**: assumes NGINX + oauth2-proxy have already verified the user — renders children immediately with no localStorage check (avoids redirect loop)
- **dev**: checks `localStorage.isLoggedIn === "true"`, redirects to `/login` if absent

---

### `frontend/src/Login.jsx`

The login page. Button behaviour depends on `VITE_AUTH_MODE`:

- **prod**: redirects to `/oauth2/sign_in`, handing off to Microsoft Azure AD
- **dev**: sets `localStorage.isLoggedIn = "true"` and navigates to `/dashboard`

---

### `frontend/src/services/apiClient.js`

**Single source of truth for all API calls.** All functions return parsed JSON directly.

| Export                                    | Endpoint called                                       |
| ----------------------------------------- | ----------------------------------------------------- |
| `getStats(start, end)`                    | `GET /api/stats?start=…&end=…`                        |
| `getPeakUsage(start, end)`                | `GET /api/peak-usage?start=…&end=…`                   |
| `getFaqs(start, end)`                     | `GET /api/faqs?start=…&end=…`                         |
| `getUsers()`                              | `GET /api/users`                                      |
| `getUserConversations(userId)`            | `GET /api/users/{userId}/conversations`               |
| `getConversationMessages(conversationId)` | `GET /api/conversations/{conversationId}/messages`    |
| `deleteConversation(conversationId)`      | `DELETE /api/conversations/{conversationId}`          |
| `uploadFile(file, fileType, overwrite)`   | `POST /api/upload-file` (multipart form, 409 handled) |
| `translateTexts(texts, targetLang)`       | `POST /api/translate`                                 |

Base URL reads from `VITE_API_URL` env var, defaulting to `http://localhost:5000`.

---

### `frontend/src/dashboard/Dashboard.jsx`

The **main page component**. It:

1. Calls `useDashboard()` to get all data and handler functions
2. Renders the fixed header (logo, language toggle, upload modal trigger)
3. Renders the date-range picker
4. Arranges the panels: `StatCards`, `PeakUsage`, `UsersTable`
5. Manages the slide-in chat panel (`ChatListPanel` + `ChatConversation`) as a fixed overlay

---

### `frontend/src/dashboard/hooks/useDashboard.js`

The **brain of the dashboard**. One custom hook that owns all state and logic:

| Responsibility    | Detail                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Data fetching** | Fetches stats, peak-usage, FAQs on mount and whenever dates change (350ms debounce). Cancels stale requests. |
| **User data**     | Fetches users once on mount (not date-filtered)                                                              |
| **Date defaults** | `DEFAULT_START` = start of current week (Monday); `DEFAULT_END` = today                                      |
| **Sorting**       | Sort applied to the **full** user array before pagination, so ranking is globally consistent across pages    |
| **Pagination**    | 10 users per page; `totalPages` derived from full dataset length                                             |
| **Chat panel**    | `openChat(user)`, `closeChat()`, `activeChatId` state                                                        |
| **Error/Loading** | Separate `isLoading`, `isUsersLoading`, `isError` flags passed to child components                           |
| **Responsive**    | Tracks `windowDimensions` with a debounced resize listener to size the slide-in panel                        |

---

### `frontend/src/dashboard/hooks/useTranslate.js`

Translates an array of English strings whenever the active i18n language changes. Maps i18next language codes to Azure Translator BCP-47 codes. Returns the original strings immediately for English (no API call). Falls back to originals on translation error. Uses a request-ID ref to discard stale responses from previous language switches.

---

### `frontend/src/dashboard/hooks/useCountUp.js`

Animates numeric strings (e.g. `"1,234"`, `"87.5%"`) from 0 to their target value using `requestAnimationFrame` with an `easeOutQuart` curve. Non-numeric strings (e.g. `"N/A"`) are returned immediately without animation. Re-animates whenever the source value changes.

---

### `frontend/src/dashboard/sub_components/StatCards.jsx`

Renders **3 KPI cards** in a responsive grid. Each card is driven by the `StatCard` schema:

- Passes all card titles and trend strings through `useTranslate` for i18n support
- If `trend` is present → shows a `TrendingUp` or `TrendingDown` icon
- If `badge` is present → shows a coloured dot (green/amber/red) + badge text
- While loading → shows 3 skeleton placeholder cards (animated pulse)

---

### `frontend/src/dashboard/sub_components/PeakUsage.jsx`

A two-panel card (2/3 + 1/3 grid):

**Left — Bar chart**: Renders layered pills for each time bucket. Hover shows a tooltip with exact usage percentage. Peak bucket is highlighted. Skeleton bars shown while loading.

**Right — FAQ panel**: Top 5 most-asked questions from the API. Empty state handled.

---

### `frontend/src/dashboard/sub_components/UsersTable.jsx`

A full-featured data table:

| Feature         | Detail                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Columns**     | Full Name / Handle, Rating (stars), Conversations + Last Active, Avg Duration + progress bar |
| **Sorting**     | Rating and Avg Duration columns sort globally across all pages (not just the current page)   |
| **Pagination**  | Previous / Next buttons + numbered page buttons with ellipsis logic via `generatePages()`    |
| **Loading**     | Spinner + animated text while users are fetching                                             |
| **Empty state** | Users icon and "No users found" message                                                      |

---

### `frontend/src/dashboard/sub_components/ChatListPanel.jsx`

A slide-in panel showing **all conversations** for the selected user:

- Fetches from `GET /api/users/{id}/conversations` when a user is selected
- Delete conversation: trash icon opens an inline confirmation popover; on confirm calls `DELETE /api/conversations/{id}` and removes from local state
- Separate loading, error, and empty states
- Confirmation popover resets automatically when the panel closes

---

### `frontend/src/dashboard/sub_components/ChatConversation.jsx`

Shows the **message thread** for the active conversation:

- Fetches from `GET /api/conversations/{id}/messages` when `activeChatId` changes
- User messages styled right-aligned (blue), bot responses left-aligned (grey)
- Uses a memoised `MessageBubble` component so `parseBold` only re-runs when the message itself changes
- Auto-scrolls to the latest message on load
- Separate loading, error, and empty states

---

### `frontend/src/dashboard/sub_components/UploadModal.jsx`

Admin-only file upload modal:

- Lets an admin select a `file_type` and upload a matching file
- Client-side validates file extension before sending
- Handles 409 (file exists) → shows overwrite confirmation before re-submitting with `confirm_reupload=true`
- Shows success/error feedback inline

---

### `frontend/src/dashboard/utils/helpers.jsx`

| Export                          | Description                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `generatePages(current, total)` | Returns an array like `[1, '...', 4, 5, 6, '...', 20]` for the pagination UI         |
| `parseBold(str)`                | Converts `**bold**` markdown to `<strong>` JSX; returns `null` for empty input       |
| `formatDuration(str)`           | Converts raw duration strings like `"182m 55s"` to compact `"3h 02m"` display format |

---

---

## Data Flow

```
User opens browser
  └─ main.jsx mounts App.jsx inside BrowserRouter
      └─ Navigates to /dashboard (ProtectedRoute checks auth mode)
          └─ Dashboard.jsx renders
              └─ useDashboard.js runs
                  ├─ On mount:
                  │   ├─ getUsers()      →  GET /api/users
                  │   ├─ getStats()      →  GET /api/stats?start=…&end=…
                  │   ├─ getPeakUsage()  →  GET /api/peak-usage?start=…&end=…
                  │   └─ getFaqs()       →  GET /api/faqs?start=…&end=…
                  │
                  └─ On date change (350ms debounce):
                      ├─ getStats(newStart, newEnd)
                      ├─ getPeakUsage(newStart, newEnd)
                      └─ getFaqs(newStart, newEnd)

Each GET request hits FastAPI
  └─ main.py logs method + path + status + duration
      └─ auth dependency validates identity headers
          └─ routes.py declares the endpoint
              └─ cache.py checks for a fresh cached result (5-min TTL)
                  └─ (cache miss) services/dashboard.py runs the SQL query
                      └─ db/session.py provides the AsyncSession
                          └─ MySQL returns data
                              └─ Python formats and returns JSON
                                  └─ Pydantic validates the shape (schemas.py)
                                      └─ JSON reaches the browser
                                          └─ React renders the component
```

---

## How to Run

### Backend

```bash
cd backend
pip install -r requirements.txt
# Copy .env.example → .env and fill in your DB credentials
python run.py
# API available at http://localhost:5000
# Swagger docs at http://localhost:5000/docs
```

### Frontend

```bash
cd frontend
npm install
# Copy .env.example → .env (set VITE_API_URL and VITE_AUTH_MODE)
npm run dev
# App available at http://localhost:5173
```

---

## Dev vs Production Behaviour

|                       | Dev Mode                          | Prod Mode                               |
| --------------------- | --------------------------------- | --------------------------------------- |
| Login                 | localStorage flag                 | Microsoft Azure AD via oauth2-proxy     |
| Backend user identity | Mock admin injected automatically | Read from `X-Auth-Request-Email` header |
| NGINX required        | No                                | Yes                                     |
| oauth2-proxy required | No                                | Yes                                     |
| `AUTH_MODE`           | `dev`                             | `prod`                                  |
| `VITE_AUTH_MODE`      | `dev`                             | `prod`                                  |
| `VITE_API_URL`        | `http://localhost:5000/api`       | `/api`                                  |
