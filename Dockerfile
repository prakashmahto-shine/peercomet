# syntax=docker/dockerfile:1
# ==============================================================================
# PeerPath: single image serving the React frontend, the FastAPI API and the
# Socket.IO (WebRTC signaling) server on one port.
#
#   docker build -t peerpath .
#   docker run -p 5001:5001 --env-file .env peerpath
#
# Build for the cluster's CPU architecture, e.g. --platform linux/amd64.
# ==============================================================================

# --- Stage 1: build the frontend ----------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
# Leave empty when the API is served from the same host as the site (the default here)
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build


# --- Stage 2: Python runtime ---------------------------------------------------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface

WORKDIR /app

# Fully pinned dependencies. The extra index provides the CPU-only PyTorch wheel
# (torch==...+cpu); the default wheel bundles CUDA and is several GB larger.
COPY requirements.lock .
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.lock

# Bake the embedding model into the image so pods don't download it at startup
ARG EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
ENV EMBEDDING_MODEL_NAME=${EMBEDDING_MODEL_NAME}
RUN python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBEDDING_MODEL_NAME'])"
ENV HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

COPY alembic.ini run_backend.py ./
COPY backend ./backend
COPY --from=frontend /app/dist ./dist

# Run as a non-root user. Writable paths: milvus_data (vector index, rebuilt from the
# database on every start) and backend/data/{recordings,resumes} (only used when RECORDINGS_STORAGE=local).
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin peerpath \
    && mkdir -p /app/milvus_data /app/backend/data/recordings /app/backend/data/resumes \
    && chown -R 10001:10001 /app/milvus_data /app/backend/data
USER 10001

ENV APP_ENV=production \
    PORT=5001
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"5001\")}/api/health', timeout=4)"

# One worker per pod: WebRTC rooms and OTP rate limits live in process memory.
# --proxy-headers: trust X-Forwarded-* from the ingress (client IP, https scheme).
CMD ["sh", "-c", "exec uvicorn backend.main:socket_app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
