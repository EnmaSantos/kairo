from fastapi import FastAPI, Depends, HTTPException, status, Response, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from transformers import pipeline
from  database import  engine, SessionLocal
from typing import List, Optional
import librosa
import time
import schemas
import utils
import auth
import numpy as np
import io
import pydantic
from sentence_transformers import SentenceTransformer
import faiss
import warnings

# Suppress librosa/audioread warnings
warnings.filterwarnings("ignore", category=UserWarning, module="librosa")
warnings.filterwarnings("ignore", category=FutureWarning, module="librosa")

# --- NEW IMPORTS ---
# Import our new models file and the engine from database.py
import models
from database import engine
# ---------------------

# --- NEW: CREATE THE DATABASE TABLES ---
# This line tells SQLAlchemy to find all the classes that
# inherit from 'Base' (our User and JournalEntry models)
# and create them as tables in our database.
models.Base.metadata.create_all(bind=engine)
# -------------------------------------

# --- AI Models Setup ---
transcriber = pipeline(
    'automatic-speech-recognition',
    model='openai/whisper-base',
    device='mps'
)
print("--- Whisper model loaded successfully in 1.84 seconds. ---")

print("Loading Sentiment Analysis model...")
sentiment_analyzer = pipeline(
    'text-classification',
    model='j-hartmann/emotion-english-distilroberta-base',
)
print("--- Sentiment model loaded successfully. ---")

print("Loading Embedding model for RAG...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
# FAISS Index (will be initialized/populated on startup)
vector_index = None
# Mapping from FAISS index ID to Database Entry ID
index_id_to_entry_id = {}
print("--- Embedding model loaded. ---")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- NEW: "GET CURRENT USER" DEPENDENCY ---
def get_current_user(token: str = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    """
    Dependency that verifies a user's token and returns
    the user object from the database.
    """
    
    # This is the exception we'll raise if the token is bad
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify the token
    token_data = auth.verify_access_token(token, credentials_exception)
    
    # Get the user from the database using the ID in the token
    user = db.query(models.User).filter(models.User.id == token_data.id).first()
    
    if user is None:
        raise credentials_exception
        
    # Return the full user object
    return user

# --- API Server Setup ---
# Create an instance of the FastAPI class
app = FastAPI()

# --- NEW: ADD CORS MIDDLEWARE ---
# This must be right after app = FastAPI()

origins = [
    "http://localhost:3000",  # The address of your React app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
# --------------------------------

@app.get("/")
def read_root():
    """ Main welcome endpoint. """
    return {"message": "Welcome to the Kairo API Prototype"}

# --- NEW: LOGIN ENDPOINT ---
@app.post("/login", response_model=schemas.Token)
def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Handles user login and returns an access token.
    Note: We use OAuth2PasswordRequestForm. It makes the /docs
    page show a nice username/password form.
    It expects the data as "form-data" not JSON.
    """
    
    # 1. Find the user by email (username)
    # user_credentials.username is the "email"
    user = db.query(models.User).filter(models.User.email == user_credentials.username).first()
    
    # 2. Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials"
        )
        
    # 3. Check if password is correct
    if not utils.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials"
        )
        
    # 4. User is valid, create an access token
    # We store the user's ID in the token
    access_token = auth.create_access_token(data={"user_id": user.id})
    
    # 5. Return the token
    return {"access_token": access_token, "token_type": "bearer"}

# --- NEW: PROTECTED ENDPOINT ---
@app.get("/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    """
    A protected route that returns the information
    for the currently logged-in user.
    """
    # Because of the Depends(get_current_user), this code
    # will ONLY run if the user provides a valid token.
    # The 'current_user' variable is the user object
    # returned from our get_current_user function.
    return current_user

# --- NEW: CREATE JOURNAL ENTRY ENDPOINT ---
@app.post("/journal-entries", status_code=status.HTTP_201_CREATED, response_model=schemas.JournalEntryResponse)
def create_journal_entry(
    entry: schemas.JournalEntryCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Creates a new journal entry for the currently logged-in user.
    """
    
    # 1. Run sentiment analysis on the text
    # The new model returns a list of lists (because of top_k=1)
    # e.g. [{'label': 'joy', 'score': 0.99}]
    sentiment_result = sentiment_analyzer(entry.text_content)
    sentiment_label = sentiment_result[0]['label']  # Extract the label
    
    # 2. Create the new entry in the database
    # We get the text from the request (entry.text_content)
    # We get the user's ID from our "get_current_user" dependency (current_user.id)
    new_entry = models.JournalEntry(
        text_content=entry.text_content,
        user_id=current_user.id,
        sentiment=sentiment_label, # Add the sentiment!
        notebook_id=entry.notebook_id
    )
    
    # 3. Add to database and commit
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry) # Get the new data back from the DB (like the ID)
    
    # 4. Return the new entry (now with sentiment!)
    return new_entry

# --- NEW: GET ALL JOURNAL ENTRIES ENDPOINT ---
@app.get("/journal-entries", response_model=List[schemas.JournalEntryResponse])
def get_journal_entries(
    search: Optional[str] = None,
    sentiment: Optional[str] = None,
    notebook_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Gets all journal entries for the currently logged-in user.
    Optionally filters by a search query and/or sentiment.
    """
    
    # 1. Query the database
    query = db.query(models.JournalEntry).filter(models.JournalEntry.user_id == current_user.id)
    
    if search:
        # Case-insensitive search on text_content
        query = query.filter(models.JournalEntry.text_content.ilike(f"%{search}%"))
        
    if sentiment and sentiment.lower() != "all":
        # Filter by sentiment (exact match, case-insensitive)
        query = query.filter(models.JournalEntry.sentiment == sentiment.lower())

    if notebook_id is not None:
        query = query.filter(models.JournalEntry.notebook_id == notebook_id)
        
    entries = query.order_by(models.JournalEntry.created_at.desc()).all()
    
    # 2. Return the list of entries
    return entries

# --- NEW: DELETE A JOURNAL ENTRY ENDPOINT ---
@app.delete("/journal-entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_entry(
    entry_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Deletes a specific journal entry by its ID.
    """
    
    # 1. Find the entry we want to delete
    entry_query = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id
    )
    
    entry = entry_query.first()
    
    # 2. Check if the entry exists
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entry with id: {entry_id} not found"
        )
        
    # 3. Check if the logged-in user is the owner
    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )
        
    # 4. If both checks pass, delete the entry
    entry_query.delete(synchronize_session=False)
    db.commit()
    
    # 5. Return the 204 "No Content" response
    return Response(status_code=status.HTTP_204_NO_CONTENT)

import shutil
import tempfile
import os

# --- NEW: AUDIO TRANSCRIPTION ENDPOINT ---
@app.post("/transcribe-audio")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """
    Transcribes an audio file using the Whisper AI model.
    Returns the transcribed text.
    """
    try:
        # 1. Save to a temporary file
        # We use a suffix based on the filename or default to .webm
        suffix = os.path.splitext(audio.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(audio.file, tmp_file)
            tmp_path = tmp_file.name
        
        try:
            # 2. Load the audio using librosa from the file path
            # librosa can now use ffmpeg to handle webm/mp4 etc.
            audio_data, sampling_rate = librosa.load(tmp_path, sr=16000)
            
            # 3. Run the transcription
            print(f"Transcribing audio for user {current_user.email}...")
            result = transcriber(audio_data)
            
            print(f"Transcription complete: {result['text']}")
            
            # 4. Return the transcribed text
            return {
                "text": result['text'],
                "success": True
            }
        finally:
            # Cleanup the temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe audio: {str(e)}"
        )

# --- RAG Pipeline Logic ---

def refresh_vector_index(db: Session):
    """
    Refreshes the FAISS index with all journal entries from the database.
    """
    global vector_index, index_id_to_entry_id
    
    print("Refreshing RAG Vector Index...")
    entries = db.query(models.JournalEntry).all()
    
    if not entries:
        print("No entries found. Index is empty.")
        # Initialize empty index
        vector_index = faiss.IndexFlatL2(384) # 384 is dimension of all-MiniLM-L6-v2
        index_id_to_entry_id = {}
        return

    # Extract text content
    texts = [entry.text_content for entry in entries]
    ids = [entry.id for entry in entries]
    
    # Generate embeddings
    embeddings = embedding_model.encode(texts)
    
    # Initialize FAISS index
    dimension = embeddings.shape[1]
    vector_index = faiss.IndexFlatL2(dimension)
    
    # Add to index
    vector_index.add(np.array(embeddings).astype('float32'))
    
    # Update mapping
    index_id_to_entry_id = {i: entry_id for i, entry_id in enumerate(ids)}
    
    print(f"Index refreshed with {len(entries)} entries.")

@app.on_event("startup")
def startup_event():
    # Create a new session just for this startup task
    db = SessionLocal()
    try:
        refresh_vector_index(db)
    finally:
        db.close()

# --- NEW: CHAT ENDPOINT (RAG) ---
class ChatRequest(pydantic.BaseModel):
    question: str

@app.post("/chat")
def chat_with_journal(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Chat with your journal. Finds relevant entries and returns them as context.
    """
    global vector_index, index_id_to_entry_id
    
    if vector_index is None or vector_index.ntotal == 0:
        return {"answer": "I don't have enough journal entries to answer that yet.", "context": []}
    
    # 1. Embed the question
    question_embedding = embedding_model.encode([request.question])
    
    # 2. Analyze Question Sentiment
    q_sentiment_result = sentiment_analyzer(request.question)
    q_sentiment = q_sentiment_result[0]['label']
    print(f"Question Sentiment: {q_sentiment}")

    # 3. Search FAISS index (Get more candidates)
    k_candidates = 10 
    distances, indices = vector_index.search(np.array(question_embedding).astype('float32'), k_candidates)
    
    # 4. Retrieve and Filter Entries
    all_candidates = []
    
    for i, idx in enumerate(indices[0]):
        if idx != -1 and idx in index_id_to_entry_id:
            entry_id = index_id_to_entry_id[idx]
            entry = db.query(models.JournalEntry).filter(models.JournalEntry.id == entry_id).first()
            
            if entry and entry.user_id == current_user.id:
                candidate = {
                    "id": entry.id,
                    "text": entry.text_content,
                    "date": entry.created_at,
                    "sentiment": entry.sentiment,
                    "score": float(distances[0][i])
                }
                all_candidates.append(candidate)

    # Filter Logic
    final_results = []
    
    if q_sentiment != "neutral":
        # Prioritize entries with matching sentiment
        sentiment_matches = [c for c in all_candidates if c['sentiment'] == q_sentiment]
        if sentiment_matches:
            final_results = sentiment_matches[:3] # Top 3 matching sentiment
        else:
            final_results = all_candidates[:3] # Fallback to top 3 by distance
    else:
        final_results = all_candidates[:3] # Standard top 3

    # 5. Construct Answer
    if not final_results:
        return {"answer": "I couldn't find any relevant entries.", "context": []}
        
    return {
        "answer": f"Here are some entries related to your question (Sentiment: {q_sentiment}):",
        "context": final_results
    }

@app.post("/notebooks", status_code=status.HTTP_201_CREATED, response_model=schemas.NotebookResponse)
def create_notebook(notebook: schemas.NotebookCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_notebook = models.Notebook(title=notebook.title, user_id=current_user.id)
    db.add(new_notebook)
    db.commit()
    db.refresh(new_notebook)
    return new_notebook

@app.get("/notebooks", response_model=List[schemas.NotebookResponse])
def get_notebooks(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Notebook).filter(models.Notebook.user_id == current_user.id).all()

@app.delete("/notebooks/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notebook_query = db.query(models.Notebook).filter(models.Notebook.id == id, models.Notebook.user_id == current_user.id)
    if not notebook_query.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    notebook_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- NEW: VOICE JOURNAL ENTRY ENDPOINT ---
@app.post("/journal-entries/voice", status_code=status.HTTP_201_CREATED, response_model=schemas.JournalEntryResponse)
async def create_voice_journal_entry(
    audio: UploadFile = File(...),
    notebook_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Creates a new journal entry from an audio file.
    Transcribes the audio, analyzes sentiment, and saves to DB.
    """
    try:
        # 1. Save to a temporary file
        suffix = os.path.splitext(audio.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(audio.file, tmp_file)
            tmp_path = tmp_file.name

        try:
            # 2. Load and Transcribe
            audio_data, sampling_rate = librosa.load(tmp_path, sr=16000)
            
            print(f"Transcribing voice entry for user {current_user.email}...")
            transcription_result = transcriber(audio_data)
            text_content = transcription_result['text']
            print(f"Transcription: {text_content}")

            # 3. Analyze Sentiment
            sentiment_result = sentiment_analyzer(text_content)
            sentiment_label = sentiment_result[0]['label']
            
            # 4. Create Entry
            new_entry = models.JournalEntry(
                text_content=text_content,
                user_id=current_user.id,
                sentiment=sentiment_label,
                notebook_id=notebook_id
            )
            
            db.add(new_entry)
            db.commit()
            db.refresh(new_entry)
            
            return new_entry
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error processing voice entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: WEBSOCKET TRANSCRIPTION ENDPOINT ---
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")
    
    try:
        while True:
            # Receive audio chunk (bytes)
            data = await websocket.receive_bytes()
            
            # TODO: In a real production app, we would:
            # 1. Append this chunk to a rolling buffer
            # 2. Use a streaming-optimized model (like faster-whisper)
            # 3. Transcribe the buffer
            
            # For this MVP/Prototype with standard Whisper:
            # We will save the chunk to a temp file and transcribe it.
            # This works best if the frontend sends "sentences" or larger chunks (e.g. every 2-3s).
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
                tmp_file.write(data)
                tmp_path = tmp_file.name
            
            try:
                # Load and transcribe
                # Note: sr=16000 is standard for Whisper
                audio_data, _ = librosa.load(tmp_path, sr=16000)
                result = transcriber(audio_data)
                text = result['text']
                
                # Send back the text
                if text.strip():
                    await websocket.send_json({"text": text})
                    
            except Exception as e:
                print(f"Error transcribing chunk: {e}")
                await websocket.send_json({"error": str(e)})
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

# --- NEW: USER REGISTRATION ENDPOINT ---
@app.post("/users", status_code=status.HTTP_201_CREATED, response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user in the database.
    """
    # 1. Check if user already exists (email or username)
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # 2. Hash the user's password
    hashed_password = utils.hash_password(user.password)
    
    # 3. Generate Avatar (if not provided)
    # Using DiceBear 'avataaars' style
    profile_pic = f"https://api.dicebear.com/9.x/avataaars/svg?seed={user.username}"
    
    # 4. Create the new user object
    new_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        username=user.username,
        full_name=user.full_name,
        profile_picture_url=profile_pic
    )
    
    # 5. Add to database and commit
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Get the new data back from the DB (like the ID)
    
    # 6. Return the new user (using the UserResponse schema)
    return new_user 

@app.get("/prototype/run_transcription_test")
def run_transcription_test():
    """
    This is the main prototype endpoint.
    It loads a sample audio file and runs the Whisper AI model on it.
    """
    print("Prototype endpoint called! Loading sample audio...")
    
    # 1. Load sample audio file
    # We use librosa's built-in speech sample for this test
    sample_audio, sampling_rate = librosa.load(librosa.example('libri1'), sr=16000)
    audio_duration = librosa.get_duration(y=sample_audio, sr=sampling_rate)
    
    print(f"Audio loaded ({audio_duration:.2f}s). Running transcription...")
    
    # 2. Run the transcription
    start_inference = time.time()
    result = transcriber(sample_audio)
    inference_time = time.time() - start_inference
    
    print("Transcription complete.")
    
    # 3. Return the result as JSON
    return {
        "prototype_status": "Success",
        "model_used": "openai/whisper-base",
        "audio_duration_seconds": audio_duration,
        "transcription_time_seconds": inference_time,
        "transcription_result": result['text']
    }