import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import NeoButton from './NeoButton';

const VoiceRecorder = ({ onTranscriptionComplete, token }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const response = await fetch('http://127.0.0.1:8000/transcribe-audio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      console.log('Transcription:', data.text);
      
      // Call the callback with the transcribed text
      onTranscriptionComplete(data.text);
      
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="voice-recorder">
      {!isRecording && !isTranscribing && (
        <NeoButton 
          text="🎤 Record Voice Entry" 
          color="#FF6B9D" 
          onClick={startRecording}
        />
      )}
      
      {isRecording && (
        <div className="recording-indicator">
          <div className="pulse-dot"></div>
          <span>Recording...</span>
          <NeoButton 
            text="⏹ Stop" 
            color="#FF4747" 
            onClick={stopRecording}
          />
        </div>
      )}
      
      {isTranscribing && (
        <div className="transcribing-indicator">
          <div className="spinner"></div>
          <span>Transcribing...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

