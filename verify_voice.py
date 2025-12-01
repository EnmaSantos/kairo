import requests
import librosa
import soundfile as sf
import numpy as np

# 1. Create a dummy audio file
print("Generating dummy audio file...")
sr = 16000
duration = 3 # seconds
t = np.linspace(0, duration, int(sr * duration))
y = 0.5 * np.sin(2 * np.pi * 440 * t) # 440Hz sine wave
sf.write('test_audio.wav', y, sr)

# 2. Login to get token
print("Logging in...")
login_data = {
    'username': 'test@example.com',
    'password': 'password123'
}
# Register user first just in case
try:
    requests.post('http://127.0.0.1:8000/users', json={'email': 'test@example.com', 'password': 'password123'})
except:
    pass

response = requests.post('http://127.0.0.1:8000/login', data=login_data)
if response.status_code != 200:
    print(f"Login failed: {response.text}")
    exit(1)

token = response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 3. Upload audio to voice endpoint
print("Uploading audio to /journal-entries/voice...")
files = {'audio': open('test_audio.wav', 'rb')}
response = requests.post('http://127.0.0.1:8000/journal-entries/voice', headers=headers, files=files)

if response.status_code == 201:
    data = response.json()
    print("SUCCESS! Voice entry created.")
    print(f"ID: {data['id']}")
    print(f"Text: {data['text_content']}")
    print(f"Sentiment: {data['sentiment']}")
else:
    print(f"FAILED. Status: {response.status_code}")
    print(response.text)
