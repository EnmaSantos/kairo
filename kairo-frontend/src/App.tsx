import { lazy, Suspense, useEffect, useState } from 'react';
import './App.css';
import api from './api';
import type { AppView, JournalEntry, Notebook, NotebookSelectionId, User } from './types';

// Components
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const Library = lazy(() => import('./components/Library').then((module) => ({ default: module.Library })));
const Journal = lazy(() => import('./components/Journal').then((module) => ({ default: module.Journal })));
const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const TimelineView = lazy(() => import('./components/TimelineView').then((module) => ({ default: module.TimelineView })));
const CalendarView = lazy(() => import('./components/CalendarView').then((module) => ({ default: module.CalendarView })));
const MapView = lazy(() => import('./components/MapView').then((module) => ({ default: module.MapView })));
const PhotosView = lazy(() => import('./components/PhotosView').then((module) => ({ default: module.PhotosView })));

type SelectedNotebook = Pick<Notebook, 'id' | 'title'> | { id: 'all'; title: string };

export function App() {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem('kairo_token'));
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedNotebook, setSelectedNotebook] = useState<SelectedNotebook | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [initialEntryText, setInitialEntryText] = useState('');

  useEffect(() => {
    if (token) {
      void Promise.all([
        fetchUserData(token),
        fetchNotebooks(token),
        fetchAllEntries(token),
      ]);
    } else {
      setUser(null);
      setNotebooks([]);
      setAllEntries([]);
      setCurrentView('dashboard');
    }
  }, [token]);

  const fetchUserData = async (activeToken: string): Promise<void> => {
    try {
      const userData = await api.getUser(activeToken);
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setToken(null);
      window.localStorage.removeItem('kairo_token');
    }
  };

  const fetchNotebooks = async (activeToken: string): Promise<void> => {
    try {
      const data = await api.getNotebooks(activeToken);
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to fetch notebooks:', err);
    }
  };

  const fetchAllEntries = async (activeToken: string): Promise<void> => {
    try {
      const data = await api.getEntries(activeToken);
      setAllEntries(data);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  };

  const handleLogin = (newToken: string): void => {
    setToken(newToken);
    window.localStorage.setItem('kairo_token', newToken);
  };

  const handleLogout = (): void => {
    setToken(null);
    window.localStorage.removeItem('kairo_token');
  };

  const handleViewChange = (viewId: AppView): void => {
    setCurrentView(viewId);
    if (viewId !== 'journal') {
      setSelectedNotebook(null);
      setInitialEntryText('');
    }
  };

  const handleSelectNotebook = (notebookId: NotebookSelectionId): void => {
    const notebook = notebooks.find((candidate) => candidate.id === notebookId);
    setSelectedNotebook(
      notebookId === 'all' ? { id: 'all', title: 'All Entries' } : notebook ?? null,
    );
    setCurrentView('journal');
  };

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
          aria-label="Open navigation"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰
        </button>
        <Suspense fallback={<p className="view-loading">Loading your journal…</p>}>
          {currentView === 'dashboard' && (
            <Dashboard
              user={user}
              entries={allEntries}
              onPromptClick={(prompt) => {
                setSelectedNotebook({ id: 'all', title: 'All Entries' });
                setInitialEntryText(prompt);
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
              notebookId={selectedNotebook?.id ?? 'all'}
              notebookTitle={selectedNotebook?.title}
              token={token}
              onBack={() => setCurrentView('library')}
              initialText={initialEntryText}
            />
          )}

          {currentView === 'settings' && user && (
            <Settings user={user} onUpdateUser={setUser} />
          )}

          {currentView === 'timeline' && <TimelineView entries={allEntries} />}
          {currentView === 'calendar' && <CalendarView entries={allEntries} />}
          {currentView === 'map' && <MapView entries={allEntries} />}
          {currentView === 'photos' && <PhotosView entries={allEntries} />}
        </Suspense>
      </main>
    </div>
  );
}
