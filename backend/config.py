import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
DB_PATH = DATA_DIR / "db.json"
if not DB_PATH.exists():
    fallback_path = BASE_DIR / "server" / "data" / "db.json"
    if fallback_path.exists():
        DB_PATH = fallback_path
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

# ------------------------------------------------------------------------------
# Environment
# ------------------------------------------------------------------------------
APP_ENV = os.getenv("APP_ENV", "development").lower()
IS_PRODUCTION = APP_ENV == "production"

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
# Seed demo creators/candidates from db.json into an empty database (never in production)
SEED_DEMO_DATA = _env_bool("SEED_DEMO_DATA", not IS_PRODUCTION)
# Enables /api/demo/reset (never in production)
DEMO_MODE = _env_bool("DEMO_MODE", False) and not IS_PRODUCTION

# ------------------------------------------------------------------------------
# Auth & sessions
# ------------------------------------------------------------------------------
SESSION_COOKIE_NAME = "pp_session"
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", IS_PRODUCTION)

# 'mock' = local/staging OTP flow (fixed OTP, no SMS). 'live' = Shine auth APIs.
SHINE_AUTH_MODE = os.getenv("SHINE_AUTH_MODE", "mock").lower()
SHINE_BFF_URL = os.getenv("SHINE_BFF_URL", "https://www.shine.com/pages/bff/api/v1").rstrip("/")
SHINE_API_KEY = os.getenv("SHINE_API_KEY", "")
MOCK_OTP_CODE = os.getenv("MOCK_OTP_CODE", "123456")

# Comma-separated PeerPath user ids with extra permissions
ADMIN_USER_IDS = set(_env_list("ADMIN_USER_IDS"))
RECRUITER_USER_IDS = set(_env_list("RECRUITER_USER_IDS"))

# Browser origins allowed to call the API with cookies
CORS_ORIGINS = _env_list("CORS_ORIGINS", "http://localhost:4242,http://127.0.0.1:4242")

if IS_PRODUCTION and SHINE_AUTH_MODE == "mock":
    raise RuntimeError("SHINE_AUTH_MODE=mock is not allowed when APP_ENV=production")
