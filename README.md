# Kairo

A voice-first AI journal that transcribes spoken reflections, detects emotional patterns, and lets you have conversations with your journal history.

[Watch Demo](#demo) · [How the AI works](#how-the-ai-works) · [Run locally](#run-locally)

<p align="center">
  <img src="docs/images/auth-page.png" alt="Kairo sign-in screen" width="900" />
</p>

**What Kairo does in one breath:**

- Record a reflection and get an automatic transcription (Whisper).
- Detect emotions and surface patterns across your entries.
- Ask natural-language questions about past entries (RAG + FAISS).

---

## Demo

> **Video coming next.** A clean 60–90 second screen recording is the best proof that voice + AI actually work. Until then, use the gallery below and run the app locally.

<!-- When ready, replace this block:
[![Watch the 90-second demo](docs/images/demo-thumbnail.png)](https://youtu.be/YOUR_VIDEO_ID)
or Loom: https://www.loom.com/share/YOUR_ID
-->

**Suggested demo script (60–90s):**

1. One-line intro: *“Kairo is a voice-first AI journal.”*
2. Record a short spoken entry.
3. Show transcription + emotion label.
4. Ask a chat question about past entries.
5. Show retrieved context from earlier journals.
6. Close on dashboard or auto-generated notebooks.

**For your resume while not deployed:** `Kairo — GitHub | Video Demo` (not “Live Demo”).

---

## What Kairo does

Kairo is built for quick capture and long-term reflection:

| You do this | Kairo does this |
| --- | --- |
| Speak a thought | Transcribes audio with Distil-Whisper |
| Save an entry | Classifies emotion (joy, sadness, anger, fear, …) |
| Ask “When was I stressed about work?” | Retrieves similar past entries via embeddings + FAISS |
| Want structure | Groups entries into notebooks (manual or auto-generated) |
| Browse memory | Dashboard, timeline, calendar, map, and photo views |

Also supported: image uploads, location on entries, Google or email login, and text + sentiment search.

---

## Product story (screenshots)

The story recruiters should see without running anything:

> **Record → transcribe → feel the emotion → search patterns or chat with past entries.**

| Step | Screen | Status |
| --- | --- | --- |
| 1. Start | Sign-in | ✅ `docs/images/auth-page.png` |
| 2. Home | Dashboard | ⏳ add `docs/images/dashboard.png` |
| 3. Capture | Voice recorder | ⏳ add `docs/images/voice-recording.png` |
| 4. Result | Entry + emotion tag | ⏳ add `docs/images/entry-with-emotion.png` |
| 5. History | Journal list / filters | ⏳ add `docs/images/entry-history.png` |
| 6. Chat | RAG chat answer + context | ⏳ add `docs/images/chat-rag.png` |
| 7. Organize | Notebook library / auto-notebooks | ⏳ add `docs/images/notebooks.png` |

### Gallery

#### Sign-in

![Kairo sign-in](docs/images/auth-page.png)

#### Dashboard

<!-- ![Dashboard](docs/images/dashboard.png) -->
*Placeholder — capture the main dashboard after login (greeting, stats, recent entries).*

#### Voice recording

<!-- ![Voice recording](docs/images/voice-recording.png) -->
*Placeholder — show the recorder mid-capture or the “recording…” state.*

#### Transcription + emotion

<!-- ![Entry with emotion](docs/images/entry-with-emotion.png) -->
*Placeholder — a saved entry with transcribed text and the emotion badge.*

#### Entry history

<!-- ![History](docs/images/entry-history.png) -->
*Placeholder — journal list with search / sentiment filters.*

#### Chat with your journal (RAG)

<!-- ![Chat](docs/images/chat-rag.png) -->
*Placeholder — a natural-language question and retrieved past entries as context.*

#### Notebooks

<!-- ![Notebooks](docs/images/notebooks.png) -->
*Placeholder — library of notebooks, including auto-generated ones.*

> **Tip:** Drop 4–6 PNGs into `docs/images/` with the names above. No need for every corner of the UI — just the story arc.

---

## How the AI works

Kairo is not “chat over a database dump.” Each reflection goes through a real local ML pipeline:

```text
Voice recording
      ↓
Audio preprocessing (librosa / FFmpeg → 16 kHz)
      ↓
Whisper transcription   (distil-whisper/distil-medium.en)
      ↓
Emotion classification  (j-hartmann/emotion-english-distilroberta-base)
      ↓
Text embeddings         (sentence-transformers all-MiniLM-L6-v2)
      ↓
FAISS semantic index    (IndexFlatL2, updated on each new entry)
      ↓
Context-aware chat      (top-k retrieval + optional emotion-aware ranking)
```

### Why this pipeline matters

| Stage | Model / tool | Role |
| --- | --- | --- |
| Speech → text | Distil-Whisper medium EN | Fast English ASR; Apple Silicon MPS-friendly |
| Emotion | DistilRoBERTa emotion | Labels entries for filters and pattern views |
| Embeddings | MiniLM-L6 | 384-dim vectors for semantic similarity |
| Retrieval | FAISS | Fast nearest-neighbor search over journal history |
| Chat | Custom RAG endpoint | Question embedding → top candidates → emotion-aware re-rank → context for the answer |

Auto-generated notebooks can also group entries by day / week / month / custom range from the library UI.

---

## Technical decisions & challenges

A few choices that shaped the project:

- **Voice-first, not text-first.** The primary path is record → transcribe → save, so friction stays low when you only have a moment to speak.
- **Emotion as a first-class field.** Sentiment is stored on every entry, used in filters, and can bias chat retrieval when the question itself has a non-neutral tone.
- **Local RAG with FAISS.** Journal history is embedded and indexed so “questions about me” are grounded in *your* past writing, not a generic LLM hallucination over empty context.
- **SQLite by default.** One-command local demo without standing up Postgres; `DATABASE_URL` still allows PostgreSQL when you need it.
- **Editorial React UI.** Dashboard, timeline, calendar, map, and photos treat memory as something you *browse*, not only a search box.

**Honest limits (good for interviews):** models load on backend startup (cold start cost); summarization falls back to title heuristics if the summarizer is unavailable; chat returns retrieved context rather than a fully generative essay; the app is designed to run locally (not deployed as a public live demo yet).

---

## Tech stack

### Backend

- **FastAPI** + **SQLAlchemy**
- **SQLite** locally · PostgreSQL-compatible via `DATABASE_URL`
- **Hugging Face Transformers** — Whisper ASR, emotion classification
- **Sentence Transformers** + **FAISS** — embeddings and retrieval
- **librosa** / **FFmpeg** — audio decode and resampling
- JWT auth, optional **Google OAuth**

### Frontend

- **React**
- **Axios**
- **Anime.js**
- **Leaflet** / React Leaflet
- **React Calendar**

---

## Run locally

### Requirements

- Python 3.9+
- Node.js 18+ and npm
- FFmpeg (for audio)
- Optional: PostgreSQL if you prefer it over SQLite

### 1. Backend dependencies

```bash
python3 -m venv kairo-env
source kairo-env/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Environment variables

Project root `.env` (see also `.env.example`):

```env
DATABASE_URL=sqlite:///./kairo.db
SECRET_KEY=dev-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GOOGLE_CLIENT_ID=placeholder-client-id
```

Frontend `kairo-frontend/.env` (see `.env.example`):

```env
REACT_APP_GOOGLE_CLIENT_ID=placeholder-client-id
```

### 3. Seed demo data

```bash
source kairo-env/bin/activate
rm -f kairo.db
python seed_data.py
```

Demo login:

| Field | Value |
| --- | --- |
| Email | `jack.tucker@example.com` |
| Password | `password123` |

### 4. Frontend dependencies

```bash
cd kairo-frontend
npm ci
```

### 5. Start the app

**API** (project root):

```bash
source kairo-env/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

**UI** (`kairo-frontend`):

```bash
npm start
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://127.0.0.1:8000](http://127.0.0.1:8000)

> First backend boot downloads and loads ML models (Whisper, emotion, embeddings). That can take a bit; later starts are faster if models are cached.

---

## Project structure

| Path | Role |
| --- | --- |
| `main.py` | FastAPI app, transcription, emotion, RAG chat, notebooks |
| `models.py` | SQLAlchemy models |
| `schemas.py` | Pydantic request/response schemas |
| `auth.py` | JWT helpers |
| `utils.py` | Password hashing |
| `seed_data.py` | Demo user + sample entries |
| `kairo-frontend/` | React UI |
| `docs/images/` | README screenshots |

---

## Limitations & next steps

**Today**

- Runs well as a local full-stack demo (not a public hosted product).
- Chat is retrieval-first (context from past entries), not a full free-form LLM essay generator.
- Screenshot gallery is incomplete; only sign-in is committed so far.

**Next (high leverage for recruiters)**

1. Add the 4–6 product screenshots listed above (`docs/images/`).
2. Record and link a **60–90s** unlisted YouTube or Loom demo (voice path is the proof).
3. Optional: thin public deploy or Docker compose for “clone and try.”
4. Optional: short API reference for the main endpoints (`/transcribe-audio`, `/journal-entries`, `/chat`, notebooks).

---

Built as a voice-first journaling system with real ML in the loop — not just a CRUD app with a microphone button.
