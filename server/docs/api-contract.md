# API Contract — v1

Base URL: `http://localhost:5000`

> Backed by PostgreSQL with real JWT auth. Obtain a token from register/login and
> send it on protected endpoints.

## Conventions

- Request/response bodies are JSON.
- Protected endpoints require `Authorization: Bearer <jwt>` obtained from register/login.
- URL resources are scoped to the authenticated user; another user's `{id}` returns `404`.
- Errors use a consistent envelope:
  ```json
  { "error": "ErrorName", "message": "Human readable message" }
  ```
  Validation errors additionally include `details: [{ path, message }]`.

---

## Health

### GET /health
`200` → `{ "status": "ok" }`

---

## Auth

### POST /api/v1/auth/register
Body: `{ "email": string, "password": string (min 8), "name?": string }`
- `201` → `{ user, token }`
- `400` validation failure
- `409` email already exists

### POST /api/v1/auth/login
Body: `{ "email": string, "password": string }`
- `200` → `{ user, token }`
- `400` validation failure
- `401` invalid credentials

---

## URLs (protected — Bearer token required)

### POST /api/v1/urls
Body: `{ "originalUrl": string (url), "customAlias?": string, "expiresAt?": ISO date }`
- `201` → url object
- `400` invalid URL / bad alias
- `401` missing/invalid token
- `409` alias already taken

### GET /api/v1/urls
- `200` → `{ data: url[], page, pageSize, total }`

### GET /api/v1/urls/{id}
- `200` → url object
- `404` not found

### PUT /api/v1/urls/{id}
Body: `{ "originalUrl?": string (url), "expiresAt?": ISO date }` (at least one)
- `200` → updated url object
- `400` validation failure
- `404` not found

### DELETE /api/v1/urls/{id}
- `204` no content
- `404` not found

### GET /api/v1/urls/{id}/analytics
- `200` → `{ id, shortCode, totalClicks, uniqueVisitors, clicksByDay[], topReferrers[] }`
- `404` not found

---

## Redirect (public)

### GET /{shortCode}
- `302` redirect to the original URL
- `404` short code not found
- `410` link expired

---

## Error behaviour

| Scenario            | How it happens                                        | Result |
| ------------------- | ----------------------------------------------------- | ------ |
| Validation failure  | bad email / password < 8 / `originalUrl` not a URL    | `400` |
| Unauthorized        | missing/invalid/expired `Authorization` on protected route | `401` |
| Invalid credentials | login with a wrong email or password                  | `401` |
| Alias conflict      | `customAlias` already taken or a reserved word (`admin`, `api`, …) | `409` |
| Email conflict      | register with an email that already exists            | `409` |
| Not found           | `/urls/{id}` that doesn't exist or belongs to another user | `404` |
| Expired link        | `GET /{shortCode}` whose `expiresAt` has passed       | `410` |
| Success redirect    | `GET /{shortCode}` for an active link                 | `302` |

Notes:
- `GET /api/v1/urls` accepts `?page` (default 1) and `?pageSize` (default 20, max 100).
- `DELETE` is a soft delete; deleted links no longer redirect or appear in listings.
- Each successful redirect records a click (browser/os/device, referrer, hashed IP) and
  increments the link's click count, feeding the analytics endpoint.
