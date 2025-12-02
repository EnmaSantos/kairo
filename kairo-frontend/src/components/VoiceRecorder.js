import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import NeoButton from './NeoButton';
import api from '../api';

const VoiceRecorder = ({ onTranscriptionComplete, onSave, token, notebookId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [realTimeText, setRealTimeText] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const websocketRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRealTimeText('');

      // --- WebSocket Setup ---
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/transcribe');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text) {
          // The backend now returns the full transcription of the growing file
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

  const stopRecording = async (action = 'transcribe') => {
    if (mediaRecorderRef.current && isRecording) {
      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (action === 'transcribe') {
          // Use the real-time text we already got!
          // Or fall back to full transcription if needed (but let's trust the stream for now)
          console.log('Final Real-time Text:', realTimeText);
          onTranscriptionComplete(realTimeText);
        } else if (action === 'save') {
          await handleSave(audioBlob);
        }
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // setIsProcessing(true); // No need for processing spinner since we have text!
    }
  };

  const handleSave = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const newEntry = await api.createVoiceEntry(token, audioBlob, notebookId);
      console.log('Voice entry created:', newEntry);
      if (onSave) onSave(newEntry);
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
              onClick={() => {
                if (websocketRef.current) websocketRef.current.close();
                mediaRecorderRef.current.stop();
                setIsRecording(false);
              }}
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
};

export default VoiceRecorder;

