# PeerComet: Deployment Guide

This guide is for the infra team. PeerComet ships as **one Docker image**. It runs on a VM with Docker or on Kubernetes; the requirements below apply to both, and the [platform notes](#platform-notes) cover the differences.

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
- There is no fixed sign-in code: `EMAIL_BACKEND=console` is ignored and every code is random and emailed.
- It never loads demo data and has no demo-reset endpoint.

| Variable | Required | Example / default | Notes |
|---|---|---|---|
| `APP_ENV` | yes | `production` (image default) or `staging` | |
| `DATABASE_URL` | yes | `postgresql://peerpath:***@db-host:5432/peerpath?sslmode=require` | **Secret** |
| `SMTP_HOST` / `SMTP_PORT` | yes | `smtp.example.com` / `587` | Sign-in codes are sent by email. Until `SMTP_HOST` and `EMAIL_FROM` are set, the app runs but sign-in returns 503. |
| `SMTP_SECURITY` | no | `starttls` | `starttls` (587), `ssl` (465) or `none` |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | usually | | **Secret** |
| `EMAIL_FROM` | yes | `PeerComet <no-reply@peercomet.com>` | Sender address. Its domain needs SPF/DKIM for the SMTP service, or mail lands in spam. |
| `OTP_TTL_MINUTES` | no | `10` | How long a sign-in code is valid |
| `CORS_ORIGINS` | yes | `https://peercomet.com` | Comma-separated; also used by Socket.IO |
| `SESSION_TTL_DAYS` | no | `30` | Login session lifetime |
| `ADMIN_EMAILS` | no | `ops@peercomet.com` | Comma-separated emails with admin access. Admins sign in with the normal email code at `/admin`. |
| `ADMIN_USER_IDS` | no | | PeerComet user ids with admin access (alternative to `ADMIN_EMAILS`) |
| `RECRUITER_USER_IDS` | no | | PeerComet user ids allowed to use recruiter search |
| `RECORDINGS_STORAGE` | yes | `s3` (recommended) or `local` | See [Storage](#storage) |
| `S3_BUCKET` | when `s3` | | |
| `S3_PREFIX` | no | `recordings` | |
| `S3_REGION` / `AWS_REGION` | when `s3` | `ap-south-1` | |
| `S3_ENDPOINT_URL` | no | | Only for non-AWS S3-compatible storage |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | when `s3` without an IAM role | | **Secret** |
| `RECORDINGS_DIR` | when `local` | `/app/backend/data/recordings` | Must be on persistent storage |
| `MAX_RECORDING_MB` | no | `500` | Largest accepted recording upload |
| `TURN_URLS` | **yes for production** | `turn:turn.peercomet.com:3478,turns:turn.peercomet.com:5349` | See [Video calls](#video-calls-turn) |
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

- **Host and TLS:** the public host (e.g. `peercomet.com`) with TLS. Route everything (`/`) to port `5001`; the app serves the site, `/api` and `/socket.io` itself.
- **WebSockets** must be allowed on `/socket.io/`, with long timeouts (e.g. nginx `proxy_read_timeout 3600s`).
- **Request body size:** at least `MAX_RECORDING_MB` (500 MB) for recording uploads. The nginx default is 1 MB.
- **Forwarded headers:** forward `X-Forwarded-For` and `X-Forwarded-Proto`. Uvicorn runs with `--proxy-headers`.
- **Cookies:** the login session is an `httpOnly`, `Secure`, `SameSite=Lax` cookie (`pp_session`), so the site must be served over HTTPS.

## Network egress

The container needs outbound HTTPS to:
- **The SMTP server** (`SMTP_HOST`, usually port 587 or 465).
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

### Single-server setup (e.g. the Yotta staging VM)

`docker-compose.yml` runs the whole stack on one Linux server:

| Service | What | Enabled |
|---|---|---|
| `app` | PeerComet image. Listens on `127.0.0.1:5001` only. | always |
| `postgres` | PostgreSQL 16. Data in the `pgdata` volume. | always |
| `backup` | `pg_dump` at start-up and every 24 hours into `./backups`. Keeps `BACKUP_KEEP_DAYS` days. | always |
| `caddy` | HTTPS (automatic Let's Encrypt certificate) on 80/443 and proxy to `app` | `COMPOSE_PROFILES` contains `caddy` |
| `coturn` | TURN server for video calls (host network) | `COMPOSE_PROFILES` contains `turn` |

**Resource limits** (the server is shared): `app` 2 CPU / 3 GB, `postgres` 1 CPU / 1 GB, the others 256 MB each.

**Server prerequisites**
- Linux x86_64 with Docker Engine and the Compose plugin.
- 2 vCPU / 4 GB RAM free, and about 30 GB of disk.
- DNS: an A record for `SITE_DOMAIN` pointing at the server.
- Firewall inbound: TCP 80 and 443. For TURN: UDP and TCP 3478, plus UDP 49160–49200.
- Outbound to the SMTP server for sign-in emails (port 587 or 465).

**First deploy**

```bash
git clone <repo> /opt/peerpath && cd /opt/peerpath
cp .env.example .env              # fill in SITE_DOMAIN, SERVER_PUBLIC_IP, POSTGRES_PASSWORD,
                                  # TURN_CREDENTIAL, SMTP_* and EMAIL_FROM (keep .env private)
docker compose up -d --build
docker compose ps                 # all services "running"; app becomes healthy in ~1-2 min
curl -fsS https://$SITE_DOMAIN/api/ready
```

The first start creates the database tables. No demo data is loaded.

**Sign-in emails on staging (Mailpit)**

To test sign-in on staging without a real mail account, run Mailpit, a mail server that keeps
every email in a web inbox and sends nothing out. The app still creates random codes.

```env
COMPOSE_PROFILES=mailpit          # plus caddy/turn if used
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURITY=none
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=PeerComet <no-reply@peercomet.com>
MAILPIT_UI_AUTH=team:<long-password>
MAILPIT_UI_BIND=127.0.0.1         # 0.0.0.0 only on an office network / VPN
```

Open the inbox with `ssh -L 8025:127.0.0.1:8025 <user>@<server>` and then http://localhost:8025.
The inbox shows everyone's codes, so keep it private. Use a real SMTP service for production.

**Updating to a new version**

```bash
cd /opt/peerpath && git pull
docker compose up -d --build app  # brief restart of the app only; data is kept
```

**Backups**
- Dumps are in `/opt/peerpath/backups`. Copy them off the server regularly, e.g. with a cron job using `rsync` or `scp`.
- Restore, which **replaces** the current data:
  ```bash
  docker compose exec -T postgres pg_restore --clean --if-exists --no-owner -U peerpath -d peerpath < backups/<file>.dump
  ```

**If the server already runs nginx on 80/443:** leave `caddy` out of `COMPOSE_PROFILES` and add a site to nginx:

```nginx
server {
    listen 443 ssl;
    server_name peercomet.com;                  # SITE_DOMAIN
    # ssl_certificate / ssl_certificate_key as for the server's other sites
    client_max_body_size 500m;
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

**Moving to production infra later**
1. `pg_dump` from this server and `pg_restore` into the new database.
2. Deploy the same image there.
3. Set `DATABASE_URL`.

No code changes are needed.

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
| SMTP account for sign-in emails (`SMTP_*`, `EMAIL_FROM`) | Needed before go-live. Sign-in returns 503 until configured. |
| S3 bucket for recordings | Requested from infra |
| TURN server | Requested from infra |
