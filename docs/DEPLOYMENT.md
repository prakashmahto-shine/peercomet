# PeerPath: Deployment Guide

This guide is for the infra team. PeerPath ships as **one Docker image**. It runs on a VM with Docker or on Kubernetes; the requirements below apply to both, and the [platform notes](#platform-notes) cover the differences.

## At a glance

| Item | Value |
|---|---|
| Image | One container: React site, REST API (`/api/*`) and Socket.IO WebRTC signaling (`/socket.io/*`) |
| Build | `docker build --platform linux/amd64 -t peerpath:<tag> .` |
| Port | `5001` (HTTP; TLS terminates at the load balancer, reverse proxy or ingress) |
| Runtime | Python 3.11, Uvicorn, 1 worker, non-root user (uid `10001`) |
| Database | PostgreSQL 14+ (`DATABASE_URL`) |
| Liveness | `GET /api/health` (process is up; no dependencies) |
| Readiness | `GET /api/ready` (returns 503 until the database answers) |
| Instances | **1** for now (see [Scaling](#scaling)) |
| Machine size (starting point) | 2 vCPU, 4 GB RAM. The container uses about 1.5 GB and may peak near 3 GB. |

The image includes CPU-only PyTorch and a sentence-embedding model (`all-MiniLM-L6-v2`), so it is over 1 GB. It needs no internet access at startup to download models.

Python dependencies are fully pinned in `requirements.lock`, so rebuilding the same commit gives the same versions.

## Startup sequence

1. **Alembic migrations** run against `DATABASE_URL`. The app does not start if they fail.
2. The in-process vector index (Milvus Lite) is rebuilt from the database into `/app/milvus_data`. This takes tens of seconds.
3. The server listens on `:5001`. Allow about 2 minutes before health checks count failures.

## Configuration

All settings are environment variables. `.env.example` is a complete server template.

**No mock or demo behaviour runs on servers.** Outside `APP_ENV=development`:
- The app refuses to start with `PEERPATH_AUTH_MODE=mock`.
- It never loads demo data and has no demo-reset endpoint.

| Variable | Required | Example / default | Notes |
|---|---|---|---|
| `APP_ENV` | yes | `production` (image default) or `staging` | |
| `DATABASE_URL` | yes | `postgresql://peerpath:***@db-host:5432/peerpath?sslmode=require` | **Secret** |
| `PEERPATH_AUTH_MODE` | no | `live` | The only allowed value on servers |
| `PEERPATH_AUTH_API_KEY` | yes | | **Secret.** Key issued by Shine for the PeerPath backend. Until it is set, the app runs but login returns 503. |
| `PEERPATH_AUTH_API_URL` | no | `https://www.shine.com/pages/bff/api/v1` | Shine auth API base URL |
| `CORS_ORIGINS` | yes | `https://peerpath.in` | Comma-separated; also used by Socket.IO |
| `SESSION_TTL_DAYS` | no | `30` | Login session lifetime |
| `ADMIN_USER_IDS` | no | | PeerPath user ids with admin access |
| `RECRUITER_USER_IDS` | no | | PeerPath user ids allowed to use recruiter search |
| `RECORDINGS_STORAGE` | yes | `s3` (recommended) or `local` | See [Storage](#storage) |
| `S3_BUCKET` | when `s3` | | |
| `S3_PREFIX` | no | `recordings` | |
| `S3_REGION` / `AWS_REGION` | when `s3` | `ap-south-1` | |
| `S3_ENDPOINT_URL` | no | | Only for non-AWS S3-compatible storage |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | when `s3` without an IAM role | | **Secret** |
| `RECORDINGS_DIR` | when `local` | `/app/backend/data/recordings` | Must be on persistent storage |
| `MAX_RECORDING_MB` | no | `500` | Largest accepted recording upload |
| `TURN_URLS` | **yes for production** | `turn:turn.peerpath.in:3478,turns:turn.peerpath.in:5349` | See [Video calls](#video-calls-turn) |
| `TURN_USERNAME` / `TURN_CREDENTIAL` | with `TURN_URLS` | | **Secret** |
| `STUN_URLS` | no | Google public STUN | Comma-separated |

Secrets must come from a secret store or an untracked `.env` on the host. Never bake them into the image; the image contains no `.env`.

### Database

- **Engine:** PostgreSQL 14 or newer. Only standard SQL is used, so managed (RDS) and self-hosted both work.
- **Privileges:** the app's DB user needs privileges to create and alter tables in its own database or schema, because migrations run at startup.
- **Size:** small. Well under 1 GB for the first year at the expected scale (hundreds of users a month).
- **Backups:** daily, with point-in-time recovery if available.
- **Manual migration**, if you prefer to run it separately: `docker run --rm --env-file .env peerpath:<tag> python -m backend.db.seed`.

## Storage

| Path in container | What | Persistence |
|---|---|---|
| `/app/milvus_data` | Vector search index | Not needed: rebuilt from the database on each start |
| `/tmp` | Milvus Lite's local socket | Scratch |
| `/app/backend/data/recordings` | Session recordings, only when `RECORDINGS_STORAGE=local` | **Must persist** (Docker volume / PVC) |

**Recommended:** `RECORDINGS_STORAGE=s3` with a private, encrypted bucket.
- The app uploads with `PutObject`.
- Playback redirects the browser to a presigned `GetObject` URL that is valid for 15 minutes.
- **IAM:** the app needs `s3:PutObject` and `s3:GetObject` on `arn:aws:s3:::<bucket>/<prefix>/*`.

Recordings are personal data.

## HTTP routing (reverse proxy / load balancer / ingress)

- **Host and TLS:** the public host (e.g. `peerpath.in`) with TLS. Route everything (`/`) to port `5001`; the app serves the site, `/api` and `/socket.io` itself.
- **WebSockets** must be allowed on `/socket.io/`, with long timeouts (e.g. nginx `proxy_read_timeout 3600s`).
- **Request body size:** at least `MAX_RECORDING_MB` (500 MB) for recording uploads. The nginx default is 1 MB.
- **Forwarded headers:** forward `X-Forwarded-For` and `X-Forwarded-Proto`. Uvicorn runs with `--proxy-headers`.
- **Cookies:** the login session is an `httpOnly`, `Secure`, `SameSite=Lax` cookie (`pp_session`), so the site must be served over HTTPS.

## Network egress

The container needs outbound HTTPS to:
- **Shine auth APIs** (`PEERPATH_AUTH_API_URL`).
- **S3**, when using S3 storage.

## Video calls (TURN)

Calls are peer-to-peer WebRTC. The server only relays the connection handshake over Socket.IO; media doesn't pass through it. Users behind strict NATs or corporate firewalls can't connect directly, so production needs **a TURN relay**.
- TURN uses UDP/TCP `3478`, TLS `5349` and a UDP relay port range. It is not HTTP and can't go through the HTTP proxy.
- **Options:** coturn on its own VM, or a managed TURN provider.
- Put the URLs and credentials in `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL`. The app hands them to signed-in users at `GET /api/webrtc/ice-servers`.

## Scaling

Run **exactly one instance** for now. Two things live in process memory:
- **Socket.IO call rooms.** Two instances would split the two people in a call, and the call won't connect.
- **OTP rate limits.**

On deploy, stop the old instance before starting the new one (Kubernetes: `strategy: Recreate`).

Running several instances later needs:
1. Redis, with the Socket.IO Redis manager (code change).
2. Sticky sessions at the load balancer.
3. Migrations run as a separate pre-deploy step.

## Platform notes

### VM with Docker

```bash
docker build --platform linux/amd64 -t peerpath:<tag> .
# .env from .env.example with real values (keep it out of git)
docker compose up -d              # see docker-compose.yml
```

- Put nginx (or the company load balancer) in front for TLS, WebSockets and the upload size, as described in [HTTP routing](#http-routing-reverse-proxy--load-balancer--ingress).
- The Docker image has a `HEALTHCHECK` on `/api/health`.

### Kubernetes

- **Deployment:** `replicas: 1`, `strategy: Recreate`, `containerPort: 5001`. Config goes in a ConfigMap and secrets in a Secret (via `envFrom`).
- **Probes:**
  - `startupProbe` on `/api/health`, e.g. period 5s × 60.
  - `livenessProbe` on `/api/health`.
  - `readinessProbe` on `/api/ready`.
- **Resources:** requests 500m CPU / 1.5Gi memory; limits 2 CPU / 3Gi memory.
- **Security context:**
  - `runAsNonRoot: true` (uid `10001`), `allowPrivilegeEscalation: false`, drop all capabilities.
  - With `readOnlyRootFilesystem: true`, mount `emptyDir` at `/tmp` and `/app/milvus_data`.
  - If using `RECORDINGS_STORAGE=local`, mount a PVC at `/app/backend/data/recordings`.
- **Ingress (nginx) annotations:** `proxy-body-size: "500m"`, `proxy-read-timeout: "3600"`, `proxy-send-timeout: "3600"`.

## Status of external dependencies

| Dependency | Status |
|---|---|
| Machine/cluster, domain, TLS, PostgreSQL | Requested from infra |
| Shine login/registration API and `PEERPATH_AUTH_API_KEY` | Pending from the Shine auth team. Login returns 503 until configured. |
| S3 bucket for recordings | Requested from infra |
| TURN server | Requested from infra |
