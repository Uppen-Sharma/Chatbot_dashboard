# Auth & Security Changes — Chatbot Dashboard

## Overview

The application now supports a full Microsoft Azure AD login flow using **oauth2-proxy + NGINX** in production, while keeping a simple mock-login for local development.

Beyond the auth layer itself, a number of security, correctness, and reliability fixes were applied across the backend and frontend. This document covers all of them.

---

## Architecture

```
User Browser
    ↓
NGINX  ←→  oauth2-proxy  ←→  Azure AD (TorayDemo)
    ↓
React Frontend
    ↓
FastAPI Backend  →  In-Memory Cache  →  MySQL
```

- **NGINX** is the single entry point. It blocks every request that isn't authenticated.
- **oauth2-proxy** handles the Microsoft login flow and injects the user's identity into each request as HTTP headers.
- **FastAPI** reads those headers, applies role-based access control, checks the cache, and queries MySQL only on a cache miss.

---

## Files Changed

### NEW — `backend/src/dependencies/auth.py`

Two functions that protect every API route:

**`get_current_user()`**

- Reads `X-Auth-Request-Email` and `X-Auth-Request-User` headers injected by oauth2-proxy.
- If `AUTH_MODE=dev` and headers are missing → injects a mock admin user so local development works without NGINX.
- If `AUTH_MODE=prod` and headers are missing → returns `401 Unauthorized`.

**`require_role("admin")`**

- Checks if the user's email is in `ADMIN_EMAILS`, **or** if the email's domain exactly matches one of the `ALLOWED_DOMAINS` entries.
- Domain matching was hardened (see Bug Fixes below).
- Returns `403 Forbidden` if neither condition is met.
- Future-ready: changing ~3 lines switches this to check Azure Security Groups instead.

---

### MODIFIED — `backend/src/api/routes.py`

All 9 endpoints now have auth dependencies injected:

| Endpoint                               | Protection     |
| -------------------------------------- | -------------- |
| `GET /api/stats`                       | Logged-in user |
| `GET /api/peak-usage`                  | Logged-in user |
| `GET /api/faqs`                        | Logged-in user |
| `GET /api/users`                       | Logged-in user |
| `GET /api/users/{id}/conversations`    | Logged-in user |
| `GET /api/conversations/{id}/messages` | Logged-in user |
| `DELETE /api/conversations/{id}`       | **Admin only** |
| `POST /api/upload-file`                | **Admin only** |
| `POST /api/translate`                  | **Admin only** |

Additional route-level changes in this file:

- `import os` moved from inside the upload handler body to the top-level module imports.
- `_UPLOAD_DIR` changed from a CWD-relative `Path("uploads")` to an absolute path anchored to the project root, with an `UPLOAD_DIR` environment variable override for production deployments. This prevents files from silently landing in an unpredictable directory depending on where the server process was started.
- File upload now returns a structured 409 response with `file_exists: true` when a file already exists, so the frontend can prompt the user for overwrite confirmation before re-submitting with `confirm_reupload=true`.
- Translation endpoint correctly returns HTTP 501 (not implemented) so the frontend can distinguish a pending feature from a silent no-op.

---

### MODIFIED — `backend/src/core/config.py`

Three new environment variables added:

```python
AUTH_MODE       = get_env("AUTH_MODE", "dev")
ADMIN_EMAILS    = get_env("ADMIN_EMAILS", "admin@test.com").split(",")
ALLOWED_DOMAINS = get_env("ALLOWED_DOMAINS", "@srmtech.com").split(",")
```

---

### MODIFIED — `backend/src/core/cache.py`

The in-memory cache was fixed to support **scoped invalidation**. Previously, calling `.invalidate()` on any cached function would clear the entire cache store, silently wiping results cached by other functions.

**Fix**: each cache entry now stores the owning function's name as a third element in a 3-tuple `(result, expires_at, owner_fn_name)`. The `.invalidate()` method filters by this field, so `get_stats.invalidate()` only removes `get_stats` entries and leaves `get_peak_usage` and `get_faqs` caches untouched.

---

### MODIFIED — `backend/src/services/dashboard.py`

Three correctness bugs fixed:

**1. Portable satisfaction rate query**

`func.if_()` was a raw MySQL-only function call. Replaced with SQLAlchemy's portable `case()` expression, which works across all supported databases and is consistent with how the same pattern is used elsewhere in the same file:

```python
# Before (MySQL-only)
func.sum(func.if_(Feedback.feedback_type == "like", 1, 0))

# After (portable)
func.sum(case((Feedback.feedback_type == "like", 1), else_=0))
```

**2. Unreachable default view-type branch**

The view-type selection chain ended with an `else` block intended to handle `delta_days == -1` (no date range provided). However, the preceding `elif delta_days > 730` branch already captured all remaining positive values, leaving the `else` permanently unreachable. When no date range was given, the code fell into yearly mode instead of the intended weekly default.

Fix: the `delta_days == -1` check is now the **first** branch in the chain, and the dead `else` block was removed:

```python
# Before: delta==-1 was shadowed — always fell through to yearly mode
# After:
if delta_days == -1:
    mode = "weekly"   # default overview, evaluated first
elif delta_days == 0:
    mode = "hourly"
elif 1 <= delta_days <= 14:
    mode = "daily"
...
else:                 # > 730 days
    mode = "yearly"
```

**3. Cross-year monthly chart deduplication**

In monthly mode, the set used to prevent duplicate months was keyed on the month number alone. For date ranges spanning two calendar years (e.g. Nov 2024 → Mar 2025), January 2024 and January 2025 were treated as the same entry and only one bar was produced.

Fix: the deduplication key is now a `(year, month)` tuple:

```python
# Before: seen.add(curr.month)        — collapses Jan 2024 + Jan 2025
# After:  seen.add((curr.year, curr.month))  — distinct entries
```

---

### MODIFIED — `backend/src/.env`

```env
# dev  = mock admin injected, no Azure needed
# prod = requires real oauth2-proxy headers
AUTH_MODE=dev
ADMIN_EMAILS=admin@test.com
ALLOWED_DOMAINS=@srmtech.com
UPLOAD_DIR=                    # leave blank to use project-root default
```

---

### MODIFIED — `frontend/src/Login.jsx`

The login button now checks `VITE_AUTH_MODE`:

```js
if (authMode === "prod") {
  window.location.href = "/oauth2/sign_in"; // hands off to Azure AD
} else {
  localStorage.setItem("isLoggedIn", "true");
  navigate("/dashboard"); // mock dev login
}
```

---

### MODIFIED — `frontend/src/App.jsx`

`ProtectedRoute` is now mode-aware:

```js
if (authMode === "prod") {
  return children; // NGINX already verified the user — trust the proxy
}
const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
return isLoggedIn ? children : <Navigate to="/login" replace />;
```

> Without this fix, the app would redirect-loop in production because oauth2-proxy never sets a localStorage flag.

---

### MODIFIED — `frontend/src/dashboard/hooks/useDashboard.js`

**Sort scope fix**: sorting by rating or average duration previously sorted only the 10 users visible on the current page, meaning a highly-rated user on page 3 would never appear on page 1. The sort now runs on the **full** user array before the page slice is applied, so the ranking is globally consistent:

```js
// Before: slice to page first, then sort within page
const pageSlice = userData.slice(...);
return [...pageSlice].sort(...);

// After: sort the full dataset first, then slice to the current page
const sorted = [...userData].sort(...);
return sorted.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
```

---

### NEW — `deploy/oauth2-proxy/oauth2-proxy.cfg`

Connects oauth2-proxy to the **TorayDemo** Azure App Registration:

```ini
provider        = "oidc"
oidc_issuer_url = "https://login.microsoftonline.com/{tenant-id}/v2.0"
client_id       = "{client-id}"
client_secret   = "PASTE_CLIENT_SECRET_HERE"    # fill in before deploy
cookie_secret   = "PASTE_GENERATED_HERE"        # openssl rand -base64 32
email_domains   = ["srmtech.com"]
```

---

### NEW — `deploy/nginx/toray-dashboard.conf`

NGINX routes all traffic through an auth check before serving anything:

```nginx
location /api/ {
    auth_request /oauth2/auth;            # validate session
    error_page 401 = /oauth2/sign_in;     # redirect if not logged in

    auth_request_set $email $upstream_http_x_auth_request_email;
    proxy_set_header X-Auth-Request-Email $email;

    proxy_pass http://localhost:5000;     # forward to FastAPI
}
```

---

## Bug Fixes Summary

| Area              | Bug                                                      | Fix                                          |
| ----------------- | -------------------------------------------------------- | -------------------------------------------- |
| `auth.py`         | `endswith("@srmtech.com")` matched `evil@notsrmtech.com` | Extract full domain and compare exactly      |
| `cache.py`        | `invalidate()` cleared all functions' caches             | Store `fn_name` in tuple; filter on eviction |
| `dashboard.py`    | `func.if_()` is MySQL-only                               | Replaced with portable `case()` expression   |
| `dashboard.py`    | `delta==-1` branch was dead (shadowed by `elif >730`)    | Moved to top of chain; removed dead `else`   |
| `dashboard.py`    | Cross-year monthly dedup collapsed Jan 2024 + Jan 2025   | Changed `seen` key to `(year, month)` tuple  |
| `routes.py`       | `import os` inside handler body (runs per-request)       | Moved to top-level module imports            |
| `routes.py`       | `_UPLOAD_DIR = Path("uploads")` is CWD-relative          | Absolute path with `UPLOAD_DIR` env override |
| `useDashboard.js` | Sort applied within current page only                    | Sort full array before slicing to page       |

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

---

## Before Going Live — Checklist

- [ ] Paste the Azure Client Secret into `deploy/oauth2-proxy/oauth2-proxy.cfg`
- [ ] Generate and paste a cookie secret (`openssl rand -base64 32`)
- [ ] Add redirect URI in Azure Portal: `https://yourapp.com/oauth2/callback`
- [ ] Replace `yourapp.com` in both config files with the real domain
- [ ] Set `AUTH_MODE=prod` in `backend/src/.env`
- [ ] Set `VITE_AUTH_MODE=prod` and `VITE_API_URL=/api` in `frontend/.env`
- [ ] Set real admin emails in `ADMIN_EMAILS`
- [ ] Set `ALLOWED_DOMAINS` to your organisation's email domain (e.g. `@srmtech.com`)
- [ ] Set `UPLOAD_DIR` to an absolute writable path on the server
