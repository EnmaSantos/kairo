from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
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
    hashed_password = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), 
                        nullable=False, server_default=text('now()'))

class JournalEntry(Base):
    """
    This model defines the 'journal_entries' table in our database.
    """
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    # This sets up the foreign key relationship to the 'users' table
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text_content = Column(String, nullable=False)
    sentiment = Column(String, nullable=True) # For our stretch goal
    created_at = Column(TIMESTAMP(timezone=True), 
                        nullable=False, server_default=text('now()'))
    
    # This tells SQLAlchemy how to link this entry back to its owner (the User)
    owner = relationship("User")