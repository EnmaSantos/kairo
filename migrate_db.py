from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE journal_entries ADD COLUMN image_url VARCHAR"))
            connection.commit()
            print("Successfully added image_url column to journal_entries table.")
        except Exception as e:
            print(f"Migration failed (column might already exist): {e}")

if __name__ == "__main__":
    migrate()
