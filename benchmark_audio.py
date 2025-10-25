from transformers import pipeline
import time
import librosa

# Load a sample audio file
print("Loading sample audio...")
# Use librosa's example audio file (speech sample)
# You can also use your own audio file: librosa.load('path/to/your/audio.wav', sr=16000)
sample_audio, sampling_rate = librosa.load(librosa.example('libri1'), sr=16000)
print(f"Audio loaded. Shape: {sample_audio.shape}, Sampling rate: {sampling_rate}")

model_to_test = "openai/whisper-base" # A good medium-sized speech model (~290MB)

print(f"\n--- Testing Model: {model_to_test} ---")
print("Loading pipeline...")
start_time = time.time()

# Important: specify device='mps' to ensure it uses your GPU
transcriber = pipeline('automatic-speech-recognition', model=model_to_test, device='mps')

load_time = time.time() - start_time
print(f"Model loaded in {load_time:.2f} seconds.")

print("\nTranscribing sample audio...")
start_time = time.time()
result = transcriber(sample_audio)
inference_time = time.time() - start_time

print(f"\nTranscription: '{result['text']}'")
print(f"--> Transcription took {inference_time:.4f} seconds.\n")