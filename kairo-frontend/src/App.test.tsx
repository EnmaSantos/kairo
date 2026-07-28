import { render, screen } from '@testing-library/react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { App } from './App';

test('renders login page by default', () => {
  window.localStorage.clear();
  render(
    <GoogleOAuthProvider clientId="test-client-id">
      <App />
    </GoogleOAuthProvider>
  );
  // Since we are not logged in, it should show the Auth component
  const linkElement = screen.getByText(/Welcome back/i);
  expect(linkElement).toBeInTheDocument();
});
