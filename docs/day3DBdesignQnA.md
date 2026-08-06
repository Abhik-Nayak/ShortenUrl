# Day 3 — Database Design Q&A (Interview Prep)

Context for every answer below is the schema we actually implemented
(`users`, `urls`, `url_clicks`) and the capacity numbers from
[requirements.md](requirements.md): ~10M new URLs/day (~115 writes/sec),
~500M clicks/day (~5,800 reads/sec avg, ~58,000/sec at 10× peak),
**read:write ≈ 50:1**, base62 8-char codes (~218T keyspace), ~2.5 TB/year of URL rows.

The single most important sentence to internalize: **this is a read-heavy system whose
hot path is one lookup — `short_code → long_url`.** Almost every design decision falls
out of protecting that path.

---

## Schema at a glance (relations)

```
+------------------------+
|         users          |
+------------------------+
| id            (PK,UUID)|
| name                   |
| email        (UNIQUE)  |
| password_hash          |
| created_at             |
| updated_at             |
+------------------------+
        │ 1
        │
        │  user_id (FK, ON DELETE CASCADE)
        │
        ▼ N
+------------------------+
|          urls          |
+------------------------+
| id            (PK,UUID)|
| user_id       (FK)     |
| short_code   (UNIQUE)  | ◄── hot-path lookup: WHERE short_code = $1
| long_url               |
| expires_at             |
| click_count            | ◄── denormalized running total
| deleted_at             | ◄── soft delete (NULL = active)
| created_at             |
| updated_at             |
+------------------------+
        │ 1
        │
        │  url_id (FK, ON DELETE CASCADE)
        │
        ▼ N
+------------------------+
|       url_clicks       |
+------------------------+
| id            (PK,UUID)|
| url_id        (FK)     |
| country                |
| city                   |
| browser                |
| os                     |
| device                 |
| referrer               |
| ip_hash                |
| clicked_at             |
+------------------------+
```

**Relations (both 1 → N):**
- `users (1) ──< urls (N)` on `urls.user_id` — one user owns many links.
- `urls (1) ──< url_clicks (N)` on `url_clicks.url_id` — one link records many clicks.

Both foreign keys are `ON DELETE CASCADE`, but note we **soft-delete** `urls`
(`deleted_at`) rather than physically removing them, so the cascade rarely fires in
normal operation (see the soft-delete answer in Part 2).

**Indexes on the diagram:** UNIQUE on `users.email` and `urls.short_code`;
partial index on `urls(user_id) WHERE deleted_at IS NULL`; composite index on
`url_clicks(url_id, clicked_at)`.

### Deployment topology (where the tables live today)

```
                 API Server
                     │
                     ▼
              PostgreSQL (Primary)
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   urls table                users table
        │
        ▼
 url_clicks (analytics) table
```

Today all three tables live in a **single PostgreSQL primary** — simplest to operate and
correct at our current scale. The arrows above are logical (tables in one DB), not separate
databases. This topology is the baseline the scaling answers in Part 2 evolve from:

- **Read replicas** — add followers of the primary to absorb the 50:1 read load
  (redirect lookups / analytics dashboards) once one node can't keep up.
- **Cache in front** — a Redis layer for `short_code → long_url` so most redirects never
  touch Postgres at all.
- **Split the analytics table out** — move `url_clicks` behind a queue into its own
  store (partitioned Postgres / ClickHouse / BigQuery) so heavy click ingestion can't slow
  redirects (see "analytics pipeline" answer).
- **Shard `urls` by `short_code` hash** — only once a single primary crosses the
  ~TB / write-throughput ceiling from the capacity estimate.

---

## Part 1 — Fundamentals

### What tables do we need?

Three, matching the domain's three nouns:

| Table        | Purpose                                          | Cardinality driver        |
| ------------ | ------------------------------------------------ | ------------------------- |
| `users`      | Account + auth (email, password_hash)            | grows with signups        |
| `urls`       | The core mapping `short_code → long_url` + owner | ~10M rows/day             |
| `url_clicks` | One row per click (raw analytics events)         | ~500M rows/day (50× urls) |

`urls` is the transactional heart; `url_clicks` is an append-only event log. They have
very different access patterns and growth rates, which is *why they're separate tables*
(see normalize/denormalize below).

### What indexes are required?

From our migration:

- **`users.email` — UNIQUE index.** Login looks up by email; also enforces "one account per email."
- **`urls.short_code` — UNIQUE index.** *The* hot-path index. Every redirect is
  `SELECT long_url FROM urls WHERE short_code = $1`. Must be O(log n) / effectively O(1) via B-tree.
- **`urls (user_id) WHERE deleted_at IS NULL` — partial index.** Powers "list my links"
  without scanning deleted rows, and keeps the index smaller.
- **`url_clicks (url_id, clicked_at)` — composite index.** Powers analytics: all clicks
  for a URL, ordered/filtered by time (clicks-by-day, date ranges).
- Primary keys (UUID) on all three tables are indexed implicitly.

Rule of thumb: **index the columns that appear in `WHERE`/`JOIN`/`ORDER BY` on your
high-frequency queries — and nothing else on the write-hot table**, because every index
is a tax on every insert.

### What should be UNIQUE?

- `users.email` — identity / login key.
- `urls.short_code` — correctness-critical. If two rows shared a code, a redirect would be
  ambiguous — you could send a user to the wrong (possibly malicious) destination. The
  UNIQUE constraint is also what lets us treat a custom-alias collision as a clean `409`
  (we catch Postgres error `23505`).
- **Not unique:** `long_url`. 1,000 users can legitimately shorten `https://google.com`;
  de-duping mappings globally would break per-user ownership and analytics.

### What queries run thousands of times per second?

Essentially one:

```sql
SELECT id, long_url, expires_at, deleted_at
FROM urls
WHERE short_code = $1;   -- the redirect lookup, ~5.8k–58k/sec
```

Plus the click insert that follows each redirect (`INSERT INTO url_clicks ...` +
`UPDATE urls SET click_count = click_count + 1`). Everything else (register, list,
analytics dashboard) is orders of magnitude rarer and doesn't drive the architecture.

The design consequence: the redirect read must hit an index and, at real scale, a cache —
never a table scan, never a join.

### When do we normalize?

Normalize the **transactional, correctness-sensitive, frequently-mutated** data:

- `users` and `urls` are normalized — `urls.user_id` is a foreign key, not a copy of the
  user's email/name. If a user renames themselves, we don't want to update millions of URL rows.
- Normalization gives us one source of truth and cheap writes/updates, which matters for
  data that changes.

### When do we denormalize?

Denormalize when a **read is hot and the recompute is expensive**, and you can tolerate
maintaining a redundant copy:

- `urls.click_count` is denormalized (a running total) instead of `COUNT(*)` over
  `url_clicks` on every read.
- At analytics scale you'd also pre-aggregate (rollup tables like
  `clicks_by_day(url_id, day, count)`) so the dashboard reads a handful of summary rows
  instead of scanning millions of events.
- The trade-off: denormalized values can drift and must be kept in sync (by the write
  path, a trigger, or a batch job). You accept write complexity to buy read speed.

---

## Part 2 — The "why" questions

### Why is `short_code` the most important indexed column in the system?

Because it sits on the **only query that runs at full scale** — the public redirect. Every
one of the ~500M daily clicks becomes a `WHERE short_code = $1` lookup, so this index is
what stands between a sub-millisecond redirect and a full-table scan of billions of rows.
Three things make it special:

1. **Volume** — it's on the 50:1 read side; no other index is touched nearly as often.
2. **Latency budget** — the NFR is <100ms end-to-end; the DB lookup must be a few ms.
3. **Correctness** — being UNIQUE, it's simultaneously the index *and* the guarantee that a
   code maps to exactly one destination.

In production this index is also the natural **cache key** (Redis `short_code → long_url`),
so most reads never even reach it — but the DB index remains the backstop on cache miss.

### Why store `click_count` in `urls` if every click is in `url_clicks`?

To avoid an expensive aggregate on a hot path. Computing
`SELECT COUNT(*) FROM url_clicks WHERE url_id = $1` means scanning potentially millions of
event rows every time someone views a link or a list. Keeping a maintained counter on
`urls` turns "how many clicks?" into a single-row read.

It's a classic **read-optimizing denormalization**: we trade a tiny write cost (an
`UPDATE ... SET click_count = click_count + 1` per click) for a huge read saving. The
`url_clicks` table is still the source of truth for *detailed* analytics (by day, country,
referrer); `click_count` is just the cached total. The risk is drift if a click insert
succeeds but the counter update fails — acceptable for a click tally, and reconcilable
from the event log if needed. (At very high write rates the single-row counter becomes a
contention hotspot, which pushes you toward batched/async increments — see the pipeline
question.)

### At what scale would you partition `url_clicks`, and why?

`url_clicks` grows ~500M rows/day → ~180B rows/year. You partition well before a single
table/index becomes unmanageable — practically, when:

- the table reaches the **hundreds-of-millions to low-billions of rows** and its indexes
  no longer fit comfortably in RAM, so inserts and range scans start hitting disk, **or**
- you need to **age out / archive old data** cheaply (drop last quarter's data), **or**
- vacuum/reindex/backup windows on one giant table get painful.

**How:** range-partition by time (`clicked_at`, e.g. daily or monthly partitions). This
fits the access pattern perfectly — analytics queries are time-bounded, so the planner
prunes to a few partitions instead of scanning everything; and expiring old data becomes a
`DROP PARTITION` (instant) instead of a massive `DELETE`. If a single hot URL dominates,
you can sub-partition or shard by `url_id` (hash) as well.

Rule of thumb: **partition the append-only event table by time; leave `urls`/`users`
alone** until they themselves cross the billions-of-rows / sharding threshold (the
capacity doc notes ~2.5 TB/year for `urls`, which is when horizontal sharding by
`short_code` hash enters the picture).

### If analytics writes get much heavier than redirect reads, how do you redesign so redirects stay fast?

The principle: **decouple the redirect from the analytics write — the redirect must never
wait on, or contend with, click recording.** Even today our redirect controller records the
click *after* responding, fire-and-forget. To scale that further:

1. **Make the write path asynchronous and buffered.** On redirect, don't write to Postgres
   inline. Emit a lightweight event to a queue/stream (Kafka, Kinesis, Redis Streams). The
   redirect returns immediately after the cache/DB read.
2. **Batch the ingestion.** A separate consumer service reads the stream and bulk-inserts
   into `url_clicks` (or writes to a store built for this — ClickHouse, BigQuery,
   Cassandra). Batched inserts amortize per-row overhead and keep analytics load off the
   redirect DB entirely.
3. **Aggregate `click_count` out-of-band.** Instead of an inline
   `UPDATE urls SET click_count = click_count + 1` per click (a single-row hotspot),
   increment a counter in Redis and flush aggregated deltas to `urls` periodically, or roll
   up counts from the event stream. This removes write contention on the hot `urls` row.
4. **Separate read/write concerns (CQRS-style).** Redirects read from a cache backed by a
   read-optimized store; analytics live in a separate OLAP system. The two no longer share
   a database, so heavy analytics ingestion can't degrade redirect latency.

Net effect: redirect latency depends only on a cache lookup; analytics durability/throughput
scales independently behind a queue. Worst case, if the analytics pipeline lags or drops,
**redirects are unaffected** — the correct failure mode for this product.

### Why is soft delete generally preferred over hard delete here?

We use `deleted_at` (a soft delete) rather than physically removing rows, for several
product- and system-level reasons:

- **Referential integrity / analytics history.** `url_clicks` references `urls`. Hard-deleting
  a URL would orphan or cascade-destroy its click history — you'd lose analytics for a link
  that was real and generated traffic. Soft delete preserves the historical record.
- **Recoverability.** Users delete links by mistake; support can restore a soft-deleted row
  instantly. Hard deletes are irreversible without backups.
- **Safe, cheap operation.** A soft delete is a single-row `UPDATE`; a hard delete on a
  FK-referenced row can trigger cascading deletes across millions of `url_clicks` rows —
  expensive and lock-heavy on a busy table.
- **Correct redirect behavior.** Our redirect and list queries filter
  `WHERE deleted_at IS NULL`, so a deleted link cleanly stops resolving without us losing
  the code's history — and we don't accidentally recycle a `short_code` that's still
  referenced in logs/QR codes.
- **Auditability / abuse handling.** For a system that must fight phishing and abuse,
  keeping a record of what a code *used* to point to is valuable evidence.

Trade-offs to acknowledge in an interview: soft-deleted rows accumulate (mitigated by the
**partial index** `WHERE deleted_at IS NULL`, which keeps them out of the hot index), and
you must remember to add the `deleted_at IS NULL` predicate everywhere. For genuinely
sensitive data or legal "right to be forgotten" requests, you still need a real purge
job — soft delete is the default, not an absolute.
