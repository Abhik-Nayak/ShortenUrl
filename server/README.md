# ShortenUrl Server

TypeScript + Express server for the URL shortener, backed by **PostgreSQL via Prisma ORM**
with real JWT authentication.

## Setup

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # then edit DATABASE_URL, JWT_SECRET, etc.
npm run migrate             # prisma migrate dev — creates/updates tables
```

`.env` variables: `PORT`, `BASE_URL`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
A running PostgreSQL instance reachable via `DATABASE_URL` is required.

## Run

```bash
npm run dev             # development (ts-node)
npm run build           # compile to dist/
npm start               # run compiled output
npm run migrate         # prisma migrate dev — apply/create migrations (development)
npm run migrate:deploy  # prisma migrate deploy — apply migrations (production)
npm run generate        # regenerate the Prisma client after schema changes
```

Server runs on **http://localhost:5000** (or `PORT`).

## Endpoints (v1)

| Method | Path                          | Auth | Notes                    |
| ------ | ----------------------------- | ---- | ------------------------ |
| GET    | `/health`                     | —    | Health check (+ DB ping) |
| POST   | `/api/v1/auth/register`       | —    | Register                 |
| POST   | `/api/v1/auth/login`          | —    | Login                    |
| POST   | `/api/v1/urls`                | ✓    | Create short URL         |
| GET    | `/api/v1/urls`                | ✓    | List URLs (`?page`, `?pageSize`) |
| GET    | `/api/v1/urls/{id}`           | ✓    | Get one                  |
| PUT    | `/api/v1/urls/{id}`           | ✓    | Update                   |
| DELETE | `/api/v1/urls/{id}`           | ✓    | Delete (soft)            |
| GET    | `/api/v1/urls/{id}/analytics` | ✓    | Analytics                |
| GET    | `/{shortCode}`                | —    | Redirect to original URL |

Protected routes require `Authorization: Bearer <jwt>` — obtain a token from register/login.
URLs are scoped to the authenticated user; other users' URLs return `404`.

See [docs/api-contract.md](docs/api-contract.md) for the full contract.

## Testing in Postman

Import [docs/ShortenUrl.postman_collection.json](docs/ShortenUrl.postman_collection.json). Set the
collection `token` variable from a register/login response before calling protected routes.

## Structure

```
prisma/
├── schema.prisma    # data model (User, Url, UrlClick) + datasource
└── migrations/      # Prisma-managed SQL migrations
src/
├── config/          # env loading + Prisma client singleton
├── entity/          # entity types per table (User, Url, UrlClick) + input types
├── query/           # data-access CRUD/analytics queries via Prisma
├── routes/          # Route definitions (auth, url)
├── controllers/     # Request handlers (thin; delegate to services)
├── services/        # Business logic (auth, url, click/analytics)
├── middleware/      # auth (JWT), validation (Zod), global error handler
├── validators/      # Zod request schemas
├── dto/             # Request/response TypeScript interfaces
├── types/           # Express Request augmentation
├── utils/           # AppError hierarchy, shortcode, jwt, crypto
└── app.ts           # App entry point
docs/
├── api-contract.md
└── ShortenUrl.postman_collection.json
```

## Stack

- **express** — HTTP server
- **prisma / @prisma/client** — PostgreSQL ORM, migrations, generated types
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **ua-parser-js** — user-agent parsing for click analytics
- **zod** — request validation
- **dotenv** — environment configuration
- **typescript**, **ts-node**, **@types/\*** — dev tooling
