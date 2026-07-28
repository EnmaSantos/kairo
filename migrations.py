"""Small, dependency-free schema migrations for existing Kairo databases."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


JOURNAL_ENTRY_COLUMNS = {
    "emotion_label": "VARCHAR",
    "emotion_scores": "JSON",
    "voice_emotion": "VARCHAR",
    "voice_emotion_scores": "JSON",
    "summary": "VARCHAR",
    "ai_model_versions": "JSON",
    "ai_processed_at": "TIMESTAMP",
    "source_type": "VARCHAR DEFAULT 'text' NOT NULL",
}


def migrate_database(engine: Engine) -> None:
    """Add local-AI metadata columns without replacing or clearing user data."""

    inspector = inspect(engine)
    if "journal_entries" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("journal_entries")}
    missing = {
        name: definition
        for name, definition in JOURNAL_ENTRY_COLUMNS.items()
        if name not in existing
    }
    if not missing:
        return

    with engine.begin() as connection:
        for name, definition in missing.items():
            connection.execute(
                text(f"ALTER TABLE journal_entries ADD COLUMN {name} {definition}")
            )
