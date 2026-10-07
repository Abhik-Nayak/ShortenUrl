const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');
const { createClient } = require('redis');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const app = express();
app.use(express.json());

// --- Redis: optional. If it's down, every call below quietly falls back to Postgres.
const redis = createClient({ url: process.env.REDIS_URL, disableOfflineQueue: true });
let redisErrorLogged = false;
redis.on('error', (err) => redisErrorLogged || (redisErrorLogged = true, console.error('redis:', err.message)));
redis.on('ready', () => { redisErrorLogged = false; console.log('redis connected'); });
redis.connect().catch(() => {});

const REDIS_TTL = 24 * 60 * 60;
const cacheGet = async (key) => (redis.isReady ? redis.get(key).catch(() => null) : null);
const cacheSet = (key, value) => redis.isReady && redis.set(key, value, { EX: REDIS_TTL }).catch(() => {});

// --- In-process cache: absorbs hot ("celebrity") links before they even reach Redis.
const LOCAL_MAX = 10_000;
const LOCAL_TTL_MS = 60_000;
const local = new Map(); // code -> { url, exp }
function localGet(code) {
  const hit = local.get(code);
  if (hit && hit.exp > Date.now()) return hit.url;
  local.delete(code);
}
function localSet(code, url) {
  if (local.size >= LOCAL_MAX) local.delete(local.keys().next().value); // evict oldest
  local.set(code, { url, exp: Date.now() + LOCAL_TTL_MS });
}

// --- Request coalescing: N concurrent misses for one code share a single lookup.
const inflight = new Map(); // code -> Promise<[url, source]>
async function lookup(code) {
  let url = await cacheGet(`c:${code}`);
  if (url) return [url, 'redis'];
  const { rows } = await pool.query('SELECT long_url FROM urls WHERE code = $1', [code]);
  if (!rows.length) return [null, 'db'];
  cacheSet(`c:${code}`, rows[0].long_url);
  return [rows[0].long_url, 'db'];
}
async function resolve(code) {
  const url = localGet(code);
  if (url) return [url, 'local'];
  if (!inflight.has(code)) inflight.set(code, lookup(code).finally(() => inflight.delete(code)));
  const result = await inflight.get(code);
  if (result[0]) localSet(code, result[0]);
  return result;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const newCode = () => [...crypto.randomBytes(7)].map((b) => ALPHABET[b % 62]).join('');

// Returns the normalized URL, or null if it isn't a valid http(s) URL.
function normalize(s) {
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

app.get('/healthz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.send('ok');
  } catch {
    res.status(503).send('db down');
  }
});

app.post('/api/shorten', async (req, res) => {
  const raw = req.body?.url;
  const url = typeof raw === 'string' && raw.length <= 2048 ? normalize(raw) : null;
  if (!url) return res.status(400).json({ error: 'Enter a valid http(s) URL' });

  const hash = crypto.createHash('sha256').update(url).digest('hex');
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const reply = (status, code) => res.status(status).json({ code, shortUrl: `${base}/${code}` });

  const cached = await cacheGet(`h:${hash}`);
  if (cached) return reply(200, cached);

  for (let attempt = 0; attempt < 5; attempt++) {
    const { rows } = await pool.query(
      'INSERT INTO urls (code, long_url, url_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING code',
      [newCode(), url, hash],
    );
    let code = rows[0]?.code;
    let status = 201;
    if (!code) {
      // Either this URL already exists (dedupe) or the random code collided (retry).
      const existing = await pool.query('SELECT code FROM urls WHERE url_hash = $1', [hash]);
      if (!existing.rows.length) continue;
      code = existing.rows[0].code;
      status = 200;
    }
    cacheSet(`h:${hash}`, code);
    cacheSet(`c:${code}`, url);
    return reply(status, code);
  }
  res.status(500).json({ error: 'Could not generate a code' });
});

app.get('/:code', async (req, res) => {
  const [url, source] = await resolve(req.params.code);
  res.set('X-Cache', source);
  if (!url) return res.status(404).send('Short URL not found');
  res.set('Cache-Control', 'public, max-age=300'); // links never change, so browsers/CDN may cache the redirect
  res.redirect(302, url);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`listening on ${port}`));

process.on('SIGTERM', () => server.close(() => Promise.all([pool.end(), redis.quit().catch(() => {})])));
