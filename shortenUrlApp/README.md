# ShortenUrl

A URL shortener (PERN + TypeScript), built one stage at a time from the system design in [docs/](docs/):

- [Functional & non-functional requirements](docs/Functional&NonFunctional.png)
- [High level design](docs/HLD.png): client → load balancer → stateless API servers → Redis + PostgreSQL
- [Low level design](docs/LLD.png): UrlController → UrlService → UrlRepository, CacheService, IdGenerator

## Stack
| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node + Express 5 + TypeScript |
| Database | PostgreSQL (Docker, from stage 1) |
| Cache | Redis (stage 7) |
| Load balancer | Nginx (stage 9), then Kubernetes Ingress (stage 11) |

## Run locally (stage 0)
Requires Node 20+.

```bash
# terminal 1: API on http://localhost:4000
cd server
cp .env.example .env
npm install
npm run dev

# terminal 2: React app on http://localhost:5173
cd client
npm install
npm run dev
```

Check: `curl http://localhost:4000/health` returns `{"status":"ok"}`, and the web page shows **API status: ok**.

## Stages
- [x] 0: Project skeleton
- [ ] 1: Postgres in Docker + schema
- [ ] 2: Create short URL API
- [ ] 3: Redirect + Home page
- [ ] 4: Custom alias + expiry
- [ ] 5: Analytics page
- [ ] 6: Full app in Docker Compose
- [ ] 7: Redis cache
- [ ] 8: Security / rate limiting
- [ ] 9: Load balancer + API replicas
- [ ] 10: Tests + CI
- [ ] 11: Kubernetes
- [ ] 12: Cloud
