# Kairo (Καιρός)

Kairo is a full-stack, voice-first web application designed to be an intelligent journal and reflective assistant. It uses a sophisticated AI pipeline to transcribe spoken entries, analyze them for sentiment, and enable natural language conversations with your journal to discover patterns in your thoughts.

## Features

- **Voice-First Journaling**: Record your thoughts naturally; Kairo transcribes them instantly using the Whisper model.
- **Sentiment Analysis**: Automatically analyzes the emotional tone of your entries using BERT.
- **Intelligent Q&A (RAG)**: Chat with your journal! Ask questions like "How have I been feeling about my project?" and get answers based on your past entries.
- **Auto-Notebooks**: Automatically groups entries into daily, weekly, or monthly notebooks with AI-generated titles.
- **Secure Authentication**: User sign-up/login with JWT and Google OAuth support.
- **Rich Text Search**: Search through your journal entries by keyword or sentiment.

## Tech Stack

### Backend
- **Framework**: Python 3.9+, FastAPI
- **Server**: Uvicorn
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/ML**:
  - `distil-whisper/distil-medium.en` (Speech-to-Text)
  - `j-hartmann/emotion-english-distilroberta-base` (Sentiment Analysis)
  - `all-MiniLM-L6-v2` (Embeddings for RAG)
  - `faiss` (Vector Database for semantic search)
  - `distilbart-cnn-12-6` (Summarization)

### Frontend
- **Framework**: React.js
- **Styling**: Vanilla CSS / Custom Components
- **HTTP Client**: Axios

## Prerequisites

- Python 3.9 or higher
- Node.js and npm
- PostgreSQL installed and running
- FFmpeg (required for audio processing with `librosa` and `whisper`)

## Installation

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd kairo
\`\`\`

### 2. Backend Setup

It is recommended to use a virtual environment.

\`\`\`bash
# Create virtual environment
python3 -m venv kairo-env

# Activate virtual environment
source kairo-env/bin/activate  # On macOS/Linux
# kairo-env\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt
\`\`\`

**Environment Variables:**
Create a \`.env\` file in the root directory:

\`\`\`env
# Database URL (Update with your credentials)
DATABASE_URL=postgresql://user:password@localhost/kairo_db

# Security (Generate a strong key)
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Auth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
\`\`\`

### 3. Frontend Setup

\`\`\`bash
cd kairo-frontend
npm install
\`\`\`

## Running the Application

### Start the Backend Server

From the root directory (with virtual env activated):

\`\`\`bash
uvicorn main:app --reload
\`\`\`

The API will run at \`http://127.0.0.1:8000\`.
Swagger UI documentation is available at \`http://127.0.0.1:8000/docs\`.

### Start the Frontend Client

From the \`kairo-frontend\` directory:

\`\`\`bash
npm start
\`\`\`

The app will launch in your browser at \`http://localhost:3000\`.

## Usage

1.  **Sign Up/Login**: Create an account or log in.
2.  **Record**: Click the microphone icon to start recording a journal entry. Speak your thoughts.
3.  **Review**: See your transcribed entry appear with a sentiment tag (e.g., Joy, Sadness, Neutral).
4.  **Chat**: Use the Chat interface to ask questions about your journal history.
5.  **Organize**: Use the Auto-Generate Notebooks feature to organize scattered entries into summary notebooks.
