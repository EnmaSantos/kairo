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
  success: boolean;
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
}
