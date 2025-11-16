from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# --- User Schemas ---

# This is the shape of data we expect for creating a user
# We only expect an email and a password.
class UserCreate(BaseModel):
    email: EmailStr  # Pydantic validates this is a real email format
    password: str

# This is the shape of data we will *return* to the user
# We NEVER want to return the password, even the hash.
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    # This Pydantic config tells it to read data
    # even if it's not a dict (like our SQLAlchemy model)
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None

# --- Journal Entry Schemas ---

class JournalEntryCreate(BaseModel):
    """ The shape of data we expect when creating an entry. """
    text_content: str

class JournalEntryResponse(BaseModel):
    """ The shape of data we will send back. """
    id: int
    text_content: str
    created_at: datetime
    user_id: int
    sentiment: Optional[str] = None  # This is for our stretch goal

    class Config:
        from_attributes = True