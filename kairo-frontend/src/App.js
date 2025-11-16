import './App.css';
import NeoButton from './components/NeoButton';
import { useState } from 'react'; // Import useState to hold our form data
import axios from 'axios';       // Import axios to make API calls

// Your backend API is running on port 8000
const API_URL = 'http://127.0.0.1:8000';

function App() {
  // --- State Variables ---
  // Store the email and password from the form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Store the login token we get back from the server
  const [token, setToken] = useState(null);
  
  // Store any error messages
  const [error, setError] = useState('');
  
  // Store the list of entries
  const [entries, setEntries] = useState([]);

  // --- Functions ---
  const handleLogin = async (e) => {
    e.preventDefault(); // Stop the form from refreshing the page
    setError(''); // Clear any old errors
    
    // This is the tricky part:
    // The backend /login route (OAuth2PasswordRequestForm)
    // expects 'form-data', NOT JSON.
    // We create URLSearchParams to send the data in the right format.
    const loginData = new URLSearchParams();
    loginData.append('username', email); // It expects 'username', which is our email
    loginData.append('password', password);

    try {
      const response = await axios.post(`${API_URL}/login`, loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // If login is successful, save the token
      console.log('Login successful!', response.data);
      setToken(response.data.access_token);
      
      // Clear the form
      setEmail('');
      setPassword('');

    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please check your email and password.');
    }
  };

  const handleGetEntries = async () => {
    if (!token) {
      setError('You must be logged in to see entries.');
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/journal-entries`, {
        headers: {
          'Authorization': `Bearer ${token}` // Send our token for auth
        }
      });
      
      console.log('Entries fetched!', response.data);
      setEntries(response.data);

    } catch (err) {
      console.error('Failed to fetch entries:', err);
      setError('Could not fetch entries.');
    }
  };

  // --- Render Logic ---
  
  // If we are NOT logged in (no token), show the login form
  if (!token) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Kairo</h1>
          <h2>Please Log In</h2>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neo-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input"
            />
            <NeoButton text="Login" color="#00FF95" type="submit" />
          </form>
          {error && <p className="error-message">{error}</p>}
        </header>
      </div>
    );
  }

  // If we ARE logged in, show the main app
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Kairo</h1>
        <p>You are logged in!</p>
        
        <NeoButton text="Get My Entries" color="#FFD600" onClick={handleGetEntries} />
        
        {/* This is where we'll list the entries */}
        <div className="entries-list">
          {entries.map(entry => (
            <div key={entry.id} className="entry-item">
              <p>{new Date(entry.created_at).toLocaleString()}</p>
              <p>{entry.text_content}</p>
            </div>
          ))}
        </div>
        
        {/* Add a logout button */}
        <NeoButton text="Log Out" color="#FF4747" onClick={() => setToken(null)} />
      </header>
    </div>
  );
}

export default App;
