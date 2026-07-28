export type AppView =
  | 'dashboard'
  | 'library'
  | 'journal'
  | 'settings'
  | 'timeline'
  | 'calendar'
  | 'map'
  | 'photos';

export type DashboardView = 'list' | 'calendar' | 'map' | 'photos' | 'timeline';
export type NotebookSelectionId = number | 'all';
export type NotebookId = number | null;
export type GenerationMode = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  created_at: string;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  password?: string;
  profile_picture_url?: string;
}

export interface JournalEntry {
  id: number;
  text_content: string;
  created_at: string;
  user_id: number;
  sentiment: string | null;
  notebook_id: number | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  emotion_label: string | null;
  emotion_scores: Record<string, number> | null;
  voice_emotion: string | null;
  voice_emotion_scores: Record<string, number> | null;
  summary: string | null;
  ai_model_versions: Record<string, string> | null;
  ai_processed_at: string | null;
  source_type: 'text' | 'voice';
}

export interface Notebook {
  id: number;
  title: string;
  created_at: string;
  user_id: number;
  entries: JournalEntry[];
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface UploadResponse {
  url: string;
}

export interface TranscriptionResponse {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number | null, number | null];
  }>;
  model: string;
}

export interface ChatContextEntry {
  id: number;
  text: string;
  date: string;
  sentiment: string | null;
  score: number;
}

export interface ChatResponse {
  answer: string;
  context: ChatContextEntry[];
  models?: Record<string, string>;
}

export interface TextEmotionAnalysis {
  primary_emotion: string;
  sentiment: string;
  scores: Record<string, number>;
  model: string;
}

export interface VoiceEmotionAnalysis {
  primary_emotion: string;
  scores: Record<string, number>;
  model: string;
}

export interface VoiceProcessingResponse {
  text: string;
  chunks: TranscriptionResponse['chunks'];
  text_emotion: TextEmotionAnalysis;
  voice_emotion: VoiceEmotionAnalysis;
  processed_at: string;
  models: Record<string, string>;
}

export interface EntryAIData {
  sentiment?: string | null;
  emotion_label?: string | null;
  emotion_scores?: Record<string, number> | null;
  voice_emotion?: string | null;
  voice_emotion_scores?: Record<string, number> | null;
  summary?: string | null;
  ai_model_versions?: Record<string, string> | null;
  ai_processed_at?: string | null;
  source_type?: 'text' | 'voice';
}

export interface CreateEntryInput extends EntryAIData {
  textContent: string;
  notebookId?: NotebookId;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LocalAIModelCapability {
  available: boolean;
  path: string;
  model: string;
}

export interface LocalAICapabilities {
  runtime: 'local';
  device: string;
  models_dir: string;
  models: Record<string, LocalAIModelCapability>;
  ready: boolean;
  active_model: string | null;
}

export interface AIStatus {
  mode: 'local' | 'hosted';
  available: boolean;
  checking: boolean;
  message: string;
  capabilities: LocalAICapabilities | null;
}
