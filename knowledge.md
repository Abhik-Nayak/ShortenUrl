# knowledge.md

Working notes on this repo — the things that aren't obvious from a single file, written
for whoever (or whatever) picks the code up next. [README.md](README.md) is the user-facing
doc; this is the mental model behind it.

## What this is

A three-tier URL shortener. Users register, shorten links, share them, and see click
analytics. Stack is React 19 + Express 5 + TypeScript, with **a JSON file where Postgres
should be**. That substitution is the single most important fact about the codebase: it is
deliberate, fenced off behind one folder, and everything else is written as if a real
database were already there.

```
client/  :5173   React 19 · Vite · React Router 7   — no business rules, holds the JWT
   │  fetch /api/v1/*   (Vite dev-proxies /api → :5000)
server/  :5000   Express 5 · TypeScript · Zod 4     — auth, validation, ownership, codes
   │  repository interface
server/src/db + repositories                        — today one JSON file; later Postgres
```

## Layering — the rule that shapes every file

Strict one-way dependency chain on the server:

```
routes → controllers → services → repositories → db/jsonStore
```

- **routes** ([server/src/routes/](server/src/routes/)) — wire path + middleware + handler. Nothing else.
- **controllers** ([server/src/controllers/](server/src/controllers/)) — HTTP only: read `req`, pick a status code, `res.json(...)`. No `if` on business rules, no storage awareness. They are one-liners on purpose.
- **services** ([server/src/services/](server/src/services/)) — all the rules: hashing, token issue/verify, short-code generation, reserved aliases, expiry, ownership, analytics aggregation. Throws `AppError`s.
- **repositories** ([server/src/repositories/](server/src/repositories/)) — the only place that knows rows exist. Three modules, one per table.
- **db/jsonStore.ts** — the swappable bottom.

Nothing above `repositories/` mentions `store`, `db.json`, or arrays. If you find yourself
importing `jsonStore` in a service, the layering has been broken.

## Request flows worth knowing

**Auth.** `POST /api/v1/auth/register|login` → `validateBody(schema)` → controller →
[auth.service.ts](server/src/services/auth.service.ts). bcrypt (10 rounds) for hashing,
`jwt.sign` with `subject: user.id`. Protected routes run
[requireAuth](server/src/middleware/auth.middleware.ts), which verifies the Bearer token and
stashes `req.userId` (declared via a `declare global` augmentation of `Express.Request`).
Controllers then use `req.userId!` — the `!` is safe only because `requireAuth` ran.

**Create a link.** [url.service.createUrl](server/src/services/url.service.ts) either takes
the custom alias (rejecting reserved and taken ones with `409`) or generates a 7-char code
from a 62-char alphabet via `randomBytes`, retrying up to 5 times against
`shortCodeExists`.

**Redirect.** `GET /:shortCode` → [redirect.controller.ts](server/src/controllers/redirect.controller.ts)
→ [click.service.resolveAndRecord](server/src/services/click.service.ts): look up, reject
missing/expired with `404`, record the click, `302` to the destination.

**Analytics.** [getAnalytics](server/src/services/click.service.ts) pulls every click for
the URL and folds it in one pass into totals, `clicksByDay`, `topReferrers` (top 5), and a
`Set` of visitor hashes for unique visitors. Aggregation lives in JS today; in Postgres this
becomes `GROUP BY` and the shape of the response should not change.

## Conventions you must follow (they will break otherwise)

- **Server imports carry `.js` extensions**, even from `.ts` files: `import { env } from './config/env.js'`. The server is native ESM (`"type": "module"`, `module: NodeNext`). Drop the extension and the build runs but Node fails at import time.
- **Client imports carry no extension** — `moduleResolution: bundler` via Vite. The two halves have deliberately different resolution rules; don't copy import style across the boundary.
- **No `try/catch` and no `asyncHandler` wrapper anywhere.** Express 5 forwards rejected promises from async handlers to the error middleware by itself. That is why every controller is a bare `await`. On Express 4 this codebase would hang on every error.
- **Errors are thrown, never returned.** Services throw the factories in [errors.ts](server/src/errors.ts) (`badRequest`/`unauthorized`/`notFound`/`conflict`); [error.middleware.ts](server/src/middleware/error.middleware.ts) is the only place that formats a response: `{ error, message }`, plus `details: [{path, message}]` for validation. Unknown throws become `500`, with the real message leaking only outside production.
- **Zod 4 syntax.** Formats are top-level: `z.url()`, `z.email()`, `z.iso.datetime()` — not `z.string().url()`. Zod 3 habits fail to compile.
- **`validateBody` replaces `req.body` with the parsed value**, so controllers get trimmed and lowercased input. Casting `req.body as CreateUrlInput` in a controller is honest only because of this.
- **Ownership failures return `404`, not `403`.** Every read/write goes through `findByIdForUser(id, userId)` / `update(id, userId, …)` — the user id is part of the predicate, not a check afterwards. Another user's id must be indistinguishable from a nonexistent one, so ids can't be probed. Keep this when writing SQL: `WHERE id = $1 AND user_id = $2`.
- **`passwordHash` never leaves the service layer.** `toPublic()` destructures it away; `PublicUser` and `UrlResponse` in [types.ts](server/src/types.ts) are the shapes that go over the wire (`UrlResponse` also drops `userId`).
- **Login is the same error either way** (`Invalid email or password`) so responses can't enumerate accounts.
- **IPs are hashed, never stored.** `visitorHash` is `sha256(ip|userAgent)` truncated to 32 chars — enough for unique-visitor counts, not a retained identifier.

## Traps

- **`RESERVED` in [url.service.ts](server/src/services/url.service.ts) must list every client-side route.** In production nginx serves the SPA and lets unmatched paths fall through to `GET /:shortCode`, so an alias named `login` would shadow a page. Add a route to [App.tsx](client/src/App.tsx) → add it to `RESERVED`.
- **`app.get('/:shortCode')` is registered last** in [app.ts](server/src/app.ts) for the same reason — earlier and it would swallow `/api/...`.
- **`TRUST_PROXY` must be `1` behind nginx.** Otherwise `req.ip` is always `127.0.0.1`, every visitor hashes identically, and unique visitors collapses to 1. Silent wrong data, not an error.
- **`BASE_URL` must be an address the *visitor's browser* can reach** — it's the prefix on every `shortUrl` handed to the client. `localhost` on a remote box produces links that only work from inside the box. `CORS_ORIGIN` has the same rule for the origin the browser loads the app from.
- **Check-then-act on short codes isn't atomic.** `shortCodeExists` then `create` are two separate store calls; concurrent requests could in principle both pass. Harmless at this scale, and the fix in Postgres is the unique constraint plus a retry on conflict — not a longer lock.
- **`store.mutate` serialises writes but there is no cross-repository transaction.** `urlRepository.remove` hand-rolls the clicks cascade in one `mutate` for that reason. Two separate `mutate` calls cannot be rolled back together.
- **Vite proxies only `/api`.** Clicking a short link in dev goes straight to `:5000`, not through `:5173`. Expected — just don't be surprised by the origin change.
- **`npm install` at the root runs `postinstall`**, which installs `server/` and `client/`. That's what `npm run setup` is.

## The Postgres swap (the point of the design)

Row interfaces in [types.ts](server/src/types.ts) are already table-shaped, ISO strings and
all. To move:

1. Keep the three repository modules and their exact signatures; replace `store.read` / `store.mutate` bodies with SQL.
2. Replace `db/jsonStore.ts` with a `pg` pool (or Prisma) on `DATABASE_URL`.
3. Add the indexes the JSON version fakes with array scans: unique `users.email`, unique `urls.short_code`, `urls.user_id`, `clicks.url_id`.
4. Add FKs: `urls.user_id → users.id`, `clicks.url_id → urls.id ON DELETE CASCADE` — then delete the manual cascade in [url.repository.ts](server/src/repositories/url.repository.ts).
5. Secrets (`JWT_SECRET`, `DATABASE_URL`) go to Secrets Manager, not `.env`; RDS in a private subnet over TLS.

No controller, route, service, or client file should change. If a swap forces edits above
`repositories/`, that's a leak worth fixing rather than accommodating.

## Known limits of the JSON tier

Properties of the stand-in, all of which disappear with a real database: single process only
(the file is cached in memory — two instances overwrite each other), whole-file rewrite per
mutation, array scans instead of indexes, no transactions across repositories. The flush is
atomic (tmp + rename) and writes are serialised, so it's safe for one process on a laptop
and nothing more.

## Client notes

- **JWT lives in `localStorage`** under `shorten.token` ([api/client.ts](client/src/api/client.ts)). XSS-exposed by nature; the tradeoff was made for simplicity. A stored token is treated as a *claim*: [AuthContext](client/src/auth/AuthContext.tsx) confirms it with `GET /auth/me` on boot and clears it on failure.
- **`ProtectedRoute` waits on `loading`** before redirecting, or a refresh on `/urls/:id` would bounce you to `/login` while the token check is still in flight.
- **One `request()` helper** does token injection, `204` handling, and error normalisation into `ApiError` (with `fieldMessages` for form display). Every call goes through it; don't call `fetch` directly in a page.
- **Uses React 19 idioms**: `use(AuthContext)` rather than `useContext`, and `<AuthContext value={…}>` rather than `.Provider`.
- Optimistic delete on the dashboard restores the previous list if the server disagrees.
- Styling is one hand-written [index.css](client/src/index.css) (~310 lines, class-based). No CSS framework, no component library.

## Current state of the repo

- **No tests, no test runner, no linter.** `npm run typecheck` (both tiers, `strict` + `noUncheckedIndexedAccess`) is the only automated check that exists. The lone eslint-disable comment in [auth.middleware.ts](server/src/middleware/auth.middleware.ts) is vestigial.
- **[README.md](README.md) documents `deploy/setup.sh`, `deploy/update.sh`, and `deploy/README.md` that are not in the repo.** Either they were removed or never committed — treat the deploy section as intent, not instructions.
- **[Steps.md](Steps.md) is a plan, not a description**: Docker → EC2 → RDS → AMI → launch template → ASG → ALB. Nothing in it is implemented (no `Dockerfile`, no `docker-compose.yml`), and `terraform_rds/` is an empty directory. This is the direction of travel — Postgres on RDS behind a load balancer — which is why the repository seam matters.
- Working tree carries a debug `console.log` in [url.controller.ts:15](server/src/controllers/url.controller.ts#L15) that logs the request body on create. Not intended for keeping.
- Branch `devlopment` (sic) is ahead of `main`; `main` is the PR target.

## Commands

```bash
npm run setup       # install root + server + client
npm run dev         # concurrently: API :5000, web :5173
npm run dev:api     # tsx watch, server only
npm run dev:web     # vite, client only
npm run build       # tsc (server) then vite build (client)
npm run typecheck   # both tiers — the only real check
npm start           # node dist/server.js
```

Config lives in `server/.env`, copied from [server/.env.example](server/.env.example):
`PORT`, `JWT_SECRET` (startup throws in production if left at `dev-only-change-me`),
`JWT_EXPIRES_IN`, `DATA_FILE`, `BASE_URL`, `CORS_ORIGIN`, `TRUST_PROXY`. On Windows use
`Copy-Item server/.env.example server/.env`.
