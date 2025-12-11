# KAIRO: Project Master Plan & Technical Specification

**Version:** 1.0.0
**Status:** Feature Complete (Verification Phase)
**Developer:** Enmanuel De Los Santos Cruz

---

## 1. Project Vision
Kairo is a "voice-first" intelligent journaling application. It removes the friction of writing by allowing users to speak their thoughts. It then uses local AI models to transcribe, analyze, and organize those thoughts, turning a passive journal into an active reflective partner via a conversational interface.

---

## 2. Tech Stack

### Frontend (Client)
* **Framework:** React.js (Create React App)
* **Styling:** Custom CSS (Neo-Brutalism Design System)
* **Animation:** Anime.js
* **HTTP Client:** Axios
* **Audio Capture:** `react-media-recorder` (or native MediaRecorder API)
* **Routing:** React Router DOM (v6)

### Backend (Server)
* **Framework:** FastAPI (Python 3.9+)
* **Server:** Uvicorn (ASGI)
* **Database ORM:** SQLAlchemy
* **Migrations:** Alembic (Optional, currently using `create_all`)
* **Authentication:** OAuth2 with Password (Bearer JWT), `passlib` (Bcrypt), `python-jose`

### AI & Data Science (Local)
* **Speech-to-Text:** Hugging Face `transformers` + `openai/whisper-base`
* **Sentiment Analysis:** Hugging Face `transformers` + `distilbert-base-uncased-finetuned-sst-2-english`
* **Audio Processing:** `librosa` / `soundfile`
* **RAG / Search:** FAISS (for vector storage) + Sentence Transformers (Future Stretch)

### Infrastructure
* **Database:** PostgreSQL (Local `kairo_db`)
* **Environment:** Python `venv` (kairo-env)

---

## 3. Database Schema

### Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-inc | Unique User ID |
| `email` | String | Unique, Not Null | User login email |
| `hashed_password` | String | Not Null | Bcrypt hash of password |
| `created_at` | Timestamp | Default: Now | Account creation time |

### Table: `journal_entries`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-inc | Unique Entry ID |
| `user_id` | Integer | FK (`users.id`) | Owner of the entry |
| `text_content` | Text | Not Null | The transcribed text |
| `sentiment` | String | Nullable | "POSITIVE" or "NEGATIVE" |
| `audio_path` | String | Nullable | Path to saved .wav file (Future) |
| `created_at` | Timestamp | Default: Now | Entry creation time |

---

## 4. Feature Specifications & Roadmap

### Phase 1: Authentication (✅ COMPLETED)
- [x] **Backend:** `POST /users` (Register) - Hash password, save user.
- [x] **Backend:** `POST /login` (Login) - Verify hash, issue JWT access token.
- [x] **Backend:** `GET /users/me` - Dependency to validate token and retrieve user.
- [x] **Frontend:** Login Form (Neo-brutalist style).
- [x] **Frontend:** Registration Form.
- [x] **Frontend:** Token storage (localStorage or memory) and Axios interceptors.

### Phase 2: Core Journaling (Text) (✅ COMPLETED)
- [x] **Backend:** `POST /journal-entries` (Create) - Accept JSON text, save to DB.
- [x] **Backend:** `GET /journal-entries` (Read) - Return list for logged-in user.
- [x] **Backend:** `DELETE /journal-entries/{id}` (Delete) - Remove entry.
- [x] **Frontend:** Fetch and display entries on load (`useEffect`).
- [x] **Frontend:** "Create Entry" Textarea form.
- [x] **Frontend:** "Delete" button logic.

### Phase 3: AI Integration (Basic) (✅ COMPLETED)
- [x] **Backend:** Load `distilbert` model on startup.
- [x] **Backend:** Run sentiment analysis on text entry creation.
- [x] **Frontend:** Display sentiment tag (Color-coded: Green/Red).
- [x] **Frontend:** Add loading states/animations while AI is processing.

### Phase 4: Voice-to-Text (The Main Quest) (✅ COMPLETED)
- [x] **Frontend:** Implement Audio Recorder component.
    -   *Requirements:* Visualizer or "Recording" indicator, Stop button.
- [x] **Frontend:** Convert recorded blob to `File` object.
- [x] **Backend:** Create `POST /journal-entries/voice` endpoint.
    -   *Input:* `UploadFile` (multipart/form-data).
    -   *Process:* Save temp file -> Load with `librosa` -> Whisper Transcribe -> BERT Analyze -> DB Save.
- [x] **Frontend:** Handle the upload progress UI.

### Phase 5: Advanced AI Features (Stretch Goals) (✅ COMPLETED)
- [x] **Backend:** **Keyword Search**. Filter entries by text match.
- [x] **Backend:** **RAG Pipeline (Q&A)**.
    -   Step 1: Embed all journal entries into vectors (using `sentence-transformers`).
    -   Step 2: Store vectors in a local index (FAISS or simple array).
    -   Step 3: Create `POST /chat` endpoint.
    -   Step 4: Search vector index for relevant entries based on user question.
    -   Step 5: Generate answer (or just return relevant entries).
- [x] **Frontend:** Chat Interface / Q&A Box.

---

## 5. API Endpoints Reference

### Auth
* `POST /users` - Register a new user.
* `POST /login` - Get Access Token.

### Entries
* `GET /journal-entries` - Get all entries for current user.
* `POST /journal-entries` - Create text-only entry.
* `POST /journal-entries/voice` - Upload audio blob for transcription & creation.
* `DELETE /journal-entries/{id}` - Delete an entry.

### System
* `GET /` - Health check.
* `GET /prototype/run_transcription_test` - Hardware benchmark.

---

## 6. Design System (Neo-Brutalism)
* **Colors:**
    * Primary: `#FFD600` (Yellow)
    * Accent: `#00FF95` (Green - Positive/Action)
    * Danger: `#FF4747` (Red - Delete/Negative)
    * Base: `#FFFFFF` (White)
    * Text/Borders: `#000000` (Black)
* **Shadows:** Hard shadows only (`4px 4px 0px 0px #000`). No blur.
* **Typography:** Sans-serif, Bold headers, High contrast.
* **Borders:** Thick (`3px solid #000`).

---

## 7. Developer Notes
* **CORS:** Ensure `CORSMiddleware` in `main.py` includes `http://localhost:3000`.
* **Audio Format:** Whisper works best with 16kHz WAV files. Frontend should try to send WAV or WebM; Backend may need `ffmpeg` (via `librosa`) to convert if blob format is weird.
* **Environment:** Always activate `source kairo-env/bin/activate` before running backend.