# ShortenUrl Client

React + Vite + TypeScript frontend for the URL shortener, consuming the v1 API in [`../server`](../server).

## Setup

```bash
npm install
```

## Run

The client expects the API server running on **http://localhost:5000**.

```bash
# terminal 1 — API
cd ../server && npm run dev

# terminal 2 — client
npm run dev            # http://localhost:5173
```

`/api` requests are proxied to `http://localhost:5000` (see [vite.config.ts](vite.config.ts)), so there are no CORS issues in dev.

```bash
npm run build          # type-check + production build to dist/
npm run preview        # preview the production build
```

## Features

| Route           | Endpoints used                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| `/login`        | `POST /auth/login`                                                             |
| `/register`     | `POST /auth/register`                                                          |
| `/` (dashboard) | `GET /urls`, `POST /urls`                                                       |
| `/urls/:id`     | `GET /urls/:id`, `PUT /urls/:id`, `DELETE /urls/:id`, `GET /urls/:id/analytics` |

- **Auth**: token stored in `localStorage`, attached as `Authorization: Bearer <token>`. Protected routes redirect to `/login`.
- **Error handling**: server error envelopes (incl. Zod validation `details`) surface inline in forms.

Since the server is mocked, the built-in triggers apply — e.g. login password `wrongpassword` → 401, register email `existing@example.com` → 409, custom alias `taken` → 409.

## Structure

```
src/
├── api/            # typed fetch client + DTO types
├── auth/           # AuthContext (token + login/register/logout)
├── components/     # Layout, ProtectedRoute
├── pages/          # Login, Register, Dashboard, UrlDetail
├── App.tsx         # routes
└── main.tsx        # providers (Router + Auth)
```
