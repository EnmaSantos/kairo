import { useEffect, useRef, useState } from 'react';
import './VoiceRecorder.css';
import api from '../api';
import type { JournalEntry, NotebookId } from '../types';
import { NeoButton } from './NeoButton';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onSave?: (entry: JournalEntry) => void;
  token: string;
  notebookId: NotebookId;
}

type RecordingAction = 'transcribe' | 'save';

const apiUrl = new URL(import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000');
const websocketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
const TRANSCRIPTION_SOCKET_URL = `${websocketProtocol}//${apiUrl.host}/ws/transcribe`;

export function VoiceRecorder({
  onTranscriptionComplete,
  onSave,
  token,
  notebookId,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [realTimeText, setRealTimeText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      websocketRef.current?.close();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRealTimeText('');

      // --- WebSocket Setup ---
      const ws = new WebSocket(TRANSCRIPTION_SOCKET_URL);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as { text?: unknown };
        if (typeof data.text === 'string') {
          setRealTimeText(data.text);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Send the FULL accumulated audio so far (ensures valid headers)
          if (ws.readyState === WebSocket.OPEN) {
            const fullBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            ws.send(fullBlob);
          }
        }
      };

      // Start recording with 2-second chunks for streaming
      mediaRecorder.start(2000);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = (action: RecordingAction = 'transcribe'): void => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && isRecording) {
      websocketRef.current?.close();
      websocketRef.current = null;

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        if (action === 'transcribe') {
          onTranscriptionComplete(realTimeText);
        } else if (action === 'save') {
          await handleSave(audioBlob);
        }
      };

      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = (): void => {
    websocketRef.current?.close();
    websocketRef.current = null;

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleSave = async (audioBlob: Blob): Promise<void> => {
    setIsProcessing(true);
    try {
      const newEntry = await api.createVoiceEntry(token, audioBlob, notebookId);
      console.log('Voice entry created:', newEntry);
      onSave?.(newEntry);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save voice entry.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-recorder">
      {!isRecording && !isProcessing && (
        <NeoButton
          text="🎤 Start Live Recording"
          color="#FF6B9D"
          onClick={startRecording}
        />
      )}

      {isRecording && (
        <div className="recording-indicator">
          <div className="pulse-dot"></div>
          <span>Recording...</span>

          {/* Real-time Text Display */}
          <div className="typewriter-container">
            <span className="typewriter-text">{realTimeText || "Listening..."}</span>
          </div>

          <div className="recording-controls">
            <NeoButton
              text="✅ Use Text"
              color="#00FF95"
              onClick={() => stopRecording('transcribe')}
            />
            <NeoButton
              text="💾 Save Audio"
              color="#FFD600"
              onClick={() => stopRecording('save')}
            />
            <NeoButton
              text="❌ Cancel"
              color="#FF4747"
              onClick={cancelRecording}
            />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="transcribing-indicator">
          <div className="spinner"></div>
          <span>Saving audio...</span>
        </div>
      )}
    </div>
  );
}
