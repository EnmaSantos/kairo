import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { App } from './App';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'google-oauth-not-configured';
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Kairo could not find the root application element.');
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
