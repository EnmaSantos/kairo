import React, { useState, useEffect } from 'react';
import './App.css';
import api from './api';

// Components
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Journal from './components/Journal';
import Settings from './components/Settings';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import MapView from './components/MapView';
import PhotosView from './components/PhotosView';

function App() {
  const [token, setToken] = useState(localStorage.getItem('kairo_token'));
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, library, journal, settings
  const [selectedNotebook, setSelectedNotebook] = useState(null); // { id, title }
  const [user, setUser] = useState(null);
  const [notebooks, setNotebooks] = useState([]);
  const [allEntries, setAllEntries] = useState([]);


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [initialEntryText, setInitialEntryText] = useState('');

  // --- Auth Effects ---
  useEffect(() => {
    if (token) {
      // Fetch initial data
      fetchUserData();
      fetchNotebooks();
      fetchAllEntries();
    } else {
      // Reset state on logout
      setUser(null);
      setNotebooks([]);
      setAllEntries([]);
      setCurrentView('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUserData = async () => {
    try {
      const userData = await api.getUser(token);
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      console.error('Failed to fetch user data:', err);
      // If token is invalid or API fails, force logout
      setToken(null);
      localStorage.removeItem('kairo_token');
    }
  };

  const fetchNotebooks = async () => {
    try {
      const data = await api.getNotebooks(token);
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to fetch notebooks:', err);
    }
  };

  const fetchAllEntries = async () => {
    try {
      // Fetch all entries for stats and dashboard
      const data = await api.getEntries(token);
      setAllEntries(data);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('kairo_token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('kairo_token');
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    if (viewId !== 'journal') {
      setSelectedNotebook(null);
      setInitialEntryText(''); // Reset initial text when leaving journal
    }
  };

  const handleSelectNotebook = (notebookId) => {
    const notebook = notebooks.find(n => n.id === notebookId);
    setSelectedNotebook(notebookId === 'all' ? { id: 'all', title: 'All Entries' } : notebook);
    setCurrentView('journal');
  };

  // --- Render ---
  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        onChangeView={handleViewChange}
        onLogout={handleLogout}
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="main-content">
        <button
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰
        </button>
        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            entries={allEntries}
            onNavigate={handleViewChange}
            onPromptClick={(prompt) => {
              setSelectedNotebook({ id: 'all', title: 'All Entries' });
              setInitialEntryText(prompt); // Set the prompt as initial text
              setCurrentView('journal');
            }}
          />
        )}

        {currentView === 'library' && (
          <Library
            notebooks={notebooks}
            setNotebooks={setNotebooks}
            onSelectNotebook={handleSelectNotebook}
            token={token}
          />
        )}

        {currentView === 'journal' && (
          <Journal
            notebookId={selectedNotebook?.id}
            notebookTitle={selectedNotebook?.title}
            token={token}
            onBack={() => setCurrentView('library')}
            initialText={initialEntryText} // Pass it down
          />
        )}

        {currentView === 'settings' && (
          <Settings user={user} onUpdateUser={setUser} />
        )}

        {/* View Routing */}
        {currentView === 'timeline' && <TimelineView entries={allEntries} />}
        {currentView === 'calendar' && <CalendarView entries={allEntries} />}
        {currentView === 'map' && <MapView entries={allEntries} />}
        {currentView === 'photos' && <PhotosView entries={allEntries} />}
      </main>
    </div>
  );
}

export default App;
