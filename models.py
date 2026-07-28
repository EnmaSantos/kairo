from sqlalchemy import JSON, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy.sql.expression import text
from sqlalchemy.orm import relationship

# Import the 'Base' class from our database.py file
from database import Base 

class User(Base):
    """
    This model defines the 'users' table in our database.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    full_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), 
                        nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    
    notebooks = relationship("Notebook", back_populates="owner")

class JournalEntry(Base):
    """
    This model defines the 'journal_entries' table in our database.
    """
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    # This sets up the foreign key relationship to the 'users' table
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text_content = Column(String, nullable=False)
    image_url = Column(String, nullable=True) # New column for image uploads
    latitude = Column(String, nullable=True) # Store as string for simplicity, or Float
    longitude = Column(String, nullable=True)
    # `sentiment` remains the broad mood used by existing filters. The richer
    # local model result is stored separately so older clients keep working.
    sentiment = Column(String, nullable=True)
    emotion_label = Column(String, nullable=True)
    emotion_scores = Column(JSON, nullable=True)
    voice_emotion = Column(String, nullable=True)
    voice_emotion_scores = Column(JSON, nullable=True)
    summary = Column(String, nullable=True)
    ai_model_versions = Column(JSON, nullable=True)
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    source_type = Column(String, nullable=False, default="text", server_default="text")
    created_at = Column(TIMESTAMP(timezone=True), 
                        nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    
    # This tells SQLAlchemy how to link this entry back to its owner (the User)
    owner = relationship("User")
    
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="SET NULL"), nullable=True)
    notebook = relationship("Notebook", back_populates="entries")

class Notebook(Base):
    __tablename__ = "notebooks"
    
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    
    owner = relationship("User", back_populates="notebooks")
    entries = relationship("JournalEntry", back_populates="notebook")
