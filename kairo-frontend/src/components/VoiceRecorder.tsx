import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileAudio, Mic, Square, Trash2 } from 'lucide-react';
import './VoiceRecorder.css';
import api from '../api';
import localAI from '../localAI';
import type { AIStatus, JournalEntry, NotebookId } from '../types';
import { Button } from './Button';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onSave?: (entry: JournalEntry) => void;
  token: string;
  notebookId: NotebookId;
  aiStatus: AIStatus;
}

type RecordingAction = 'transcribe' | 'save';

export function VoiceRecorder({
  onTranscriptionComplete,
  onSave,
  token,
  notebookId,
  aiStatus,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async (): Promise<void> => {
    setError('');
    if (!aiStatus.available) {
      setError(aiStatus.message);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (recordingError) {
      console.error('Error starting recording:', recordingError);
      setError('Kairo could not access your microphone. Allow microphone access and try again.');
    }
  };

  const transcribeRecording = async (audioBlob: Blob): Promise<void> => {
    setIsProcessing(true);
    setError('');
    try {
      const transcription = await localAI.transcribeAudio(audioBlob);
      if (!transcription.text.trim()) {
        setError('No speech was detected. Try recording again.');
        return;
      }
      onTranscriptionComplete(transcription.text.trim());
    } catch (transcriptionError) {
      console.error('Local transcription failed:', transcriptionError);
      setError('Local transcription failed. Make sure the Kairo Local companion is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveVoiceEntry = async (audioBlob: Blob): Promise<void> => {
    setIsProcessing(true);
    setError('');
    try {
      // Raw audio is sent only to the loopback service. The cloud API receives
      // the transcript and derived metadata, never the recording itself.
      const processed = await localAI.processVoice(audioBlob);
      const newEntry = await api.createEntry(token, {
        textContent: processed.text,
        notebookId,
        sentiment: processed.text_emotion.sentiment,
        emotion_label: processed.text_emotion.primary_emotion,
        emotion_scores: processed.text_emotion.scores,
        voice_emotion: processed.voice_emotion.primary_emotion,
        voice_emotion_scores: processed.voice_emotion.scores,
        ai_model_versions: processed.models,
        ai_processed_at: processed.processed_at,
        source_type: 'voice',
      });
      onSave?.(newEntry);
    } catch (saveError) {
      console.error('Voice entry save error:', saveError);
      setError(
        'The recording could not be processed locally. Your cloud journal was not changed.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = (action: RecordingAction): void => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || !isRecording) return;

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      if (action === 'transcribe') void transcribeRecording(audioBlob);
      else void saveVoiceEntry(audioBlob);
    };

    mediaRecorder.stop();
    setIsRecording(false);
  };

  const cancelRecording = (): void => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
  };

  return (
    <div className="voice-recorder">
      {!isRecording && (
        <div className="voice-launch-row">
          <Button
            size="sm"
            variant="secondary"
            icon={<Mic aria-hidden="true" />}
            isLoading={isProcessing || aiStatus.checking}
            disabled={!aiStatus.available || isProcessing || aiStatus.checking}
            onClick={() => void startRecording()}
          >
            {isProcessing
              ? 'Processing locally'
              : aiStatus.checking
                ? 'Checking local AI'
                : 'Record a thought'}
          </Button>
          {!aiStatus.available && !aiStatus.checking && (
            <span className="voice-local-note">{aiStatus.message}</span>
          )}
        </div>
      )}

      {isRecording && (
        <div className="recording-panel" role="status" aria-live="polite">
          <div className="recording-status">
            <span className="pulse-dot" aria-hidden="true" />
            <span>Recording locally</span>
          </div>

          <div className="transcription-preview">
            Your recording stays on this device. Transcription begins when you stop.
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
              Save as entry
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
