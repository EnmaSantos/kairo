import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# This line finds and loads your .env file
load_dotenv()

# This line securely reads the variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# --- Create the SQLAlchemy engine ---
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- Create a SessionLocal class ---
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Create a Base class ---
Base = declarative_base()