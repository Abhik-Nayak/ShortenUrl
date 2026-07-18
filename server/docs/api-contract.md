# API Contract — v1

Base URL: `http://localhost:5000`

> All responses are currently **mocked** (no database). Certain inputs act as
> triggers to demonstrate error handling — see **Test triggers** below.

## Conventions

- Request/response bodies are JSON.
- Protected endpoints require `Authorization: Bearer <token>` (any non-empty token is accepted in mock mode).
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

## Test triggers (mock behaviour)

| Scenario            | How to trigger                                   | Result |
| ------------------- | ------------------------------------------------ | ------ |
| Validation failure  | bad email / password < 8 / `originalUrl` not a URL | `400` |
| Unauthorized        | omit `Authorization` header on `/urls`           | `401` |
| Invalid credentials | login with password `wrongpassword`              | `401` |
| Alias conflict      | create url with `customAlias` = `taken`/`admin`/`api` | `409` |
| Email conflict      | register with `existing@example.com`             | `409` |
| Not found           | any `/urls/{id}` with id `missing`               | `404` |
| Expired link        | `GET /expired`                                   | `410` |
| Success redirect    | `GET /abc123` (any other code)                   | `302` |
