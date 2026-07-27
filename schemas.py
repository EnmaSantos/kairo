from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import Dict, Optional, List

# --- User Schemas ---

# This is the shape of data we expect for creating a user
# We only expect an email and a password.
# This is the shape of data we expect for creating a user
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    profile_picture_url: Optional[str] = None


# This is the shape of data we will *return* to the user
# We NEVER want to return the password, even the hash.
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    token: str
    mode: Optional[str] = "login" # 'login' or 'register'

# --- Journal Entry Schemas ---

class JournalEntryCreate(BaseModel):
    """ The shape of data we expect when creating an entry. """
    text_content: str
    notebook_id: Optional[int] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sentiment: Optional[str] = None
    emotion_label: Optional[str] = None
    emotion_scores: Optional[Dict[str, float]] = None
    voice_emotion: Optional[str] = None
    voice_emotion_scores: Optional[Dict[str, float]] = None
    summary: Optional[str] = None
    ai_model_versions: Optional[Dict[str, str]] = None
    ai_processed_at: Optional[datetime] = None
    source_type: str = Field(default="text", pattern="^(text|voice)$")

class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    """ The shape of data we will send back. """
    id: int
    text_content: str
    created_at: datetime
    user_id: int
    sentiment: Optional[str] = None  # This is for our stretch goal
    notebook_id: Optional[int] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    emotion_label: Optional[str] = None
    emotion_scores: Optional[Dict[str, float]] = None
    voice_emotion: Optional[str] = None
    voice_emotion_scores: Optional[Dict[str, float]] = None
    summary: Optional[str] = None
    ai_model_versions: Optional[Dict[str, str]] = None
    ai_processed_at: Optional[datetime] = None
    source_type: str = "text"

# --- Notebook Schemas ---
class NotebookCreate(BaseModel):
    title: str

class NotebookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    user_id: int
    entries: List[JournalEntryResponse] = []
