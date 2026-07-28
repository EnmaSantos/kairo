"""Authenticated loopback API for Kairo's local-only AI capabilities."""

from __future__ import annotations

import os
from pathlib import Path
import secrets
import shutil
import tempfile
from typing import Any

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from local_ai_models import LocalModelRuntime


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)


class JournalContextEntry(BaseModel):
    id: int
    text: str = Field(min_length=1, max_length=100_000)
    date: str | None = None
    sentiment: str | None = None


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4_000)
    entries: list[JournalContextEntry] = Field(max_length=2_000)


runtime = LocalModelRuntime()
app = FastAPI(
    title="Kairo Local AI",
    description="Loopback-only transcription, emotion analysis, retrieval, and chat.",
    version="2.0.0",
)

default_origins = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
configured_origins = {
    origin.strip()
    for origin in os.getenv("KAIRO_LOCAL_CORS_ORIGINS", "").split(",")
    if origin.strip()
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(default_origins | configured_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Kairo-Local-Token"],
)


def require_local_token(
    supplied: str | None = Header(default=None, alias="X-Kairo-Local-Token"),
) -> None:
    expected = os.getenv("KAIRO_LOCAL_AI_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="KAIRO_LOCAL_AI_TOKEN is not configured.",
        )
    if not supplied or not secrets.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid local AI token.",
        )


def with_temp_audio(audio: UploadFile, callback):
    suffix = Path(audio.filename or "recording.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        shutil.copyfileobj(audio.file, temp_file)
        path = temp_file.name
    try:
        return callback(path)
    finally:
        Path(path).unlink(missing_ok=True)


@app.get("/health", dependencies=[Depends(require_local_token)])
def health():
    capabilities = runtime.capabilities()
    return {
        "status": "healthy" if capabilities["ready"] else "degraded",
        **capabilities,
    }


@app.get("/capabilities", dependencies=[Depends(require_local_token)])
def capabilities():
    return runtime.capabilities()


@app.post("/transcribe", dependencies=[Depends(require_local_token)])
def transcribe(audio: UploadFile = File(...)):
    return with_temp_audio(audio, runtime.transcribe)


@app.post("/analyze-text", dependencies=[Depends(require_local_token)])
def analyze_text(request: TextRequest):
    return runtime.analyze_text(request.text)


@app.post("/analyze-voice", dependencies=[Depends(require_local_token)])
def analyze_voice(audio: UploadFile = File(...)):
    return with_temp_audio(audio, runtime.analyze_voice)


@app.post("/process-voice", dependencies=[Depends(require_local_token)])
def process_voice(audio: UploadFile = File(...)):
    return with_temp_audio(audio, runtime.process_voice)


@app.post("/summarize", dependencies=[Depends(require_local_token)])
def summarize(request: TextRequest):
    return runtime.summarize(request.text)


@app.post("/chat", dependencies=[Depends(require_local_token)])
def chat(request: ChatRequest):
    entries: list[dict[str, Any]] = [
        entry.model_dump() for entry in request.entries
    ]
    return runtime.chat(request.question, entries)


@app.post("/release", dependencies=[Depends(require_local_token)])
def release():
    runtime.release()
    return {"released": True}
