"""Kairo's cloud-safe API.

This process owns authentication, journal storage, notebooks, uploads, and
sync. It deliberately imports no ML runtime and is safe to deploy without
shipping model weights. AI work is provided by ``local_ai.py`` on the user's
device.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date, datetime
import os
from pathlib import Path
import random
import secrets
import shutil
import uuid
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session, joinedload

import auth
from database import SessionLocal, engine
from migrations import migrate_database
import models
import schemas
import utils


load_dotenv()

PROJECT_DIR = Path(__file__).resolve().parent
STATIC_DIR = PROJECT_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    migrate_database(engine)
    yield


app = FastAPI(
    title="Kairo Cloud API",
    description="Authentication, journal storage, notebooks, uploads, and sync.",
    version="2.0.0",
    lifespan=lifespan,
)

default_origins = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
configured_origins = {
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(default_origins | configured_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = auth.verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == token_data.id).first()
    if user is None:
        raise credentials_exception
    return user


def generate_notebook_title(prefix: str, full_text: str) -> str:
    if len(full_text) <= 50:
        return f"{prefix}Journal"
    words = full_text.split()
    snippet = " ".join(words[:12]).strip()
    if not snippet:
        return f"{prefix}Journal"
    if len(words) > 12:
        snippet = f"{snippet}..."
    return f"{prefix}{snippet}"


def require_owned_notebook(
    notebook_id: Optional[int],
    user_id: int,
    db: Session,
) -> None:
    if notebook_id is None:
        return
    notebook = (
        db.query(models.Notebook)
        .filter(
            models.Notebook.id == notebook_id,
            models.Notebook.user_id == user_id,
        )
        .first()
    )
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Kairo Cloud API",
        "runtime": "cloud",
        "ai": "local-only",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "runtime": "cloud", "ai_loaded": False}


@app.get("/capabilities")
def capabilities():
    return {
        "runtime": "cloud",
        "entries": True,
        "notebooks": True,
        "uploads": True,
        "authentication": True,
        "ai": False,
        "ai_requires_local_companion": True,
    }


@app.post("/login", response_model=schemas.Token)
def login(
    user_credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == user_credentials.username)
        .first()
    )
    if not user or not utils.verify_password(
        user_credentials.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials",
        )
    access_token = auth.create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


def google_oauth_is_configured() -> bool:
    return bool(
        GOOGLE_CLIENT_ID
        and GOOGLE_CLIENT_ID != "placeholder-client-id"
        and GOOGLE_CLIENT_ID.endswith(".apps.googleusercontent.com")
    )


@app.post("/auth/google", response_model=schemas.Token)
def google_auth(
    auth_request: schemas.GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    if not google_oauth_is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Google sign-in is not configured. Set GOOGLE_CLIENT_ID to a "
                "Google web client ID."
            ),
        )

    try:
        id_info = id_token.verify_oauth2_token(
            auth_request.token,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid Google token") from exc

    email = id_info["email"]
    name = id_info.get("name", "")
    picture = id_info.get("picture", "")
    user = db.query(models.User).filter(models.User.email == email).first()

    if auth_request.mode == "register" and user:
        raise HTTPException(status_code=400, detail="Account already exists. Please log in.")

    if not user:
        base_username = email.split("@")[0]
        username = base_username
        counter = 1
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = models.User(
            email=email,
            hashed_password=utils.hash_password(secrets.token_urlsafe(16)),
            username=username,
            full_name=name,
            profile_picture_url=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = auth.create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post(
    "/users",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.UserResponse,
)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    random_suffix = "".join(str(random.randint(0, 9)) for _ in range(4))
    profile_pic = (
        "https://api.dicebear.com/9.x/avataaars/svg?"
        f"seed={user.username}{random_suffix}"
    )
    new_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=utils.hash_password(user.password),
        profile_picture_url=profile_pic,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get("/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/users/me", response_model=schemas.UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if user_update.email and user_update.email != current_user.email:
        if db.query(models.User).filter(models.User.email == user_update.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email

    if user_update.username and user_update.username != current_user.username:
        if (
            db.query(models.User)
            .filter(models.User.username == user_update.username)
            .first()
        ):
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = user_update.username

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.password:
        current_user.hashed_password = utils.hash_password(user_update.password)
    if user_update.profile_picture_url is not None:
        current_user.profile_picture_url = user_update.profile_picture_url

    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    del current_user
    file_ext = Path(file.filename or "").suffix.lower()
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / filename
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="File upload failed") from exc

    base_url = str(request.base_url).rstrip("/")
    return {"url": f"{base_url}/static/uploads/{filename}"}


@app.post(
    "/journal-entries",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.JournalEntryResponse,
)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_owned_notebook(entry.notebook_id, current_user.id, db)
    new_entry = models.JournalEntry(
        text_content=entry.text_content,
        user_id=current_user.id,
        notebook_id=entry.notebook_id,
        image_url=entry.image_url,
        latitude=str(entry.latitude) if entry.latitude is not None else None,
        longitude=str(entry.longitude) if entry.longitude is not None else None,
        sentiment=entry.sentiment,
        emotion_label=entry.emotion_label,
        emotion_scores=entry.emotion_scores,
        voice_emotion=entry.voice_emotion,
        voice_emotion_scores=entry.voice_emotion_scores,
        summary=entry.summary,
        ai_model_versions=entry.ai_model_versions,
        ai_processed_at=entry.ai_processed_at,
        source_type=entry.source_type,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@app.get("/journal-entries", response_model=List[schemas.JournalEntryResponse])
def get_journal_entries(
    search: Optional[str] = None,
    sentiment: Optional[str] = None,
    notebook_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id
    )
    if search:
        query = query.filter(models.JournalEntry.text_content.ilike(f"%{search}%"))
    if sentiment and sentiment.lower() != "all":
        query = query.filter(models.JournalEntry.sentiment == sentiment.lower())
    if notebook_id is not None:
        query = query.filter(models.JournalEntry.notebook_id == notebook_id)
    return query.order_by(models.JournalEntry.created_at.desc()).all()


@app.delete(
    "/journal-entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.JournalEntry)
        .filter(
            models.JournalEntry.id == entry_id,
            models.JournalEntry.user_id == current_user.id,
        )
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post(
    "/notebooks",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.NotebookResponse,
)
def create_notebook(
    notebook: schemas.NotebookCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_notebook = models.Notebook(title=notebook.title, user_id=current_user.id)
    db.add(new_notebook)
    db.commit()
    db.refresh(new_notebook)
    return new_notebook


@app.get("/notebooks", response_model=List[schemas.NotebookResponse])
def get_notebooks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Notebook)
        .options(joinedload(models.Notebook.entries))
        .filter(models.Notebook.user_id == current_user.id)
        .all()
    )


@app.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notebook = (
        db.query(models.Notebook)
        .filter(
            models.Notebook.id == notebook_id,
            models.Notebook.user_id == current_user.id,
        )
        .first()
    )
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    db.delete(notebook)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post(
    "/notebooks/auto-generate",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.NotebookResponse,
)
def auto_generate_notebook(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    mode: Optional[str] = "daily",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        start_day = (
            datetime.strptime(start_date, "%Y-%m-%d").date()
            if start_date
            else date.today()
        )
        end_day = (
            datetime.strptime(end_date, "%Y-%m-%d").date()
            if end_date
            else start_day
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD",
        ) from exc

    start_dt = datetime.combine(start_day, datetime.min.time())
    end_dt = datetime.combine(end_day, datetime.max.time())
    entries = (
        db.query(models.JournalEntry)
        .filter(
            models.JournalEntry.user_id == current_user.id,
            models.JournalEntry.created_at >= start_dt,
            models.JournalEntry.created_at <= end_dt,
            models.JournalEntry.notebook_id.is_(None),
        )
        .all()
    )
    if not entries:
        raise HTTPException(
            status_code=404,
            detail="No uncategorized entries found for this period.",
        )

    if mode == "weekly":
        prefix = "Weekly Recap: "
    elif mode == "monthly":
        prefix = "Monthly Review: "
    elif mode == "custom":
        prefix = (
            f"Journal ({start_day.strftime('%b %d')} - "
            f"{end_day.strftime('%b %d')}): "
        )
    else:
        prefix = f"{start_day.strftime('%b %d')}: "

    full_text = " ".join(entry.text_content for entry in entries)
    notebook = models.Notebook(
        title=generate_notebook_title(prefix, full_text),
        user_id=current_user.id,
    )
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    for entry in entries:
        entry.notebook_id = notebook.id
    db.commit()
    db.refresh(notebook)
    return notebook


def local_ai_required():
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "This AI capability runs only in Kairo Local. Start the local AI "
            "companion and use a local-mode frontend."
        ),
    )


# Compatibility responses for older clients. These routes never load AI in the
# cloud process and make the runtime boundary explicit.
app.add_api_route("/transcribe-audio", local_ai_required, methods=["POST"])
app.add_api_route("/journal-entries/voice", local_ai_required, methods=["POST"])
app.add_api_route("/chat", local_ai_required, methods=["POST"])
