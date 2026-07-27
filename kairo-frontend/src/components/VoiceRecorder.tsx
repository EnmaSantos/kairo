import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileAudio, Mic, Square, Trash2 } from 'lucide-react';
import './VoiceRecorder.css';
import api from '../api';
import type { JournalEntry, NotebookId } from '../types';
import { Button } from './Button';

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
  const [error, setError] = useState('');
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
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRealTimeText('');

      const websocket = new WebSocket(TRANSCRIPTION_SOCKET_URL);
      websocketRef.current = websocket;

      websocket.onmessage = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as { text?: unknown };
        if (typeof data.text === 'string') setRealTimeText(data.text);
      };

      websocket.onerror = (socketError) => {
        console.error('Transcription connection error:', socketError);
        setError('Live transcription is reconnecting. Your audio is still being recorded.');
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        audioChunksRef.current.push(event.data);

        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        }
      };

      mediaRecorder.start(2000);
      setIsRecording(true);
    } catch (recordingError) {
      console.error('Error starting recording:', recordingError);
      setError('Kairo could not access your microphone. Allow microphone access and try again.');
    }
  };

  const stopRecording = (action: RecordingAction): void => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || !isRecording) return;

    websocketRef.current?.close();
    websocketRef.current = null;

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      if (action === 'transcribe') {
        if (realTimeText.trim()) onTranscriptionComplete(realTimeText.trim());
        else setError('No transcription was captured. You can try again or save the audio directly.');
      } else {
        await handleSave(audioBlob);
      }
    };

    mediaRecorder.stop();
    setIsRecording(false);
  };

  const cancelRecording = (): void => {
    websocketRef.current?.close();
    websocketRef.current = null;

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }

    audioChunksRef.current = [];
    setRealTimeText('');
    setIsRecording(false);
  };

  const handleSave = async (audioBlob: Blob): Promise<void> => {
    setIsProcessing(true);
    setError('');
    try {
      const newEntry = await api.createVoiceEntry(token, audioBlob, notebookId);
      onSave?.(newEntry);
    } catch (saveError) {
      console.error('Voice entry save error:', saveError);
      setError('The recording could not be saved. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-recorder">
      {!isRecording && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Mic aria-hidden="true" />}
          isLoading={isProcessing}
          onClick={() => void startRecording()}
        >
          {isProcessing ? 'Saving recording' : 'Record a thought'}
        </Button>
      )}

      {isRecording && (
        <div className="recording-panel" role="status" aria-live="polite">
          <div className="recording-status">
            <span className="pulse-dot" aria-hidden="true" />
            <span>Recording in progress</span>
          </div>

          <div className="transcription-preview">
            {realTimeText || 'Listening… your words will appear here.'}
          </div>

          <div className="recording-controls">
            <Button
              size="sm"
              variant="primary"
              icon={<Square aria-hidden="true" />}
              onClick={() => stopRecording('transcribe')}
            >
              Use transcription
            </Button>
            <Button
              size="sm"
              icon={<FileAudio aria-hidden="true" />}
              onClick={() => stopRecording('save')}
            >
              Save audio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 aria-hidden="true" />}
              onClick={cancelRecording}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="voice-error" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
