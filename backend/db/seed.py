"""
Database setup and demo data.

    python -m backend.db.seed                    # run migrations (seeds samples only if SEED_DEMO_DATA=true)
    python -m backend.db.seed --remove-demo      # show which sample (demo) rows exist
    python -m backend.db.seed --remove-demo --yes   # delete them, keeping real users' data
    python -m backend.db.seed --reset            # wipe everything and re-seed samples (development only)
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
            if not db.scalar(select(m.Creator).where(m.Creator.id == c["id"])):
                db.add(m.Creator(id=c["id"], owner_user_id=c["id"], data=c, created_at=ts(i)))
        for i, c in enumerate(raw.get("candidates", [])):
            if not db.scalar(select(m.Candidate).where(m.Candidate.id == c["id"])):
                db.add(m.Candidate(id=c["id"], email=(c.get("email") or "").lower() or None, data=c, created_at=ts(i)))
        for i, b in enumerate(raw.get("badges", [])):
            if not db.scalar(select(m.Badge).where(m.Badge.id == b["id"])):
                db.add(m.Badge(id=b["id"], candidate_id=None, data=b, created_at=ts(i)))
        for i, p in enumerate(raw.get("posts", [])):
            if not db.scalar(select(m.Post).where(m.Post.id == p["id"])):
                db.add(m.Post(id=p["id"], mentor_id=p.get("mentorId", ""), data=p, created_at=ts(i)))
        for i, n in enumerate(raw.get("notifications", [])):
            if not db.scalar(select(m.Notification).where(m.Notification.id == n["id"])):
                db.add(m.Notification(id=n["id"], recipient_id=n.get("recipientId"), is_read=bool(n.get("isRead")), data=n, created_at=ts(i)))
        if raw.get("analytics"):
            existing_an = db.scalar(select(m.KeyValue).where(m.KeyValue.key == "analytics"))
            if existing_an:
                existing_an.value = raw["analytics"]
            else:
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
            if not db.scalar(select(m.Booking).where(m.Booking.id == s["id"])):
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


def remove_demo_data(apply: bool = False) -> dict:
    """Deletes the sample rows loaded from db.json; real users' data stays.

    Sample rows are recognised by how they were created, so db.json isn't needed:
    real users have ids starting 'u_' (and an email), real mentors are created with ids
    starting 'exp-' and are owned by a real user. Everything else came from the samples.
    Bookings or posts that involve a sample mentor/candidate are removed with them.
    """
    real_user = m.User.id.like("u\\_%", escape="\\")
    with db_session() as db:
        demo_creator_ids = [r for (r,) in db.execute(select(m.Creator.id).where(
            ~(m.Creator.id.like("exp-%") & m.Creator.owner_user_id.like("u\\_%", escape="\\"))
        ))]
        real_creator_ids = [r for (r,) in db.execute(select(m.Creator.id).where(m.Creator.id.notin_(demo_creator_ids)))]
        demo_candidate_ids = [r for (r,) in db.execute(select(m.Candidate.id).where(~m.Candidate.id.like("u\\_%", escape="\\")))]
        targets = {
            "bookings": delete(m.Booking).where(
                m.Booking.expert_id.in_(demo_creator_ids) | m.Booking.candidate_id.in_(demo_candidate_ids)
                | ~m.Booking.candidate_id.like("u\\_%", escape="\\")
            ),
            # Posts by anyone who isn't a real mentor (samples include posts by non-existent mentors)
            "posts": delete(m.Post).where(m.Post.mentor_id.notin_(real_creator_ids)),
            "badges": delete(m.Badge).where(m.Badge.candidate_id.is_(None) | m.Badge.candidate_id.in_(demo_candidate_ids)),
            "notifications": delete(m.Notification).where(
                m.Notification.recipient_id.in_(demo_candidate_ids + demo_creator_ids)
            ),
            "creators": delete(m.Creator).where(m.Creator.id.in_(demo_creator_ids)),
            "candidates": delete(m.Candidate).where(m.Candidate.id.in_(demo_candidate_ids)),
            "users": delete(m.User).where(~real_user),
            # Sample marketplace counters (e.g. "6,350 registrations")
            "counters": delete(m.KeyValue).where(m.KeyValue.key == "analytics"),
        }
        # Real accounts created earlier got made-up profile defaults; clear those exact values
        old_defaults = {"location": "Bengaluru, India", "experienceYears": "4+ Years",
                        "jobSearchStatus": "Actively Looking"}
        profiles_with_defaults = []
        for row in db.scalars(select(m.Candidate).where(m.Candidate.id.like("u\\_%", escape="\\"))):
            data = dict(row.data)
            changed = False
            for field, value in old_defaults.items():
                if data.get(field) == value:
                    data[field] = None if field != "jobSearchStatus" else ""
                    changed = True
            if changed:
                if data.get("profileScore") == 75:
                    data["profileScore"] = 0
                profiles_with_defaults.append((row, data))

        counts = {}
        for name, stmt in targets.items():
            count_stmt = select(func.count()).select_from(stmt.table)
            if stmt.whereclause is not None:
                count_stmt = count_stmt.where(stmt.whereclause)
            counts[name] = db.scalar(count_stmt) or 0
        counts["profile_default_values"] = len(profiles_with_defaults)
        if apply:
            for stmt in targets.values():
                db.execute(stmt)
            for row, data in profiles_with_defaults:
                row.data = data
        else:
            db.rollback()
    return counts


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
    if "--remove-demo" in sys.argv:
        run_migrations()
        apply = "--yes" in sys.argv
        counts = remove_demo_data(apply=apply)
        for name, n in counts.items():
            print(f"  {name}: {n}")
        print("Deleted." if apply else "Nothing deleted. Re-run with --yes to delete these rows.")
    elif "--reset" in sys.argv:
        run_migrations()
        reset_and_seed_demo_data()
    else:
        init_database()
