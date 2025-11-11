from fastapi import FastAPI
from transformers import pipeline
import librosa
import time

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

# --- API Server Setup ---
# Create an instance of the FastAPI class
app = FastAPI()

@app.get("/")
def read_root():
    """ Main welcome endpoint. """
    return {"message": "Welcome to the Kairo API Prototype"}

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