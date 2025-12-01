import './App.css';
import NeoButton from './components/NeoButton';
import VoiceRecorder from './components/VoiceRecorder';
import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import api from './api';

function App() {
  // --- State Variables ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Initialize token from localStorage if available
  const [token, setToken] = useState(localStorage.getItem('kairo_token'));
  const [error, setError] = useState('');
  const [entries, setEntries] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);

  // --- NEW State for creating an entry ---
  const [newEntryText, setNewEntryText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // --- NEW State for search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('All');

  // --- NEW State for Chat (RAG) ---
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState(null);
  const [isChatting, setIsChatting] = useState(false);
  const [expandedContextIds, setExpandedContextIds] = useState(new Set());

  // --- Functions ---
  const toggleContextExpansion = (id) => {
    const newSet = new Set(expandedContextIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedContextIds(newSet);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await api.login(email, password);
      console.log('Login successful!', data);
      setToken(data.access_token);
      localStorage.setItem('kairo_token', data.access_token); // Save to localStorage
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please check your email and password.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    try {
      await api.register(email, password, username, fullName);
      // Auto-login after registration
      const data = await api.login(email, password);
      setToken(data.access_token);
      localStorage.setItem('kairo_token', data.access_token); // Save to localStorage
      setEmail('');
      setPassword('');
      setUsername('');
      setFullName('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Registration failed. Username or Email might be taken.');
    }
  };

  const handleGetEntries = async () => {
    if (!token) return;

    try {
      // Pass searchQuery and sentimentFilter to the API
      const data = await api.getEntries(token, searchQuery, sentimentFilter);
      console.log('Entries fetched!', data);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
      setError('Could not fetch entries.');
      // If token is invalid (e.g. expired), clear it
      if (err.response && err.response.status === 401) {
        setToken(null);
        localStorage.removeItem('kairo_token');
      }
    }
  };

  // --- Animation Effect ---
  useEffect(() => {
    if (entries.length > 0) {
      anime({
        targets: '.entry-item',
        translateY: [20, 0],
        opacity: [0, 1],
        delay: anime.stagger(100), // delay starts at 100ms then increase by 100ms for each element.
        easing: 'easeOutExpo'
      });
    }
  }, [entries]);

  const handleChat = async (e) => {
    e.preventDefault();
    if (!token || !chatQuestion.trim()) return;

    setIsChatting(true);
    setChatAnswer(null);

    try {
      const data = await api.chatWithJournal(token, chatQuestion);
      setChatAnswer(data);
    } catch (err) {
      console.error('Chat failed:', err);
      alert('Failed to chat with journal.');
    } finally {
      setIsChatting(false);
    }
  };

  // --- Chat Animation ---
  useEffect(() => {
    if (chatAnswer) {
      anime({
        targets: '.chat-answer',
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  }, [chatAnswer]);

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!token || isPosting || !newEntryText.trim()) return;

    setIsPosting(true);
    setError('');

    try {
      const newEntry = await api.createEntry(token, newEntryText);
      console.log('Entry created!', newEntry);
      setEntries([newEntry, ...entries]);
      setNewEntryText('');
    } catch (err) {
      console.error('Failed to create entry:', err);
      setError('Could not create entry.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleTranscription = (transcribedText) => {
    setNewEntryText(transcribedText);
  };

  const handleVoiceSave = (newEntry) => {
    setEntries([newEntry, ...entries]);
  };

  // --- useEffect Hook ---
  useEffect(() => {
    if (token) {
      // Debounce search to avoid too many requests
      const delayDebounceFn = setTimeout(() => {
        handleGetEntries();
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchQuery, sentimentFilter]);

  // --- Render Logic ---

  if (!token) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="auth-container">
            <h1>Kairo</h1>
            <h2>{isRegistering ? 'Create your account' : 'Welcome back. Please log in to your account.'}</h2>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">

              {isRegistering && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="neo-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      placeholder="johndoe123"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="neo-input"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input"
                />
              </div>

              {isRegistering && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="........"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="neo-input"
                  />
                </div>
              )}

              {!isRegistering && (
                <div style={{ width: '100%', textAlign: 'left', marginBottom: '5px' }}>
                  <a href="/" style={{ color: '#00FF95', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>Forgot your password?</a>
                </div>
              )}

              <NeoButton
                text={isRegistering ? "Sign Up" : "Log In"}
                color="#00FF95"
                type="submit"
                style={{ width: '100%' }}
              />
            </form>

            <p className="auth-toggle">
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button
                className="link-button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
              >
                {isRegistering ? "Login here" : "Register here"}
              </button>
            </p>

            {error && <p className="error-message">{error}</p>}
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Kairo</h1>

        {/* --- Voice Recorder --- */}
        <VoiceRecorder
          onTranscriptionComplete={handleTranscription}
          onSave={handleVoiceSave}
          token={token}
        />

        {/* --- Create Entry Form --- */}
        <form onSubmit={handleCreateEntry} className="entry-form">
          <textarea
            className="neo-textarea"
            placeholder="What's on your mind? (Type or record above)"
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

        {/* --- Search & Filter Bar --- */}
        <div className="search-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', width: '100%', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Search entries..."
            className="neo-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />

          <select
            className="neo-input"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            style={{ width: '150px', cursor: 'pointer' }}
          >
            <option value="All">All Moods</option>
            <option value="joy">Joy</option>
            <option value="sadness">Sadness</option>
            <option value="anger">Anger</option>
            <option value="fear">Fear</option>
            <option value="surprise">Surprise</option>
            <option value="disgust">Disgust</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* --- Chat Interface --- */}
        <div className="chat-interface" style={{ width: '100%', maxWidth: '600px', marginBottom: '30px' }}>
          <form onSubmit={handleChat} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ask your journal a question..."
              className="neo-input"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              style={{ flex: 1 }}
            />
            <NeoButton
              text={isChatting ? "..." : "Ask"}
              color="#9D4EDD"
              type="submit"
              style={{ width: '100px' }}
            />
          </form>

          {chatAnswer && (
            <div className="chat-answer" style={{
              marginTop: '15px',
              padding: '15px',
              border: '3px solid #000',
              borderRadius: '8px',
              backgroundColor: '#E0E0E0',
              boxShadow: '4px 4px 0px 0px #000',
              textAlign: 'left'
            }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>{chatAnswer.answer}</p>
              {chatAnswer.context && chatAnswer.context.length > 0 && (
                <div className="chat-context">
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Relevant Entries:</p>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {chatAnswer.context.map((ctx) => {
                      const isExpanded = expandedContextIds.has(ctx.id);
                      return (
                        <li
                          key={ctx.id}
                          style={{ fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}
                          onClick={() => toggleContextExpansion(ctx.id)}
                        >
                          {isExpanded ? (
                            <>
                              <span style={{ fontWeight: 'bold' }}>[Collapse] </span>
                              "{ctx.text}"
                            </>
                          ) : (
                            <>
                              <span style={{ fontWeight: 'bold' }}>[Expand] </span>
                              "{ctx.text.substring(0, 100)}..."
                            </>
                          )}
                          <span className={`sentiment ${ctx.sentiment} `} style={{ fontSize: '0.7rem', padding: '2px 4px', marginLeft: '5px' }}>{ctx.sentiment}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Divider --- */}
        <hr className="divider" />

        {/* Entries List */}
        <div className="entries-list">
          {entries.length === 0 && <p>No entries yet. Write one!</p>}
          {entries.map(entry => (
            <div key={entry.id} className="entry-item">
              <p>
                {new Date(entry.created_at).toLocaleString()}
                {entry.sentiment && (
                  <span className={`sentiment ${entry.sentiment} `}>
                    {entry.sentiment}
                  </span>
                )}
              </p>
              <p>{entry.text_content}</p>
            </div>
          ))}
        </div>

        <NeoButton
          text="Log Out"
          color="#FF4747"
          onClick={() => {
            setToken(null);
            localStorage.removeItem('kairo_token'); // Clear from localStorage
          }}
        />
      </header>
    </div>
  );
}

export default App;
