import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
DB_PATH = DATA_DIR / "db.json"
MILVUS_DATA_DIR = BASE_DIR / "milvus_data"
MILVUS_DB_PATH = MILVUS_DATA_DIR / "peerpath.db"

PORT = int(os.getenv("PORT", os.getenv("API_PORT", 5001)))
HOST = os.getenv("HOST", "0.0.0.0")

MILVUS_URI = os.getenv("MILVUS_URI", "")
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN", "")

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
EMBEDDING_DIM = 384

BRAND_NAME = os.getenv("BRAND_NAME", "PeerComet")

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

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'backend' / 'data' / 'peerpath.sqlite3'}")
SEED_DEMO_DATA = False
DEMO_MODE = False

SESSION_COOKIE_NAME = "pp_session"
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SECURITY = os.getenv("SMTP_SECURITY", "starttls").lower()
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@peercomet.com")
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))
DEV_OTP_CODE = os.getenv("DEV_OTP_CODE", "123456")

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "smtp" if (SMTP_HOST and EMAIL_FROM) else "console").lower()
if EMAIL_BACKEND == "console" and not IS_DEVELOPMENT:
    print("[Config:Warning] Email isn't configured (SMTP_HOST / EMAIL_FROM). Sign-in is unavailable.")
    EMAIL_BACKEND = "smtp"

ADMIN_EMAILS = {e.lower() for e in _env_list("ADMIN_EMAILS")}
ADMIN_USER_IDS = set(_env_list("ADMIN_USER_IDS"))
RECRUITER_USER_IDS = set(_env_list("RECRUITER_USER_IDS"))

CORS_ORIGINS = _env_list("CORS_ORIGINS", "https://peercomet.com,https://www.peercomet.com,http://localhost:4242,http://127.0.0.1:4242,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000")

RECORDINGS_STORAGE = os.getenv("RECORDINGS_STORAGE", "local").lower()
RECORDINGS_DIR = Path(os.getenv("RECORDINGS_DIR", str(DATA_DIR / "recordings")))
RESUMES_DIR = Path(os.getenv("RESUMES_DIR", str(DATA_DIR / "resumes")))
MAX_RESUME_MB = int(os.getenv("MAX_RESUME_MB", "5"))
S3_BUCKET = os.getenv("S3_BUCKET", "")
S3_PREFIX = os.getenv("S3_PREFIX", "recordings")
S3_REGION = os.getenv("S3_REGION", os.getenv("AWS_REGION", ""))
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")
MAX_RECORDING_MB = int(os.getenv("MAX_RECORDING_MB", "500"))

STUN_URLS = _env_list("STUN_URLS", "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
TURN_URLS = _env_list("TURN_URLS")
TURN_USERNAME = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL", "")
