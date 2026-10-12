"""
PeerPath database schema.

Columns that are filtered, joined or constrained on are real columns. The remaining
fields of each record live in a `data` JSON column that mirrors the Pydantic schema in
backend/models/schemas.py, so adding a profile field doesn't need a migration.
Only portable SQL is used (no provider-specific features), so the database can move from
SQLite (local) to any Postgres (self-hosted or Shine infra) by changing DATABASE_URL.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON

JsonType = JSON().with_variant(JSONB(), "postgresql")


def utcnow() -> datetime:
    return datetime.utcnow()


class Base(DeclarativeBase):
    pass


class User(Base):
    """A person who signed in via Shine. The same user can be a candidate and a mentor."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    # Shine's candidate id; the link to Shine's user table (null only for local demo users)
    shine_candidate_id: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    avatar: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AuthSession(Base):
    """Server-side login session. The cookie holds a random token; only its hash is stored."""
    __tablename__ = "auth_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class Candidate(Base):
    """Candidate profile (PeerPath-side data). id == users.id for real users."""
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True, index=True)
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Creator(Base):
    """Mentor profile. owner_user_id links it to the user who manages it."""
    __tablename__ = "creators"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_user_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="approved", index=True)
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Booking(Base):
    """A booked 1:1 mentorship session (MentorshipSession in the API)."""
    __tablename__ = "bookings"
    __table_args__ = (
        # A mentor's slot can hold only one upcoming booking. Enforced by the database, so it
        # holds across multiple server processes, not just within one.
        Index(
            "uq_bookings_upcoming_slot",
            "expert_id", "date", "time_slot",
            unique=True,
            postgresql_where=text("status = 'upcoming'"),
            sqlite_where=text("status = 'upcoming'"),
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    expert_id: Mapped[str] = mapped_column(String(64), index=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    date: Mapped[str] = mapped_column(String(64))
    time_slot: Mapped[str] = mapped_column(String(64))
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    candidate_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Post(Base):
    """Community post; comments are stored inside `data` (low volume, always read together)."""
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    mentor_id: Mapped[str] = mapped_column(String(64), index=True)
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    # null or 'all' = broadcast
    recipient_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    data: Mapped[dict] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class KeyValue(Base):
    """Small app-level values (e.g. marketplace counters)."""
    __tablename__ = "key_values"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JsonType)
