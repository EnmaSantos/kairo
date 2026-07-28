import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { App } from './App';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const googleOAuthEnabled = Boolean(
  clientId
  && clientId !== 'placeholder-client-id'
  && clientId.endsWith('.apps.googleusercontent.com'),
);
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Kairo could not find the root application element.');
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    {googleOAuthEnabled && clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        <App googleOAuthEnabled />
      </GoogleOAuthProvider>
    ) : (
      <App googleOAuthEnabled={false} />
    )}
  </StrictMode>
);
