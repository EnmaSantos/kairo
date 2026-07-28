/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_AI_MODE?: 'local' | 'disabled';
  readonly VITE_LOCAL_AI_URL?: string;
  readonly VITE_LOCAL_AI_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
