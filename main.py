from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from transformers import pipeline
from  database import  engine, SessionLocal
import librosa
import time
import schemas
import utils
import auth

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

# --- AI Model Setup ---
# Load the AI pipeline when the server starts.
# This is a one-time cost and makes our API calls fast.
print("Loading Whisper AI model...")
start_load = time.time()

# Load the whisper-base model onto the MPS (Apple GPU)
transcriber = pipeline(
    'automatic-speech-recognition',
    model='openai/whisper-base',
    device='mps'
)

load_time = time.time() - start_load
print(f"--- Model loaded successfully in {load_time:.2f} seconds. ---")

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
    
    # 1. Create the new entry object
    # We get the text from the request (entry.text_content)
    # We get the user's ID from our "get_current_user" dependency (current_user.id)
    new_entry = models.JournalEntry(
        text_content=entry.text_content,
        user_id=current_user.id 
    )
    
    # 2. Add to database and commit
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry) # Get the new data back from the DB (like the ID)
    
    # 3. Return the new entry
    return new_entry

# --- NEW: USER REGISTRATION ENDPOINT ---
@app.post("/users", status_code=status.HTTP_201_CREATED, response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user in the database.
    """
    # 1. Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 2. Hash the user's password
    hashed_password = utils.hash_password(user.password)
    
    # 3. Create the new user object
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # 4. Add to database and commit
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Get the new data back from the DB (like the ID)
    
    # 5. Return the new user (using the UserResponse schema)
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