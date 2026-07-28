import axios from 'axios';

import type {
  ChatResponse,
  JournalEntry,
  LocalAICapabilities,
  TextEmotionAnalysis,
  TranscriptionResponse,
  VoiceProcessingResponse,
} from './types';

const AI_MODE = import.meta.env.VITE_AI_MODE ?? 'disabled';
const LOCAL_AI_URL = (
  import.meta.env.VITE_LOCAL_AI_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '');
const LOCAL_AI_TOKEN = import.meta.env.VITE_LOCAL_AI_TOKEN ?? '';

const localHeaders = () => ({
  'X-Kairo-Local-Token': LOCAL_AI_TOKEN,
});

const audioForm = (audioBlob: Blob): FormData => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  return formData;
};

export const localAI = {
  isEnabled: AI_MODE === 'local',

  getCapabilities: async (): Promise<LocalAICapabilities> => {
    if (AI_MODE !== 'local') {
      throw new Error('Local AI is disabled in this build.');
    }
    if (!LOCAL_AI_TOKEN) {
      throw new Error('The local AI token is missing.');
    }
    const response = await axios.get<LocalAICapabilities>(
      `${LOCAL_AI_URL}/capabilities`,
      {
        headers: localHeaders(),
        timeout: 3500,
      },
    );
    return response.data;
  },

  analyzeText: async (text: string): Promise<TextEmotionAnalysis> => {
    const response = await axios.post<TextEmotionAnalysis>(
      `${LOCAL_AI_URL}/analyze-text`,
      { text },
      { headers: localHeaders() },
    );
    return response.data;
  },

  transcribeAudio: async (audioBlob: Blob): Promise<TranscriptionResponse> => {
    const response = await axios.post<TranscriptionResponse>(
      `${LOCAL_AI_URL}/transcribe`,
      audioForm(audioBlob),
      { headers: localHeaders() },
    );
    return response.data;
  },

  processVoice: async (audioBlob: Blob): Promise<VoiceProcessingResponse> => {
    const response = await axios.post<VoiceProcessingResponse>(
      `${LOCAL_AI_URL}/process-voice`,
      audioForm(audioBlob),
      { headers: localHeaders() },
    );
    return response.data;
  },

  chat: async (
    question: string,
    entries: JournalEntry[],
  ): Promise<ChatResponse> => {
    const response = await axios.post<ChatResponse>(
      `${LOCAL_AI_URL}/chat`,
      {
        question,
        entries: entries.map((entry) => ({
          id: entry.id,
          text: entry.text_content,
          date: entry.created_at,
          sentiment: entry.sentiment,
        })),
      },
      { headers: localHeaders() },
    );
    return response.data;
  },
};

export default localAI;
