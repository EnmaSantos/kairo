from database import engine
from migrations import migrate_database
import models

def migrate():
    models.Base.metadata.create_all(bind=engine)
    migrate_database(engine)
    print("Kairo database schema is up to date.")

if __name__ == "__main__":
    migrate()
