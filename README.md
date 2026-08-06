# ShortenUrl

A working three-tier URL shortener. Register, shorten a link, share it, watch the
clicks come in.

The stack is PERN minus the P — for now. Persistence is a JSON file behind a
repository layer, so you can run the whole thing with `npm run dev` and no
database installed. Swapping in Postgres (local or RDS) means rewriting one
folder; see [Swapping in Postgres/RDS](#swapping-in-postgresrds).

```
┌──────────────────────────────┐
│  Tier 1 — Presentation       │   client/   React 19 + Vite + React Router
│  localhost:5173              │   Holds the JWT in localStorage. No business rules.
└──────────────┬───────────────┘
               │  fetch /api/v1/*   (Vite proxies it to :5000 in dev)
┌──────────────▼───────────────┐
│  Tier 2 — Application        │   server/   Express 5 + TypeScript + Zod
│  localhost:5000              │   Auth, validation, ownership, short-code generation.
└──────────────┬───────────────┘
               │  repository interface
┌──────────────▼───────────────┐
│  Tier 3 — Data               │   server/src/db + server/src/repositories
│  server/data/db.json         │   Today: one JSON file.  Later: Postgres on RDS.
└──────────────────────────────┘
```

## Quick start

```bash
npm run setup                 # installs client + server dependencies
cp server/.env.example server/.env
npm run dev                   # API on :5000, web on :5173
```

Open <http://localhost:5173>, create an account, and shorten something.

> On Windows PowerShell use `Copy-Item server/.env.example server/.env` for the
> second line.

Other scripts: `npm run build`, `npm run typecheck`, `npm run dev:api`,
`npm run dev:web`.

## What it does

- Email + password accounts, bcrypt-hashed, JWT sessions
- Shorten any `http(s)` URL, with an optional custom alias and expiry
- `GET /:shortCode` → `302` to the destination, recording the click
- Per-link analytics: total clicks, unique visitors, clicks by day, top referrers
- Links are scoped to their owner — someone else's id returns `404`, not `403`,
  so ids can't be probed

## API

Base URL `http://localhost:5000`. Errors are always
`{ error, message }`, plus `details: [{ path, message }]` on validation failures.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/health` | — | liveness |
| `POST` | `/api/v1/auth/register` | — | `201` → `{ user, token }`; `409` if email taken |
| `POST` | `/api/v1/auth/login` | — | `200` → `{ user, token }`; `401` if wrong |
| `GET` | `/api/v1/auth/me` | Bearer | current user |
| `POST` | `/api/v1/urls` | Bearer | `{ originalUrl, customAlias?, expiresAt? }` |
| `GET` | `/api/v1/urls` | Bearer | `{ data, page, pageSize, total }` |
| `GET` | `/api/v1/urls/:id` | Bearer | one link |
| `PUT` | `/api/v1/urls/:id` | Bearer | `{ originalUrl?, expiresAt? }` |
| `DELETE` | `/api/v1/urls/:id` | Bearer | `204`, cascades to clicks |
| `GET` | `/api/v1/urls/:id/analytics` | Bearer | totals, by-day, referrers |
| `GET` | `/:shortCode` | — | `302` redirect, or `404` if unknown/expired |

## Configuration

`server/.env` — see [server/.env.example](server/.env.example).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `JWT_SECRET` | `dev-only-change-me` | Token signing key. Startup fails in production if left at the default. |
| `JWT_EXPIRES_IN` | `7d` | Session length |
| `DATA_FILE` | `data/db.json` | JSON store location |
| `BASE_URL` | `http://localhost:5000` | Prefix for the `shortUrl` returned to clients |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |
| `TRUST_PROXY` | `0` | Reverse proxies in front of the app. `1` behind nginx, or `req.ip` is always `127.0.0.1`. |

## Deploying

For a bare Ubuntu EC2 instance, one command installs git, Node, and nginx,
builds both tiers, and runs the API under systemd:

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/ShortenUrl/main/deploy/setup.sh \
  | sudo bash -s -- --repo https://github.com/<you>/ShortenUrl.git
```

Redeploy later with `sudo /opt/shortenurl/deploy/update.sh`. Details, the nginx
routing rules, and what's still missing for a real production setup are in
[deploy/README.md](deploy/README.md).

## Swapping in Postgres/RDS

The JSON store is deliberately fenced off. Nothing above
[server/src/repositories/](server/src/repositories/) knows how rows are stored —
services call `urlRepository.findByShortCode(code)` and don't care what answers.

To move to Postgres:

1. Keep the three modules in [server/src/repositories/](server/src/repositories/)
   and their signatures. Replace the `store.read` / `store.mutate` bodies with SQL.
   The row shapes in [server/src/types.ts](server/src/types.ts) are already
   table-shaped.
2. Delete [server/src/db/jsonStore.ts](server/src/db/jsonStore.ts) and point
   `server/src/db/` at a `pg` pool (or Prisma) reading `DATABASE_URL`.
3. Add the indexes the JSON version fakes with array scans:
   `users.email` unique, `urls.short_code` unique, `urls.user_id`, `clicks.url_id`.
4. Add the foreign keys — `urls.user_id → users.id` and
   `clicks.url_id → urls.id ON DELETE CASCADE`. The cascade in
   [url.repository.ts](server/src/repositories/url.repository.ts) then becomes the
   database's job and can be dropped.
5. For RDS: run it in a private subnet, reach it over TLS, and put `JWT_SECRET`
   and `DATABASE_URL` in Secrets Manager rather than a `.env` file.

No controller, route, service, or client file needs to change.

## Known limits of the JSON tier

These are properties of the stand-in store, and all of them go away with a real
database. Worth knowing before you point anything real at it:

- **Single process only.** The file is cached in memory; two servers would
  overwrite each other. Don't scale it out.
- **Whole file per write.** Every mutation rewrites `db.json`. Fine at thousands
  of rows, not at millions.
- **Scans, not indexes.** Every lookup is an array scan.
- **No transactions across repositories.** Each `mutate` call is atomic on its
  own (temp file + rename) and writes are serialised, so requests can't
  interleave — but there's no rollback spanning two of them.
