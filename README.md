# Kairo

Kairo is a voice-first journaling app for capturing thoughts, organizing entries into notebooks, and exploring patterns across time. The backend is built with FastAPI and SQLAlchemy, and the frontend is a React app with a focused, editorial-style interface.

## What It Does

Kairo combines quick capture, emotional context, and long-form reflection:

- Record or type journal entries.
- Upload images and attach location data to entries.
- Search and filter entries by text or sentiment.
- Group entries into notebooks, including auto-generated notebooks.
- Explore entries through dashboard, timeline, calendar, map, and photo views.
- Ask questions about your journal history through the chat experience.

## Highlights

- Voice-first entry flow with audio transcription support.
- Sentiment tagging for journal entries.
- Notebook organization for daily and thematic reflection.
- Map and photo views for visual memory browsing.
- Google auth and email/password login support.
- Local-friendly development setup with SQLite by default.

## Screenshots

The app capture set lives in [docs/images](docs/images).

### Auth

![Kairo sign-in screen](docs/images/auth-page.png)

Planned captures for the same folder: dashboard, journal composer, notebook library, and the timeline/calendar/map views.

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- SQLite for local development, PostgreSQL-compatible via `DATABASE_URL`
- Hugging Face pipelines for transcription, sentiment, and summarization
- Sentence Transformers and FAISS for retrieval features

### Frontend

- React
- Axios
- Anime.js
- Leaflet and React Leaflet
- React Calendar

## Requirements

- Python 3.9 or newer
- Node.js 18+ and npm
- FFmpeg for audio processing
- Optional: PostgreSQL if you want to run against a managed database instead of SQLite

## Local Setup

### 1. Install backend dependencies

From the project root:

```bash
python3 -m venv kairo-env
source kairo-env/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Create local environment variables

Create a `.env` file in the project root with:

```env
DATABASE_URL=sqlite:///./kairo.db
SECRET_KEY=dev-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GOOGLE_CLIENT_ID=placeholder-client-id
```

For the frontend, create `kairo-frontend/.env` with:

```env
REACT_APP_GOOGLE_CLIENT_ID=placeholder-client-id
```

### 3. Seed demo data

The repository includes a seed script that creates a demo user and sample journal entries:

```bash
source kairo-env/bin/activate
rm -f kairo.db
python seed_data.py
```

Demo login:

- Email: `jack.tucker@example.com`
- Password: `password123`

### 4. Install frontend dependencies

```bash
cd kairo-frontend
npm ci
```

## Run the App

### Backend

From the project root:

```bash
source kairo-env/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

From `kairo-frontend`:

```bash
npm start
```

The frontend runs at `http://localhost:3000` and the API runs at `http://127.0.0.1:8000`.

## Project Structure

- `main.py`: FastAPI application entry point.
- `models.py`: Database models.
- `schemas.py`: Pydantic request and response schemas.
- `auth.py`: JWT helpers and auth configuration.
- `utils.py`: Password hashing utilities.
- `seed_data.py`: Demo database seed script.
- `kairo-frontend/`: React frontend.

## Notes

- The local setup now defaults to SQLite so the project can run without a PostgreSQL server.
- The backend uses `python-jose`, `bcrypt`, and `email-validator`, which are included in `requirements.txt`.
- Example env files are included at `.env.example` and `kairo-frontend/.env.example`.
- If you switch back to PostgreSQL, update `DATABASE_URL` and rerun the seed script or migrations.

## Next Improvements

- Add the remaining dashboard, journal, and library screenshots to `docs/images`.
- Add a short API reference section for the most-used endpoints.