import requests
import time
import uuid
import numpy as np
import soundfile as sf
import websocket
import json
import threading

# Configuration
BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/transcribe"
TEST_EMAIL = f"test_srs_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "password123"

def print_result(req_id, description, passed):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {req_id}: {description}")

def create_dummy_audio(filename="srs_test.wav"):
    sr = 16000
    duration = 2
    t = np.linspace(0, duration, int(sr * duration))
    y = 0.5 * np.sin(2 * np.pi * 440 * t)
    sf.write(filename, y, sr)
    return filename

def test_srs():
    print(f"--- Starting SRS Verification for {TEST_EMAIL} ---\n")
    
    # --- REQ-M1: User Registration ---
    try:
        resp = requests.post(f"{BASE_URL}/users", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "username": TEST_EMAIL.split('@')[0],
            "full_name": "SRS Test User"
        })
        print_result("REQ-M1", "User Authentication (Register)", resp.status_code == 201)
    except Exception as e:
        print_result("REQ-M1", f"User Authentication (Register) - Error: {e}", False)

    # --- REQ-M2: User Login ---
    token = None
    try:
        resp = requests.post(f"{BASE_URL}/login", data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print_result("REQ-M2", "User Authentication (Login)", True)
        else:
            print_result("REQ-M2", f"User Authentication (Login) - Status {resp.status_code}", False)
    except Exception as e:
        print_result("REQ-M2", f"User Authentication (Login) - Error: {e}", False)

    if not token:
        print("Cannot proceed without token.")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # --- REQ-M3 & REQ-M4 & REQ-S1: Voice Entry & Processing & Sentiment ---
    entry_id = None
    try:
        audio_file = create_dummy_audio()
        with open(audio_file, 'rb') as f:
            files = {'audio': (audio_file, f, 'audio/wav')}
            resp = requests.post(f"{BASE_URL}/journal-entries/voice", headers=headers, files=files)
        
        if resp.status_code == 201:
            data = resp.json()
            entry_id = data['id']
            has_text = bool(data.get('text_content'))
            has_sentiment = bool(data.get('sentiment'))
            
            print_result("REQ-M3", "Voice Entry Creation (Upload)", True)
            print_result("REQ-M4", "Entry Processing (Transcribe & Save)", has_text)
            print_result("REQ-S1", "Sentiment Analysis (Tagging)", has_sentiment)
        else:
            print_result("REQ-M3", f"Voice Entry Creation - Status {resp.status_code}", False)
            print_result("REQ-M4", "Entry Processing", False)
            print_result("REQ-S1", "Sentiment Analysis", False)

    except Exception as e:
        print_result("REQ-M3", f"Voice Entry Creation - Error: {e}", False)

    # --- REQ-M5 & REQ-S2: View All & Search ---
    try:
        # View All
        resp = requests.get(f"{BASE_URL}/journal-entries", headers=headers)
        entries = resp.json()
        print_result("REQ-M5", "View All Entries", len(entries) > 0)

        # Search (using a word likely to be in the transcription or just empty search to test endpoint)
        # Since we used a sine wave, transcription might be garbage or empty. 
        # Let's create a text entry to be sure we can search.
        requests.post(f"{BASE_URL}/journal-entries", headers=headers, json={"text_content": "Kairo SRS Test Entry", "notebook_id": None})
        
        resp = requests.get(f"{BASE_URL}/journal-entries?search=Kairo", headers=headers)
        search_results = resp.json()
        found = any("Kairo" in e['text_content'] for e in search_results)
        print_result("REQ-S2", "Keyword Search", found)

    except Exception as e:
        print_result("REQ-M5", f"View All Entries - Error: {e}", False)

    # --- REQ-S3: Conversational Q&A ---
    try:
        # Wait a bit for indexing if it's async (it's sync in main.py but good practice)
        resp = requests.post(f"{BASE_URL}/chat", headers=headers, json={"question": "What is this test?"})
        data = resp.json()
        has_answer = "answer" in data
        print_result("REQ-S3", "Conversational Q&A (RAG)", has_answer)
    except Exception as e:
        print_result("REQ-S3", f"Conversational Q&A - Error: {e}", False)

    # --- REQ-S4: Real-time Interaction (WebSocket) ---
    try:
        def on_message(ws, message):
            print_result("REQ-S4", "Real-time Interaction (WebSocket)", True)
            ws.close()

        def on_error(ws, error):
            print_result("REQ-S4", f"Real-time Interaction - Error: {error}", False)

        def on_open(ws):
            # Send a small dummy chunk
            ws.send(b'\x00' * 100, opcode=websocket.ABNF.OPCODE_BINARY)

        # Run WS in a thread so it doesn't block if it hangs
        ws = websocket.WebSocketApp(WS_URL,
                                    on_open=on_open,
                                    on_message=on_message,
                                    on_error=on_error)
        
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        time.sleep(2) # Wait for connection and message
        if wst.is_alive():
             # If still alive after 2s, it might have timed out or not received message. 
             # But on_message closes it. So if alive, maybe no message.
             # We'll assume pass if on_message printed.
             pass

    except Exception as e:
        print_result("REQ-S4", f"Real-time Interaction - Error: {e}", False)

    # --- REQ-M6: Entry Deletion ---
    if entry_id:
        try:
            resp = requests.delete(f"{BASE_URL}/journal-entries/{entry_id}", headers=headers)
            print_result("REQ-M6", "Entry Deletion", resp.status_code == 204)
            
            # Verify it's gone
            resp = requests.get(f"{BASE_URL}/journal-entries", headers=headers)
            ids = [e['id'] for e in resp.json()]
            if entry_id not in ids:
                pass # Confirmed
            else:
                print("   (Entry still present in list after delete!)")
        except Exception as e:
            print_result("REQ-M6", f"Entry Deletion - Error: {e}", False)

if __name__ == "__main__":
    test_srs()
