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
│       ├── main.py                 ← FastAPI app factory
│       ├── lifespan.py             ← Startup/shutdown events
│       │
│       ├── api/
│       │   └── routes.py           ← HTTP route declarations
│       │
│       ├── services/
│       │   ├── dashboard.py        ← All business logic & SQL queries
│       │   └── service.py          ← DEPRECATED stub (safe to ignore)
│       │
│       ├── models/
│       │   └── schemas.py          ← Pydantic response shapes
│       │
│       ├── db/
│       │   ├── models.py           ← SQLAlchemy ORM table definitions
│       │   └── session.py          ← DB engine + get_db factory
│       │
│       ├── core/
│       │   ├── config.py           ← Environment variable loader
│       │   ├── logging.py          ← Coloured terminal logger
│       │   └── utils.py            ← Shared helper functions
│       │
│       └── dependencies/
│           ├── db.py               ← Re-exports get_db for clean imports
│           └── services.py         ← DEPRECATED stub (safe to ignore)
│
└── frontend/                       ← React / Vite app
    ├── index.html                  ← HTML shell
    ├── package.json                ← npm dependencies & scripts
    ├── vite.config.js              ← Vite + Tailwind plugin setup
    ├── .env                        ← Frontend env vars (VITE_API_URL)
    ├── .env.example                ← Template
    │
    ├── public/
    │   └── Tanuki-new 1.png        ← Logo image (served as /Tanuki-new 1.png)
    │
    └── src/
        ├── main.jsx                ← React DOM mount + BrowserRouter
        ├── App.jsx                 ← Route definitions + ProtectedRoute guard
        ├── Login.jsx               ← SSO email login page
        ├── index.css               ← Global styles / Tailwind directives
        │
        ├── services/
        │   └── apiClient.js        ← All fetch() calls to the backend
        │
        └── dashboard/
            ├── Dashboard.jsx       ← Page layout — assembles all panels
            │
            ├── hooks/
            │   └── useDashboard.js ← All state, data fetching, sorting logic
            │
            ├── sub_components/
            │   ├── StatCards.jsx        ← Three KPI metric cards (top row)
            │   ├── PeakUsage.jsx        ← Layered-pill bar chart + FAQ panel
            │   ├── UsersTable.jsx       ← Sortable, paginated users grid
            │   ├── ChatListPanel.jsx    ← Slide-in chat list for a user
            │   └── ChatConversation.jsx ← Message thread viewer
            │
            └── utils/
                └── helpers.jsx     ← generatePages() + parseBold()
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

| Key                    | Description                           | Example                                                   |
| ---------------------- | ------------------------------------- | --------------------------------------------------------- |
| `ENV`                  | Environment mode                      | `dev`                                                     |
| `PORT`                 | Server port                           | `5000`                                                    |
| `ALLOWED_CORS_ORIGINS` | Comma-separated allowed origins       | `http://localhost:5173`                                   |
| `DB_URL`               | SQLAlchemy async connection string    | `mysql+aiomysql://root:root@localhost:3306/chat_bot_data` |
| `DB_POOL_SIZE`         | Connection pool size                  | `10`                                                      |
| `DB_MAX_OVERFLOW`      | Max extra connections above pool      | `20`                                                      |
| `DB_POOL_TIMEOUT`      | Seconds to wait for a free connection | `30`                                                      |

---

### `backend/src/main.py`

The **FastAPI app factory**. Responsibilities:

- Creates the `FastAPI()` instance with the app title and lifespan hook
- Registers CORS middleware (allows the React dev server to call the API)
- Registers GZip middleware (compresses responses > 1 KB)
- Mounts the API router at the `/api` prefix
- Exposes a root `GET /` health-check route

---

### `backend/src/lifespan.py`

Runs code **before** the server accepts requests (startup) and **after** it stops (shutdown).

- **Startup**: Executes `SELECT 1` to verify the MySQL connection. If this fails, the server refuses to start.
- **Startup**: Logs the local URL and `/docs` Swagger link (in `dev` mode).
- **Shutdown**: Logs a shutdown message.

---

### `backend/src/api/routes.py`

**HTTP layer only** — no business logic. Each function:

1. Declares an HTTP method + path
2. Accepts query parameters via `Query()`
3. Injects a `db` session via `Depends(get_db)`
4. Calls the matching function in `services/dashboard.py`
5. Returns the result (FastAPI serialises it against `response_model`)

| Route                           | Method | Description                      |
| ------------------------------- | ------ | -------------------------------- |
| `/api/stats`                    | GET    | KPI metric cards                 |
| `/api/peak-usage`               | GET    | Bar chart data                   |
| `/api/faqs`                     | GET    | Top 5 most-asked questions       |
| `/api/users`                    | GET    | Enriched user list               |
| `/api/users/{user_id}`          | DELETE | Remove a user and all their data |
| `/api/users/{user_id}/chats`    | GET    | All conversations for a user     |
| `/api/chats/{chat_id}/messages` | GET    | All messages in a conversation   |

All routes except `/users` accept `?start=YYYY-MM-DD&end=YYYY-MM-DD` query params.

---

### `backend/src/services/dashboard.py`

**All business logic and database queries** live here. Routes never touch SQL directly.

#### Metric functions (all live queries)

| Function                         | What it computes                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `get_stats(start, end, db)`      | Active users (distinct emails), total conversations, satisfaction rate (like %)                                   |
| `get_peak_usage(start, end, db)` | Conversation counts grouped by day-of-week / date / month, normalised to 0-95% and split into Low/Med/High layers |
| `get_faqs(start, end, db)`       | Top 5 most-asked `user_message` values; `bot_response` is used as the answer                                      |

#### Peak-usage grouping strategy

| Date range span          | Groups by                              | Label example |
| ------------------------ | -------------------------------------- | ------------- |
| 0 days (Same Day)        | Busiest hours (Hourly)                 | "09h"         |
| 1 – 14 days              | Actual date (Daily)                    | "Apr 14"      |
| 15 – 90 days _(default)_ | Day of week aggregate pattern (Weekly) | "Mon"         |
| 91 – 730 days            | Actual months in range (Monthly)       | "Jan"         |
| > 730 days               | Calendar year (Yearly)                 | "2025"        |

#### User / chat functions

| Function                           | Description                                                       |
| ---------------------------------- | ----------------------------------------------------------------- |
| `fetch_enriched_users(db)`         | JOINs conversations + feedback → rating, avgDur, progress, handle |
| `fetch_user_chats(user_id, db)`    | All conversations for one user (newest first)                     |
| `fetch_chat_messages(chat_id, db)` | All messages in a conversation as user/bot pairs                  |
| `remove_user_data(user_id, db)`    | Deletes feedback rows, then conversations (cascades to messages)  |

---

### `backend/src/models/schemas.py`

**Pydantic response models** — the contract between backend and frontend.

| Schema            | Used by                    |
| ----------------- | -------------------------- |
| `StatCard`        | `/api/stats`               |
| `PeakUsagePoint`  | `/api/peak-usage`          |
| `FaqItem`         | `/api/faqs`                |
| `UserResponse`    | `/api/users`               |
| `ChatResponse`    | `/api/users/{id}/chats`    |
| `MessageResponse` | `/api/chats/{id}/messages` |
| `DeleteResponse`  | `DELETE /api/users/{id}`   |

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

- `engine` — the connection pool (imported by `lifespan.py` for the startup ping)
- `AsyncSessionLocal` — a factory that creates database sessions
- `get_db()` — an async generator used as a FastAPI dependency; automatically commits on success and rolls back on any exception

---

### `backend/src/core/config.py`

Loads `.env` using an **explicit path** resolved from `__file__`, so the file is always found regardless of which directory the server is started from.

Exports typed constants: `PORT`, `ENV`, `ALLOWED_CORS_ORIGINS`, `DB_URL`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`.

---

### `backend/src/core/logging.py`

A custom coloured console logger. Each log level prints in a distinct ANSI colour (DEBUG=cyan, INFO=green, WARNING=yellow, ERROR=red). Uvicorn's own access log is disabled so only the application logger is visible.

Exports: `logger` — import this in any module instead of using Python's root logger.

---

### `backend/src/core/utils.py`

Stateless helper functions with **no framework or database imports**.

| Function                       | Description                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `format_dur(seconds)`          | `90 → "1m 30s"`, `None → "N/A"`                                                                                                 |
| `format_date(dt)`              | `datetime(2026,4,8) → "Apr 8"`, `None → "N/A"`                                                                                  |
| `parse_date_range(start, end)` | Parses ISO strings to `(start_dt, end_dt, delta_days)`; end is set to 23:59:59; invalid strings produce no-filter `None` values |

---

### `backend/src/dependencies/db.py`

Re-exports `get_db` from `db/session.py`. Routes import from here instead of reaching into the implementation module directly, giving a single stable import path.

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

| Package                        | Purpose                       |
| ------------------------------ | ----------------------------- |
| `react` / `react-dom`          | UI library                    |
| `react-router-dom`             | Client-side routing           |
| `tailwindcss`                  | Utility-first CSS             |
| `lucide-react`                 | Icon library                  |
| `react-hot-toast`              | Notification popups/toasts    |
| `vite`                         | Bundler + dev server          |
| `chart.js` / `react-chartjs-2` | Installed but unused (legacy) |

---

### `frontend/.env`

```
VITE_API_URL=http://localhost:5000/api
```

Tells the frontend where the backend is. Prefix `VITE_` is required for Vite to expose the variable to browser code.

---

### `frontend/public/Tanuki-new 1.png`

The logo image. Referenced as `src="/Tanuki-new 1.png"` in both the Login page and the Dashboard header. Vite serves `public/` files at the root path.

---

### `frontend/src/main.jsx`

Root render entry point:

```jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

---

### `frontend/src/App.jsx`

Defines two routes:

| Path         | Component            | Guard                                                 |
| ------------ | -------------------- | ----------------------------------------------------- |
| `/login`     | `Login.jsx`          | Public                                                |
| `/dashboard` | `Dashboard.jsx`      | `ProtectedRoute` (requires `localStorage.isLoggedIn`) |
| `*`          | Redirect to `/login` | —                                                     |

Both pages are lazy-loaded via `React.lazy()` so the initial bundle stays small.

---

### `frontend/src/Login.jsx`

The SSO login page. Validates the email address with a regex, sets `localStorage.isLoggedIn = 'true'`, then navigates to `/dashboard`. Does not currently call the backend — authentication is frontend-only (localStorage flag).

---

### `frontend/src/index.css`

Global stylesheet. Sets the base font, background colour, and `@tailwind` directive imports.

---

### `frontend/src/services/apiClient.js`

**Single source of truth for all API calls.** All functions return parsed JSON directly (no `.json()` call needed at call sites).

| Export                     | Endpoint called                     |
| -------------------------- | ----------------------------------- |
| `getStats(start, end)`     | `GET /api/stats?start=…&end=…`      |
| `getPeakUsage(start, end)` | `GET /api/peak-usage?start=…&end=…` |
| `getFaqs(start, end)`      | `GET /api/faqs?start=…&end=…`       |
| `getUsers()`               | `GET /api/users`                    |
| `deleteUser(userId)`       | `DELETE /api/users/{userId}`        |
| `getUserChats(userId)`     | `GET /api/users/{userId}/chats`     |
| `getChatMessages(chatId)`  | `GET /api/chats/{chatId}/messages`  |

Base URL defaults to `http://localhost:5000/api` but reads from `VITE_API_URL` env var automatically.

---

### `frontend/src/dashboard/Dashboard.jsx`

The **main page component**. It:

1. Calls `useDashboard()` to get all data and handler functions
2. Renders the fixed header (logo, logout, language toggle)
3. Renders the date-range picker (collapsible dropdown)
4. Arranges the four panels: `StatCards`, `PeakUsage`, `UsersTable`
5. Manages the slide-in chat panel (`ChatListPanel` + `ChatConversation`) as a fixed overlay with a backdrop blur

---

### `frontend/src/dashboard/hooks/useDashboard.js`

The **brain of the dashboard**. One custom hook that owns all state and logic:

| Responsibility    | Detail                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Data fetching** | Fetches stats, peak-usage, faqs on mount and whenever dates change (350ms debounce)  |
| **User data**     | Fetches users once on mount (not date-filtered)                                      |
| **Date defaults** | `DEFAULT_START` = Jan 1 current year; `DEFAULT_END` = today (dynamic, not hardcoded) |
| **Sorting**       | Multi-key sort by rating, convos, or avgDur — each column cycles High → Low          |
| **Pagination**    | Calculates `usersPerPage` from window width; slices `displayedUsers`                 |
| **Chat panel**    | `openChat(user)`, `closeChat()`, `activeChatId` state                                |
| **Delete**        | Calls `apiDeleteUser()`, removes user from local state, closes panel if open         |
| **Error/Loading** | `isLoading` and `isError` flags passed to child components                           |
| **Responsive**    | Tracks `windowWidth` with a debounced resize listener                                |

---

### `frontend/src/dashboard/sub_components/StatCards.jsx`

Renders **3 KPI cards** in a responsive grid. Each card is driven by the `StatCard` schema:

- If `trend` is present → shows a `TrendingUp` or `TrendingDown` icon
- If `badge` is present → shows a coloured dot (green/amber/red) + badge text
- While loading → shows 3 skeleton placeholder cards (animated pulse)

---

### `frontend/src/dashboard/sub_components/PeakUsage.jsx`

A two-panel card (2/3 + 1/3 grid):

**Left — Bar chart:**

- Renders "layered pills" for each time bucket
- Three overlapping bars (Light blue = Low, Mid blue = Med, Dark blue = High) give a stacked depth effect
- Peak bucket gets an animated pulsing dot
- Hover shows a tooltip card with exact percentages
- While loading → 7 skeleton bars with `animate-pulse`

**Right — FAQ accordion:**

- Each `{question, answer, count}` from the backend becomes an expandable item
- Click to expand/collapse (one open at a time)
- Shows "{count} queries" in small text below each answer
- Empty state: "No FAQs available right now."

---

### `frontend/src/dashboard/sub_components/UsersTable.jsx`

A full-featured data table:

| Feature         | Detail                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Columns**     | Full Name / Handle, Rating (stars), Conversations + Last Active, Avg Duration + progress bar, Actions   |
| **Sorting**     | Rating and Avg Duration columns have up/down chevron sort icons; `handleSort()` is called from the hook |
| **Delete**      | Trash icon opens an inline confirmation popover (not the browser's `window.confirm`)                    |
| **Pagination**  | Previous / Next buttons + numbered page buttons; `generatePages()` handles ellipsis logic               |
| **Empty state** | Shows a Users icon and "No users found" message                                                         |

---

### `frontend/src/dashboard/sub_components/ChatListPanel.jsx`

A slide-in panel showing **all conversations** for the selected user:

- Fetches from `GET /api/users/{id}/chats` when a user is selected
- Each row shows conversation title + formatted `lastMessageAt` date
- Clicking a row sets `activeChatId` (triggers `ChatConversation` to load)
- Has separate loading, error, and empty states

---

### `frontend/src/dashboard/sub_components/ChatConversation.jsx`

Shows the **message thread** for the active conversation:

- Fetches from `GET /api/chats/{id}/messages` when `activeChatId` changes
- User messages styled right-aligned (blue), bot responses left-aligned (grey)
- Uses a memoised `MessageBubble` component so `parseBold` only re-runs when the message itself changes
- Auto-scrolls to the latest message on load
- Has separate loading, error, and empty states

---

### `frontend/src/dashboard/utils/helpers.jsx`

| Export                          | Description                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `generatePages(current, total)` | Returns an array like `[1, '...', 4, 5, 6, '...', 20]` for the pagination UI                   |
| `parseBold(str)`                | Converts `**bold**` markdown syntax to `<strong>` JSX elements; returns `null` for empty input |

---

---

## Data Flow

```
User opens browser
  └─ main.jsx mounts App.jsx inside BrowserRouter
      └─ Navigates to /dashboard (if logged in)
          └─ Dashboard.jsx renders
              └─ useDashboard.js runs
                  ├─ On mount:
                  │   ├─ getUsers()  →  GET /api/users
                  │   ├─ getStats()  →  GET /api/stats?start=…&end=…
                  │   ├─ getPeakUsage() → GET /api/peak-usage?start=…&end=…
                  │   └─ getFaqs() → GET /api/faqs?start=…&end=…
                  │
                  └─ On date change (350ms debounce):
                      ├─ getStats(newStart, newEnd)
                      ├─ getPeakUsage(newStart, newEnd)
                      └─ getFaqs(newStart, newEnd)

Each GET request hits FastAPI
  └─ routes.py declares the endpoint
      └─ services/dashboard.py runs the SQL query
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
# Copy .env.example → .env (set VITE_API_URL if backend isn't on port 5000)
npm run dev
# App available at http://localhost:5173
```
