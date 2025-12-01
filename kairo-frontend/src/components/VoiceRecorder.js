import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import NeoButton from './NeoButton';
import api from '../api';

const VoiceRecorder = ({ onTranscriptionComplete, onSave, token }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = async (action = 'transcribe') => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop all tracks to release the microphone
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (action === 'transcribe') {
          await handleTranscribe(audioBlob);
        } else if (action === 'save') {
          await handleSave(audioBlob);
        }
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleTranscribe = async (audioBlob) => {
    try {
      const data = await api.transcribeAudio(token, audioBlob);
      console.log('Transcription:', data.text);
      onTranscriptionComplete(data.text);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (audioBlob) => {
    try {
      const newEntry = await api.createVoiceEntry(token, audioBlob);
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
          text="🎤 Record Voice"
          color="#FF6B9D"
          onClick={startRecording}
        />
      )}

      {isRecording && (
        <div className="recording-indicator">
          <div className="pulse-dot"></div>
          <span>Recording...</span>
          <div className="recording-controls">
            <NeoButton
              text="📝 Transcribe"
              color="#00FF95"
              onClick={() => stopRecording('transcribe')}
            />
            <NeoButton
              text="💾 Save Directly"
              color="#FFD600"
              onClick={() => stopRecording('save')}
            />
            <NeoButton
              text="❌ Cancel"
              color="#FF4747"
              onClick={() => {
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
          <span>Processing audio...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

