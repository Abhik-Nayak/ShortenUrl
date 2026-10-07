# ShortenUrl — Roadmap (Local → AWS EKS)

A tiny URL shortener used to learn how a 3-tier app goes from a laptop to AWS EKS, built to handle heavy traffic.

**How we work:** Claude writes the code and config for **one stage at a time**. Then you (the human) run the **Verify** steps.
- If every check passes, tick the box and say "next".
- If something fails, paste the output and Claude fixes it before going on.
- No stage starts until the stage before it is verified.

---

## 1. What the app does (and nothing more)

1. The user opens the web page and pastes a long URL.
2. The page shows a short URL, e.g. `http://<host>/aB3x9Q`.
3. Opening the short URL **redirects (HTTP 302)** to the original long URL.

### In scope
- One page, one input, one button, one result link.
- Validation: only `http://` or `https://` URLs.
- **Same long URL → same short URL.** URLs are normalized first (`HTTPS://Example.com` and `https://example.com/` count as the same).
- **Read-heavy by design:** redirects outnumber creates by roughly 100:1, and one celebrity link can get millions of hits. Redirects are served from cache, not Postgres (see "Read path" below).
- A `/healthz` endpoint for Kubernetes probes.

### Out of scope (deliberately)
- User accounts, login, custom aliases, expiry dates, click analytics, QR codes, editing or deleting links.
- Frameworks such as React, NestJS, ORMs, TypeScript build steps. These add code without adding learning value here.

---

## 2. Architecture

```
            Browser
               │
     ┌─────────▼──────────┐
     │  AWS ALB (Ingress) │   "/", "/assets/*" → client
     └───┬────────────┬───┘   everything else  → server
         │            │
  ┌──────▼─────┐ ┌────▼──────────┐
  │ client pod │ │ server pods   │  (HPA: 2 → N replicas)
  │ nginx +    │ │ Node+Express  │
  │ React build│ └────┬─────┬────┘
  └────────────┘      │     │ cache lookups (stage 4.5)
                      │   ┌─▼─────┐
                      │   │ Redis │
                      │   └───────┘
                ┌─────▼──────┐
                │ PostgreSQL │
                └────────────┘
```

| Tier | Tech | Approx. size |
|---|---|---|
| Client | React 19 + Vite, built to static files and served by nginx | 1 component, ~45 lines |
| Server | Node.js + Express + `pg` + `redis` in one `index.js` file | ~110 lines |
| Cache | Redis 7 (LRU, 256 MB locally) | key/value |
| Database | PostgreSQL 16 (Docker image locally) | 1 table |

### API
| Method | Path | Body / Result |
|---|---|---|
| POST | `/api/shorten` | `{ "url": "https://..." }` → `201` if new or `200` if it already exists: `{ "code": "aB3x9Q", "shortUrl": "http://host/aB3x9Q" }` |
| GET | `/:code` | `302 Location: <long url>` + header `X-Cache: local\|redis\|db`, or `404` |
| GET | `/healthz` | `200 ok` (checks the DB connection; Redis being down does **not** fail health) |

### Database
```sql
CREATE TABLE urls (
  code       VARCHAR(10) PRIMARY KEY,
  long_url   TEXT NOT NULL,
  url_hash   CHAR(64) NOT NULL UNIQUE,   -- sha256(long_url): dedupe without indexing a huge TEXT
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- **Code generation:** 7 random base62 characters (about 3.5 trillion combinations). This needs no sequence, so many server pods can write without coordinating.
- **Dedupe (write path):**
  1. Redis `h:<hash>` → `code`. On a hit, return it.
  2. Otherwise run `INSERT ... ON CONFLICT DO NOTHING RETURNING code`.
  3. If nothing was inserted, `SELECT code WHERE url_hash = ...`. This makes it safe when two pods shorten the same URL at the same moment.
  4. If that still finds nothing, the random code collided, so retry.

### Read path (the "celebrity link" problem)
A short link never changes once it's created, so it can be cached aggressively at every layer:

| Layer | What | Why |
|---|---|---|
| 1. CDN / browser | `Cache-Control: public, max-age=300` on the 302 | Repeat clicks and CloudFront (Stage 15) never reach the app |
| 2. In-process cache | Map per pod, 10k entries, 60 s TTL | A hot key is served from RAM. One celebrity link doesn't even hit Redis. |
| 3. Request coalescing | In-flight promise per code | When a hot key expires, 1,000 concurrent requests make **1** lookup, not 1,000 (stops a cache stampede) |
| 4. Redis | `c:<code>` → long URL, 24 h TTL, `allkeys-lru` | Shared across all pods; most reads end here |
| 5. Postgres | Primary-key lookup | Only on a cold miss; the result is written back to Redis |

If Redis is down, the app still works: it skips Redis and falls back to Postgres.

### Final folder layout
```
shortenUrlApp/
  ROADMAP.md
  docker-compose.yml
  db/init.sql
  server/  index.js  package.json  Dockerfile
  client/  src/App.jsx  src/main.jsx  index.html  vite.config.js  nginx.conf  Dockerfile
  k8s/     *.yaml
  loadtest/k6.js
```

---

## 3. Decisions needed from you before the AWS stages

> ⚠️ **Cost conflict:** my notes say you wanted **zero billable AWS resources**. EKS can't be done for free. Rough costs in us-east-1:
> - EKS control plane: about $0.10/hr (~$73/month)
> - 2× t3.medium nodes: about $0.08/hr
> - ALB: about $0.025/hr plus traffic
> - NAT gateway: about $0.045/hr
>
> **Total: roughly $0.25–0.30/hr while the cluster is running.** The plan is to **create the cluster, learn, then tear it down the same day** (Stage 17). A budget alarm is set up in Stage 5.

| # | Decision | Recommended for learning |
|---|---|---|
| D1 | Accept EKS cost with same-day teardown? | Yes, required for this goal |
| D2 | Database on AWS: **(a)** Postgres in the cluster (StatefulSet + EBS), or **(b)** Amazon RDS | **(a)** first (cheaper, same Docker image). Learn (b) in Stage 16 as the "real production" step. |
| D3 | AWS region | `ap-south-1` (Mumbai) or `us-east-1` |
| D4 | Custom domain + HTTPS (Route 53 + ACM)? | Optional. Skip at first and use the ALB DNS name. |

---

## 4. Stages

Every stage has a **Verify** list. Run the commands and compare against the expected results.

### Phase A — Local (free)

> Run the commands below in **Git Bash** from the `shortenUrlApp/` folder. In PowerShell, `curl` is a different command and the JSON quoting breaks.

#### Stage 0 — Clean slate + roadmap ✅
- Old code deleted; this file created.
- **Verify**
  - [x] `shortenUrlApp/` contains only `ROADMAP.md`
  - [ ] You have read this plan and answered D1–D4

#### Stage 1 — Database in Docker (built — awaiting your check)
- `db/init.sql` plus the `db` service in `docker-compose.yml` (postgres:16-alpine, `dbdata` volume, healthcheck).
- Published on host port **5433**, because a local Postgres already uses 5432 on this machine.
- **Verify**
  - [ ] `docker compose up -d db` → `docker compose ps` shows db `healthy`
  - [ ] `docker compose exec db psql -U app -d shortener -c "\d urls"` shows the table
  - [ ] `docker compose down` then `docker compose up -d db` → rows are still there (`... -c "select * from urls"`)

#### Stage 2 — Server (built — awaiting your check)
- `server/index.js` (~55 lines, deps: `express`, `pg`). Config comes from env vars: `DATABASE_URL`, `PORT`, and optionally `BASE_URL` (if unset, it uses the request's host).
- For local runs, `server/.env` points at the Docker DB on `localhost:5433`.
- **Verify** (port 3000 must be free; the containers don't publish it)
  - [ ] `cd server && npm install && npm run dev` → logs `listening on 3000`
  - [ ] `curl localhost:3000/healthz` → `ok`
  - [ ] `curl -X POST localhost:3000/api/shorten -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` → returns a `code`
  - [ ] `curl -i localhost:3000/<code>` → `302` with `Location: https://example.com`
  - [ ] `curl -i localhost:3000/doesnotexist` → `404`
  - [ ] `curl -X POST localhost:3000/api/shorten -H "Content-Type: application/json" -d '{"url":"notaurl"}'` → `400`

#### Stage 3 — Client (built — awaiting your check)
- React app (Vite): `src/App.jsx` has an input, a button, and a clickable result. It calls `/api/shorten` using a relative path, so the same build works behind nginx locally and behind the ALB on EKS.
- Dev mode without Docker: start the server (`npm run dev` in `server/`), then `npm install && npm run dev` in `client/` → http://localhost:5173. Vite proxies `/api` and short codes to `:3000`.
- **Verify** (at `http://localhost:8080` once Stage 4 is up, or at :5173 in dev mode)
  - [ ] Paste a long URL → a short link appears
  - [ ] Click the short link → the original site opens in a new tab
  - [ ] Type `abc` → the browser rejects it (the input has `type="url"`)

#### Stage 4 — Containerize everything (built — awaiting your check)
- `server/Dockerfile` (node:24-alpine, `npm ci --omit=dev`, non-root `node` user).
- `client/Dockerfile` is **multi-stage**:
  1. `node:24-alpine` runs `npm ci` + `npm run build` → `dist/`
  2. `nginx:alpine` copies only `dist/`, with `EXPOSE 80`. No Node or node_modules ship in the final image.
- `client/nginx.conf`: `/` → index.html, `/assets/*` → static files cached for 1 year, everything else → server. This mimics the ALB rules we'll use on EKS.
- `docker-compose.yml` now has 3 services. Only the client (8080) and db (5433) are published to the host.
- **Verify**
  - [ ] `docker compose up -d --build` → `docker compose ps` shows 3 services up
  - [ ] `http://localhost:8080` → shorten and redirect work end to end (the Stage 3 checks)
  - [ ] `curl -i localhost:8080/<code>` → `302`
  - [ ] `docker history shortenurlapp-server` → our layers add only ~11 MB on top of the base image. Docker Desktop reports ~255 MB server / ~94 MB client; almost all of that is the official base images.

#### Stage 4.5 — Read-heavy hardening: dedupe + Redis cache (built — awaiting your check)
- Adds the `url_hash` column, a `redis` service in compose, and the 5-layer read path described in section 2.
- ⚠️ The schema changed, so the local DB volume was reset (`docker compose down -v`). Old test links are gone.
- **Verify**
  - [ ] `docker compose ps` → 4 services: db, redis, server, client
  - [ ] Shorten `https://example.com` twice (in the UI or with curl) → **the same** short URL both times. The first call returns `201`, the second `200`.
  - [ ] Shorten `HTTPS://EXAMPLE.com/` → the same code as above (normalization)
  - [ ] Cache layers, using a new code each time:
    - `curl -sI localhost:8080/<code> | grep X-Cache` → the 1st call shows `redis` (written to Redis on create), and the 2nd call shows `local`
    - `docker compose restart server`, then curl again → `redis` (the in-process cache was cleared, but Redis still has it)
    - `docker compose exec redis redis-cli FLUSHALL` + `docker compose restart server` → `db`, then `local`
  - [ ] Redis down: `docker compose stop redis` → shorten + redirect still work (`X-Cache: db`/`local`). Then `docker compose start redis`.
  - [ ] Header check: `curl -sI localhost:8080/<code>` shows `Cache-Control: public, max-age=300`

### Phase B — AWS foundation (billing starts in Stage 7)

#### Stage 5 — AWS prerequisites
- Install `aws` CLI v2, `eksctl`, `kubectl`, and `helm`, then run `aws configure` with an IAM user or SSO (not the root account).
- Create an **AWS Budget alarm** (e.g. $10) that emails you.
- **Verify**
  - [ ] `aws sts get-caller-identity` shows your account
  - [ ] `eksctl version`, `kubectl version --client`, and `helm version` all work
  - [ ] The budget alarm is visible in the Billing console

#### Stage 6 — Push images to Amazon ECR
- You run these yourself in CMD/PowerShell. First `cd C:\GitProjects\ShortenUrl\shortenUrlApp`, because `docker compose` needs to be in the folder that holds `docker-compose.yml`. Account `786174827428`, region `ap-south-1`.
  ```
  aws ecr create-repository --repository-name shortenurl-server --image-scanning-configuration scanOnPush=true
  # Creates a private image repo for the server; ECR scans each pushed image for known vulnerabilities

  aws ecr create-repository --repository-name shortenurl-client --image-scanning-configuration scanOnPush=true
  # Same, for the client

  aws ecr get-login-password | docker login --username AWS --password-stdin 786174827428.dkr.ecr.ap-south-1.amazonaws.com
  # Turns your IAM login into a 12-hour Docker password, so docker push to ECR is allowed

  docker compose build
  # Rebuilds both local images (shortenurlapp-server, shortenurlapp-client) from the current code

  docker tag shortenurlapp-server 786174827428.dkr.ecr.ap-south-1.amazonaws.com/shortenurl-server:v1
  # Gives the server image a second name that includes the ECR address, which tells push where to send it

  docker tag shortenurlapp-client 786174827428.dkr.ecr.ap-south-1.amazonaws.com/shortenurl-client:v1
  # Same, for the client

  docker push 786174827428.dkr.ecr.ap-south-1.amazonaws.com/shortenurl-server:v1
  # Uploads the server image layers to ECR

  docker push 786174827428.dkr.ecr.ap-south-1.amazonaws.com/shortenurl-client:v1
  # Uploads the client image layers to ECR

  aws ecr describe-images --repository-name shortenurl-server --output table
  # Lists the images in the repo, to confirm v1 arrived (repeat with shortenurl-client)
  ```
  > Copy only the command lines. In CMD, `#` is not a comment, so pasting a `#` line gives an error (PowerShell ignores it).
- **Verify**
  - [ ] `aws ecr describe-images --repository-name shortenurl-server` lists tag `v1`
  - [ ] The same check passes for `shortenurl-client`
  - [ ] ECR console (ap-south-1) → both repos show `v1`, and the scan results show no CRITICAL findings

#### Stage 7 — Create the EKS cluster ($$ starts)
- Claude writes `k8s/cluster.yaml` (eksctl config): 1 managed node group, 2× t3.medium, min 2 / max 6, with OIDC enabled (needed for IRSA).
- `eksctl create cluster -f k8s/cluster.yaml` takes about 15–20 minutes.
- **Verify**
  - [ ] `kubectl get nodes` → 2 nodes `Ready`
  - [ ] `kubectl get pods -A` → system pods are Running

### Phase C — Run the app on EKS

#### Stage 8 — Database on the cluster (D2 = a)
- Install the EBS CSI driver add-on, then apply a Postgres `StatefulSet` + `PVC` + `Service` + `Secret`, with `init.sql` loaded from a ConfigMap.
- **Verify**
  - [ ] `kubectl get pvc` → `Bound`
  - [ ] `kubectl exec -it postgres-0 -- psql -U app -d shortener -c "\d urls"` shows the table
  - [ ] Delete the pod; it comes back and the data is still there

#### Stage 9 — Server + client Deployments
- Apply a `Deployment` and `Service` (ClusterIP) for each tier. The server gets readiness/liveness probes on `/healthz`, resource requests/limits, and 2 replicas.
- **Verify**
  - [ ] `kubectl get pods` → all Running/Ready
  - [ ] `kubectl port-forward svc/server 3000:80` → the same curl tests as Stage 2 pass
  - [ ] `kubectl logs deploy/server` shows no errors

#### Stage 10 — Public access with an ALB
- Install the **AWS Load Balancer Controller** (Helm + IAM role via IRSA).
- Apply an `Ingress`: `/` and `/assets/*` → client, everything else → server. Set `BASE_URL` to the ALB DNS name.
- **Verify**
  - [ ] `kubectl get ingress` shows an ADDRESS (`xxx.elb.amazonaws.com`) after about 2–3 minutes
  - [ ] Opening it in a browser → full flow works from the public internet
  - [ ] The ALB and its target groups (healthy targets) are visible in the EC2 console

### Phase D — Make it handle heavy traffic

#### Stage 11 — Autoscaling
- Install `metrics-server`.
- Add an **HPA** on the server: CPU 60%, 2 → 20 pods.
- Add **Cluster Autoscaler** (or Karpenter) so new nodes are added when pods can't be scheduled.
- Add a `PodDisruptionBudget` and spread pods across availability zones.
- **Verify**
  - [ ] `kubectl get hpa` shows real CPU %, not `<unknown>`
  - [ ] During the Stage 13 load test, the replica and node counts go up, then come back down afterwards

#### Stage 12 — Redis on EKS
- The caching code already exists (Stage 4.5). This stage only runs Redis in the cluster: a Deployment + Service for learning, or ElastiCache in Stage 16. Point `REDIS_URL` at it.
- Add **PgBouncer**, or keep a small `pg` pool size per pod, so 20 pods don't exhaust Postgres connections.
- **Verify**
  - [ ] `curl -sI http://<alb>/<code>` twice → `X-Cache: redis`, then `local`
  - [ ] `kubectl delete deploy redis` → the app still works (falls back to Postgres)

#### Stage 13 — Load test with k6
- Claude writes `loadtest/k6.js`: 90% redirects, 10% creates, ramping up virtual users.
- Run it from your laptop or a temporary EC2 instance.
- **Verify**
  - [ ] Report: requests/sec, p95 latency < 200 ms, error rate < 1%
  - [ ] HPA and node scale-out observed (Stage 11)
  - [ ] Write down: at what RPS does it break, and which component breaks first?

#### Stage 14 — Observability
- Enable CloudWatch **Container Insights** (add-on). Server logs are written as JSON to stdout.
- **Verify**
  - [ ] Pod CPU/memory graphs are visible in CloudWatch
  - [ ] Server logs can be searched in CloudWatch Logs

#### Stage 15 — (Optional) Domain, HTTPS, CDN
- Route 53 domain + ACM certificate on the ALB (HTTP → HTTPS redirect).
- Optional CloudFront in front of the ALB to cache `index.html` at the edge.
- **Verify**
  - [ ] `https://yourdomain/` works with a valid certificate (padlock shown)

#### Stage 16 — (Optional) Production-grade data tier
- Move Postgres to **Amazon RDS** (Multi-AZ, read replica) or Aurora, and Redis to **ElastiCache**.
- Store secrets in AWS Secrets Manager.
- Add CI/CD: a GitHub Actions workflow that builds → pushes to ECR → runs `kubectl apply`.
- **Verify**
  - [ ] The app works against RDS
  - [ ] A push to `main` deploys automatically

### Phase E — Clean up (do NOT skip)

#### Stage 17 — Teardown
- `kubectl delete ingress --all` first, so the controller removes the ALB.
- Then `eksctl delete cluster -f k8s/cluster.yaml`.
- Delete ECR images, leftover EBS volumes, RDS/ElastiCache (if Stage 16 was done), and any load balancers or Elastic IPs.
- **Verify**
  - [ ] EC2 console: no instances, no load balancers, no volumes
  - [ ] EKS console: no clusters
  - [ ] VPC console: no NAT gateways
  - [ ] The next day, Billing → Cost Explorer shows the daily spend dropped to ~$0

---

## 5. A note on "millions of users"

- **The architecture is what lets it scale to millions of users:** stateless server pods + HPA + cluster autoscaling + a cache in front of the database + a managed DB with read replicas + a CDN. Every piece of that is in Stages 11–16.
- **Actually *driving* millions of concurrent users costs real money**, both for the load generators and the scaled-out cluster. For learning, we prove the system scales out and back in under load (Stage 13), and record where the bottleneck is.

---

## 6. Progress tracker

| Stage | Status |
|---|---|
| 0 Clean slate + roadmap | ✅ |
| 1 DB in Docker | 🧪 built, awaiting your check |
| 2 Server | 🧪 built, awaiting your check |
| 3 Client | 🧪 built, awaiting your check |
| 4 Containerize | 🧪 built, awaiting your check |
| 4.5 Dedupe + Redis cache | 🧪 built, awaiting your check |
| 5 AWS prereqs | ☐ |
| 6 ECR | ☐ |
| 7 EKS cluster | ☐ |
| 8 DB on cluster | ☐ |
| 9 Deployments | ☐ |
| 10 ALB Ingress | ☐ |
| 11 Autoscaling | ☐ |
| 12 Redis on EKS | ☐ |
| 13 Load test | ☐ |
| 14 Observability | ☐ |
| 15 Domain/HTTPS (opt) | ☐ |
| 16 RDS/CI-CD (opt) | ☐ |
| 17 Teardown | ☐ |
