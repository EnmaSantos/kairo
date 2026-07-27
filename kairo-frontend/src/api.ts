import axios from 'axios';

import type {
  AuthToken,
  CreateEntryInput,
  GenerationMode,
  JournalEntry,
  Notebook,
  NotebookId,
  UploadResponse,
  User,
  UserUpdate,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const api = {
  login: async (email: string, password: string): Promise<AuthToken> => {
    const loginData = new URLSearchParams({ username: email, password });
    const response = await axios.post<AuthToken>(`${API_URL}/login`, loginData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  googleLogin: async (
    token: string,
    mode: 'login' | 'register' = 'login',
  ): Promise<AuthToken> => {
    const response = await axios.post<AuthToken>(`${API_URL}/auth/google`, { token, mode });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ): Promise<User> => {
    const response = await axios.post<User>(`${API_URL}/users`, {
      email,
      password,
      username,
      full_name: fullName,
    });
    return response.data;
  },

  getUser: async (token: string): Promise<User> => {
    const response = await axios.get<User>(`${API_URL}/users/me`, {
      headers: authHeaders(token),
    });
    return response.data;
  },

  updateUser: async (token: string, userData: UserUpdate): Promise<User> => {
    const response = await axios.put<User>(`${API_URL}/users/me`, userData, {
      headers: authHeaders(token),
    });
    return response.data;
  },

  uploadImage: async (token: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post<UploadResponse>(`${API_URL}/upload`, formData, {
      headers: authHeaders(token),
    });
    return response.data;
  },

  getNotebooks: async (token: string): Promise<Notebook[]> => {
    const response = await axios.get<Notebook[]>(`${API_URL}/notebooks`, {
      headers: authHeaders(token),
    });
    return response.data;
  },

  createNotebook: async (token: string, title: string): Promise<Notebook> => {
    const response = await axios.post<Notebook>(
      `${API_URL}/notebooks`,
      { title },
      { headers: authHeaders(token) },
    );
    return response.data;
  },

  deleteNotebook: async (token: string, id: number): Promise<void> => {
    await axios.delete(`${API_URL}/notebooks/${id}`, {
      headers: authHeaders(token),
    });
  },

  getEntries: async (
    token: string,
    search = '',
    sentiment = '',
    notebookId: NotebookId = null,
  ): Promise<JournalEntry[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sentiment && sentiment !== 'All') params.set('sentiment', sentiment);
    if (notebookId !== null) params.set('notebook_id', notebookId.toString());

    const query = params.size > 0 ? `?${params.toString()}` : '';
    const response = await axios.get<JournalEntry[]>(`${API_URL}/journal-entries${query}`, {
      headers: authHeaders(token),
    });
    return response.data;
  },

  createEntry: async (
    token: string,
    input: CreateEntryInput,
  ): Promise<JournalEntry> => {
    const response = await axios.post<JournalEntry>(
      `${API_URL}/journal-entries`,
      {
        text_content: input.textContent,
        notebook_id: input.notebookId ?? null,
        image_url: input.imageUrl ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        sentiment: input.sentiment ?? null,
        emotion_label: input.emotion_label ?? null,
        emotion_scores: input.emotion_scores ?? null,
        voice_emotion: input.voice_emotion ?? null,
        voice_emotion_scores: input.voice_emotion_scores ?? null,
        summary: input.summary ?? null,
        ai_model_versions: input.ai_model_versions ?? null,
        ai_processed_at: input.ai_processed_at ?? null,
        source_type: input.source_type ?? 'text',
      },
      { headers: authHeaders(token) },
    );
    return response.data;
  },

  deleteEntry: async (token: string, entryId: number): Promise<void> => {
    await axios.delete(`${API_URL}/journal-entries/${entryId}`, {
      headers: authHeaders(token),
    });
  },

  autoGenerateNotebook: async (
    token: string,
    startDate: string,
    endDate: string,
    mode: GenerationMode,
  ): Promise<Notebook> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (mode) params.mode = mode;

    const response = await axios.post<Notebook>(
      `${API_URL}/notebooks/auto-generate`,
      {},
      {
        headers: authHeaders(token),
        params,
      },
    );
    return response.data;
  },
};

export default api;
