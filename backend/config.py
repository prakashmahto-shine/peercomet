import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
# Demo seed data (local development only; never loaded in production)
DB_PATH = DATA_DIR / "db.json"
MILVUS_DATA_DIR = BASE_DIR / "milvus_data"
MILVUS_DB_PATH = MILVUS_DATA_DIR / "peerpath.db"

# Server configuration
PORT = int(os.getenv("PORT", os.getenv("API_PORT", 5001)))
HOST = os.getenv("HOST", "0.0.0.0")

# Milvus configuration
# If an external Milvus server is provided, use it (e.g. http://localhost:19530 or https://in03-xxx.zillizcloud.com)
MILVUS_URI = os.getenv("MILVUS_URI", "")
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN", "")

# Embedding configuration
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
EMBEDDING_DIM = 384

# Product name shown to users in API messages (the frontend's is in src/config/brand.ts)
BRAND_NAME = os.getenv("BRAND_NAME", "PeerPath")

# ------------------------------------------------------------------------------
# Environment
# ------------------------------------------------------------------------------
# development (local) | staging | production
APP_ENV = os.getenv("APP_ENV", "development").lower()
IS_PRODUCTION = APP_ENV == "production"
IS_DEVELOPMENT = APP_ENV == "development"

def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")

def _env_list(name: str, default: str = "") -> list:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

# ------------------------------------------------------------------------------
# Database
# Any SQLAlchemy URL works. Local default is a SQLite file; in production point this
# at Postgres: postgresql://user:pass@host:5432/db?sslmode=require
# Switching providers later = pg_dump/pg_restore + change this URL.
# ------------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'backend' / 'data' / 'peerpath.sqlite3'}")
# Seed demo creators/candidates from db.json into an empty database (local development only)
SEED_DEMO_DATA = _env_bool("SEED_DEMO_DATA", True) and IS_DEVELOPMENT
# Enables /api/demo/reset (local development only)
DEMO_MODE = _env_bool("DEMO_MODE", False) and IS_DEVELOPMENT

# ------------------------------------------------------------------------------
# Auth & sessions
# ------------------------------------------------------------------------------
SESSION_COOKIE_NAME = "pp_session"
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))
# HTTPS-only cookie everywhere except local development
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", not IS_DEVELOPMENT)

# 'live' = Shine auth APIs (the only mode outside local development).
# 'mock' = local development only: fixed OTP, no SMS, demo users.
PEERPATH_AUTH_MODE = os.getenv("PEERPATH_AUTH_MODE", "mock" if IS_DEVELOPMENT else "live").lower()
PEERPATH_AUTH_API_URL = os.getenv("PEERPATH_AUTH_API_URL", "https://www.shine.com/pages/bff/api/v1").rstrip("/")
PEERPATH_AUTH_API_KEY = os.getenv("PEERPATH_AUTH_API_KEY", "")
MOCK_OTP_CODE = os.getenv("MOCK_OTP_CODE", "123456")

# Comma-separated PeerPath user ids with extra permissions
ADMIN_USER_IDS = set(_env_list("ADMIN_USER_IDS"))
RECRUITER_USER_IDS = set(_env_list("RECRUITER_USER_IDS"))

# Browser origins allowed to call the API with cookies
CORS_ORIGINS = _env_list("CORS_ORIGINS", "http://localhost:4242,http://127.0.0.1:4242")

# No dummy login on any server: mock auth is refused outside local development
if PEERPATH_AUTH_MODE == "mock" and not IS_DEVELOPMENT:
    raise RuntimeError(f"PEERPATH_AUTH_MODE=mock is only allowed when APP_ENV=development (APP_ENV={APP_ENV})")

# ------------------------------------------------------------------------------
# Session recordings storage: 'local' (directory / persistent volume) or 's3'
# ------------------------------------------------------------------------------
RECORDINGS_STORAGE = os.getenv("RECORDINGS_STORAGE", "local").lower()
RECORDINGS_DIR = Path(os.getenv("RECORDINGS_DIR", str(DATA_DIR / "recordings")))
S3_BUCKET = os.getenv("S3_BUCKET", "")
S3_PREFIX = os.getenv("S3_PREFIX", "recordings")
S3_REGION = os.getenv("S3_REGION", os.getenv("AWS_REGION", ""))
# Only for S3-compatible services other than AWS (e.g. MinIO)
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")
MAX_RECORDING_MB = int(os.getenv("MAX_RECORDING_MB", "500"))

# ------------------------------------------------------------------------------
# WebRTC ICE servers for video calls. STUN alone fails behind strict NATs/corporate
# firewalls, so production needs a TURN server.
# TURN_URLS: comma-separated, e.g. turn:turn.peerpath.in:3478,turns:turn.peerpath.in:5349
# ------------------------------------------------------------------------------
STUN_URLS = _env_list("STUN_URLS", "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
TURN_URLS = _env_list("TURN_URLS")
TURN_USERNAME = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL", "")
