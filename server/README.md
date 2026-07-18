# ShortenUrl Server

TypeScript + Express server for the URL shortener. **All responses are mocked — no database yet.**

## Setup

```bash
npm install
```

## Run

```bash
npm run dev      # development (ts-node)
npm run build    # compile to dist/
npm start        # run compiled output
```

Server runs on **http://localhost:5000**.

## Endpoints (v1)

| Method | Path                          | Auth | Notes                    |
| ------ | ----------------------------- | ---- | ------------------------ |
| GET    | `/health`                     | —    | Health check             |
| POST   | `/api/v1/auth/register`       | —    | Register                 |
| POST   | `/api/v1/auth/login`          | —    | Login                    |
| POST   | `/api/v1/urls`                | ✓    | Create short URL         |
| GET    | `/api/v1/urls`                | ✓    | List URLs                |
| GET    | `/api/v1/urls/{id}`           | ✓    | Get one                  |
| PUT    | `/api/v1/urls/{id}`           | ✓    | Update                   |
| DELETE | `/api/v1/urls/{id}`           | ✓    | Delete                   |
| GET    | `/api/v1/urls/{id}/analytics` | ✓    | Analytics                |
| GET    | `/{shortCode}`                | —    | Redirect to original URL |

Protected routes require `Authorization: Bearer <token>` (any non-empty token works in mock mode).

See [docs/api-contract.md](docs/api-contract.md) for the full contract and the mock **test triggers**
(e.g. alias `taken` → 409, shortCode `expired` → 410, id `missing` → 404).

## Testing in Postman

Import [docs/ShortenUrl.postman_collection.json](docs/ShortenUrl.postman_collection.json). It includes a
success request and error-trigger request for every endpoint. Collection variables `baseUrl` and `token`
are preconfigured.

## Structure

```
src/
├── routes/          # Route definitions (auth, url)
├── controllers/     # Request handlers returning mock JSON
├── middleware/      # auth, validation (Zod), global error handler
├── validators/      # Zod request schemas
├── dto/             # Request/response TypeScript interfaces
├── utils/           # AppError hierarchy
└── app.ts           # App entry point
docs/
├── api-contract.md
└── ShortenUrl.postman_collection.json
```

## Stack

- **express** (runtime dependency)
- **zod** — request validation
- **typescript**, **ts-node**, **@types/\*** — dev tooling
