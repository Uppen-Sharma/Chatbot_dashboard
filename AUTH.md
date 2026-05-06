# Auth Changes — Chatbot Dashboard

## Overview

The application now supports a full Microsoft Azure AD login flow using **oauth2-proxy + NGINX** in production, while keeping a simple mock-login for local development.

The dashboard itself (UI, data, charts) is unchanged. Only the access layer was added.

---

## Architecture

```
User Browser
    ↓
NGINX  ←→  oauth2-proxy  ←→  Azure AD (TorayDemo)
    ↓
React Frontend
    ↓
FastAPI Backend  →  MySQL
```

- **NGINX** is the single entry point. It blocks every request that isn't authenticated.
- **oauth2-proxy** handles the Microsoft login flow and injects the user's identity into each request as HTTP headers.
- **FastAPI** reads those headers and applies role-based access control.

---

## Files Changed

### NEW — `backend/src/dependencies/auth.py`

Two functions that protect every API route:

**`get_current_user()`**

- Reads `X-Auth-Request-Email` and `X-Auth-Request-User` headers injected by oauth2-proxy.
- If `AUTH_MODE=dev` and headers are missing → injects a mock admin user so local development works without Azure.
- If `AUTH_MODE=prod` and headers are missing → returns `401 Unauthorized`.

**`require_role("admin")`**

- Checks if the user's email is in the `ADMIN_EMAILS` list, or ends with `@srmtech.com`.
- Returns `403 Forbidden` if neither condition is met.
- Future-ready: changing ~3 lines switches this to check Azure Security Groups instead.

---

### MODIFIED — `backend/src/api/routes.py`

All 9 endpoints now have auth dependencies injected:

| Endpoint                           | Protection     |
| ---------------------------------- | -------------- |
| `GET /stats`                       | Logged-in user |
| `GET /peak-usage`                  | Logged-in user |
| `GET /faqs`                        | Logged-in user |
| `GET /users`                       | Logged-in user |
| `GET /users/{id}/conversations`    | Logged-in user |
| `GET /conversations/{id}/messages` | Logged-in user |
| `DELETE /conversations/{id}`       | **Admin only** |
| `POST /upload-file`                | **Admin only** |
| `POST /translate`                  | **Admin only** |

---

### MODIFIED — `backend/src/core/config.py`

Two new environment variables added:

```python
AUTH_MODE    = get_env("AUTH_MODE", "dev")
ADMIN_EMAILS = get_env("ADMIN_EMAILS", "admin@test.com").split(",")
```

---

### MODIFIED — `backend/src/.env`

```env
# dev  = mock admin injected, no Azure needed
# prod = requires real oauth2-proxy headers
AUTH_MODE=dev
ADMIN_EMAILS=admin@test.com
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

### NEW — `deploy/oauth2-proxy/oauth2-proxy.cfg`

Connects oauth2-proxy to the **TorayDemo** Azure App Registration:

```ini
provider        = "oidc"
oidc_issuer_url = "https://login.microsoftonline.com/97f7fcbd-e642-4be8-b84f-fc2cd7f8d6ff/v2.0"
client_id       = "835546b1-fd9b-4255-b2f1-cd7e8d68d774"
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

## Dev vs Production Behaviour

|                       | Dev Mode                    | Prod Mode                               |
| --------------------- | --------------------------- | --------------------------------------- |
| Login                 | localStorage flag           | Microsoft Azure AD via oauth2-proxy     |
| Backend user          | Mock admin injected         | Read from `X-Auth-Request-Email` header |
| NGINX required        | No                          | Yes                                     |
| oauth2-proxy required | No                          | Yes                                     |
| `AUTH_MODE`           | `dev`                       | `prod`                                  |
| `VITE_AUTH_MODE`      | `dev`                       | `prod`                                  |
| `VITE_API_URL`        | `http://localhost:5000/api` | `/api`                                  |

---

## Before Going Live — Checklist

- [ ] Paste the Azure Client Secret into `deploy/oauth2-proxy/oauth2-proxy.cfg`
- [ ] Generate and paste a cookie secret (`openssl rand -base64 32`)
- [ ] Add redirect URI in Azure Portal: `https://yourapp.com/oauth2/callback`
- [ ] Replace `yourapp.com` in both config files with the real domain
- [ ] Set `AUTH_MODE=prod` in `backend/src/.env`
- [ ] Set `VITE_AUTH_MODE=prod` and `VITE_API_URL=/api` in `frontend/.env`
- [ ] Set real admin emails in `ADMIN_EMAILS`
