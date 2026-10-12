from logging.config import fileConfig

from alembic import context

from backend.db import engine as db_engine
from backend.db.models import Base

config = context.config
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_online() -> None:
    # Uses the app's engine, i.e. DATABASE_URL (or whatever tests configured)
    connectable = config.attributes.get("connection") or db_engine.engine
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
