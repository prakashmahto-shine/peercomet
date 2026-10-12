"""
Database setup and demo seeding.

    python -m backend.db.seed            # run migrations, seed demo data if the DB is empty
    python -m backend.db.seed --reset    # wipe all data tables and re-seed (never in production)
"""
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import delete, func, select

from backend.config import APP_ENV, BASE_DIR, DB_PATH, SEED_DEMO_DATA
from backend.db import engine as db_engine
from backend.db import models as m
from backend.db.engine import db_session


def run_migrations():
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "backend" / "db" / "migrations"))
    cfg.attributes["configure_logger"] = False
    command.upgrade(cfg, "head")


def is_empty() -> bool:
    with db_session() as db:
        return (db.scalar(select(func.count()).select_from(m.Creator)) or 0) == 0


def seed_demo_data(json_path: Path = DB_PATH):
    """Loads the demo creators/candidates/sessions/posts from db.json.

    Demo creators are owned by a user with the same id (e.g. creator 'akash' -> user 'akash'),
    so the mock login can sign in as them locally.
    """
    raw = json.loads(Path(json_path).read_text(encoding="utf-8"))
    now = datetime.utcnow()

    def ts(index: int) -> datetime:
        # db.json lists newest first; keep that order via decreasing timestamps
        return now - timedelta(seconds=index)

    with db_session() as db:
        for i, c in enumerate(raw.get("creators", [])):
            db.add(m.Creator(id=c["id"], owner_user_id=c["id"], data=c, created_at=ts(i)))
        for i, c in enumerate(raw.get("candidates", [])):
            db.add(m.Candidate(id=c["id"], email=(c.get("email") or "").lower() or None, data=c, created_at=ts(i)))
        for i, b in enumerate(raw.get("badges", [])):
            db.add(m.Badge(id=b["id"], candidate_id=None, data=b, created_at=ts(i)))
        for i, p in enumerate(raw.get("posts", [])):
            db.add(m.Post(id=p["id"], mentor_id=p.get("mentorId", ""), data=p, created_at=ts(i)))
        for i, n in enumerate(raw.get("notifications", [])):
            db.add(m.Notification(id=n["id"], recipient_id=n.get("recipientId"), is_read=bool(n.get("isRead")), data=n, created_at=ts(i)))
        if raw.get("analytics"):
            db.add(m.KeyValue(key="analytics", value=raw["analytics"]))
        db.flush()

        seen_slots = set()
        for i, s in enumerate(raw.get("sessions", [])):
            slot = (s["expertId"].lower(), s["date"], s["timeSlot"])
            if s["status"] == "upcoming":
                if slot in seen_slots:
                    # Demo data may contain double bookings; keep the newest one
                    s = {**s, "status": "cancelled"}
                seen_slots.add(slot)
            db.add(m.Booking(
                id=s["id"], expert_id=s["expertId"], candidate_id=s["candidateId"], status=s["status"],
                date=s["date"], time_slot=s["timeSlot"], data=s, created_at=ts(i),
            ))

    print(f"[DB] Seeded demo data from {json_path}")


def reset_and_seed_demo_data():
    if APP_ENV != "development":
        raise RuntimeError(f"Refusing to reset data outside local development (APP_ENV={APP_ENV})")
    with db_session() as db:
        for model in (m.Booking, m.Badge, m.Post, m.Notification, m.Creator, m.Candidate, m.KeyValue):
            db.execute(delete(model))
    seed_demo_data()


def init_database():
    """Called on app startup: bring the schema up to date, seed demo data locally."""
    run_migrations()
    if SEED_DEMO_DATA and is_empty():
        if DB_PATH.exists():
            seed_demo_data()
        else:
            print(f"[DB] SEED_DEMO_DATA is on but {DB_PATH} is missing; starting with an empty database")


if __name__ == "__main__":
    print(f"[DB] Using {db_engine.engine.url.render_as_string(hide_password=True)}")
    if "--reset" in sys.argv:
        run_migrations()
        reset_and_seed_demo_data()
    else:
        init_database()
