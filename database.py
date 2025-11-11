from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# --- DATABASE URL ---
# This is the connection string for your database.
# We are hard-coding it here for simplicity.
#
# Format: "postgresql://USERNAME:PASSWORD@localhost/DB_NAME"
#
# !! ACTION REQUIRED !!
# You MUST:
# 1. Create a PostgreSQL database (e.g., name it "kairo_db")
# 2. Update this string with your personal username, password, and DB name.
SQLALCHEMY_DATABASE_URL = "postgresql://enmanuel:mysecretpassword@localhost/kairo_db"


# --- Create the SQLAlchemy engine ---
# This is the main connection point to the database.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- Create a SessionLocal class ---
# Each instance of SessionLocal will be a new database session
# for an API request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Create a Base class ---
# All of our database models (like User and JournalEntry)
# will inherit from this class.
Base = declarative_base()