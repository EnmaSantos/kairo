import './App.css';
import NeoButton from './components/NeoButton';
import { useState, useEffect } from 'react'; // Import useState AND useEffect
import axios from 'axios';

// Your backend API is running on port 8000
const API_URL = 'http://127.0.0.1:8000';

function App() {
  // --- State Variables ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState([]);
  
  // --- NEW State for creating an entry ---
  const [newEntryText, setNewEntryText] = useState('');
  const [isPosting, setIsPosting] = useState(false); // Prevents double-clicks

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
    if (!token) return; // Don't run if we don't have a token
    
    try {
      const response = await axios.get(`${API_URL}/journal-entries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Entries fetched!', response.data);
      setEntries(response.data);

    } catch (err) {
      console.error('Failed to fetch entries:', err);
      setError('Could not fetch entries.');
    }
  };

  // --- NEW: Function to create a new entry ---
  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!token || isPosting || !newEntryText.trim()) return;

    setIsPosting(true);
    setError('');

    try {
      // Send the new entry text to the backend
      const response = await axios.post(`${API_URL}/journal-entries`, 
        {
          text_content: newEntryText // Send as JSON
        }, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      console.log('Entry created!', response.data);
      
      // --- This is the magic! ---
      // We get the new entry back (with sentiment!)
      // and add it to the *top* of our entries list.
      setEntries([response.data, ...entries]);
      setNewEntryText(''); // Clear the textarea

    } catch (err) {
      console.error('Failed to create entry:', err);
      setError('Could not create entry.');
    } finally {
      setIsPosting(false); // Re-enable the button
    }
  };

  // --- NEW: useEffect Hook ---
  // This will run *once* when the 'token' variable changes.
  useEffect(() => {
    if (token) {
      // If we have a token, fetch the entries right away.
      handleGetEntries();
    } else {
      // If we log out (token is null), clear the entries.
      setEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // The "dependency array" - this hook watches 'token'

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
        
        {/* --- NEW: Create Entry Form --- */}
        <form onSubmit={handleCreateEntry} className="entry-form">
          <textarea
            className="neo-textarea"
            placeholder="What's on your mind?"
            value={newEntryText}
            onChange={(e) => setNewEntryText(e.target.value)}
          />
          <NeoButton 
            text={isPosting ? "Saving..." : "Save Entry"} 
            color="#00FF95" 
            type="submit"
          />
        </form>
        {error && <p className="error-message">{error}</p>}
        
        {/* --- Divider --- */}
        <hr className="divider" />

        {/* This is where we'll list the entries */}
        <div className="entries-list">
          {entries.length === 0 && <p>No entries yet. Write one!</p>}
          {entries.map(entry => (
            <div key={entry.id} className="entry-item">
              <p>
                {new Date(entry.created_at).toLocaleString()}
                {/* --- TEST FOR STRETCH GOAL --- */}
                {entry.sentiment && (
                  <span className={`sentiment ${entry.sentiment}`}>
                    {entry.sentiment}
                  </span>
                )}
              </p>
              <p>{entry.text_content}</p>
            </div>
          ))}
        </div>
        
        <NeoButton text="Log Out" color="#FF4747" onClick={() => setToken(null)} />
      </header>
    </div>
  );
}

export default App;
