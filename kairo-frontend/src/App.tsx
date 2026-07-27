import { lazy, Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { Menu, RefreshCw } from 'lucide-react';
import './App.css';
import api from './api';
import type { AppView, JournalEntry, Notebook, NotebookSelectionId, User } from './types';
import { Auth } from './components/Auth';
import { Button } from './components/Button';
import { LoadingState } from './components/LoadingState';
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

interface AppProps {
  googleOAuthEnabled?: boolean;
}

export function App({ googleOAuthEnabled = false }: AppProps) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem('kairo_token'));
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedNotebook, setSelectedNotebook] = useState<SelectedNotebook | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [initialEntryText, setInitialEntryText] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(token));
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadAppData = async (): Promise<void> => {
      if (!token) {
        setUser(null);
        setNotebooks([]);
        setAllEntries([]);
        setCurrentView('dashboard');
        setIsInitialLoading(false);
        setDataError('');
        return;
      }

      setIsInitialLoading(true);
      setDataError('');

      try {
        const [userData, notebookData, entryData] = await Promise.all([
          api.getUser(token),
          api.getNotebooks(token),
          api.getEntries(token),
        ]);
        if (!isCurrent) return;
        setUser(userData);
        setNotebooks(notebookData);
        setAllEntries(entryData);
      } catch (error) {
        console.error('Failed to load journal data:', error);
        if (isCurrent) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            window.localStorage.removeItem('kairo_token');
            setToken(null);
          } else {
            setDataError('Kairo could not load all of your journal data. Check that the server is running and try again.');
          }
        }
      } finally {
        if (isCurrent) setIsInitialLoading(false);
      }
    };

    void loadAppData();
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const refreshAppData = async (): Promise<void> => {
    if (!token) return;
    setIsInitialLoading(true);
    setDataError('');
    try {
      const [userData, notebookData, entryData] = await Promise.all([
        api.getUser(token),
        api.getNotebooks(token),
        api.getEntries(token),
      ]);
      setUser(userData);
      setNotebooks(notebookData);
      setAllEntries(entryData);
    } catch (error) {
      console.error('Failed to refresh journal data:', error);
      setDataError('Kairo could not refresh your journal data. Please try again.');
    } finally {
      setIsInitialLoading(false);
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
      notebookId === 'all' ? { id: 'all', title: 'All entries' } : notebook ?? null,
    );
    setCurrentView('journal');
  };

  const handleEntryCreated = (entry: JournalEntry): void => {
    setAllEntries((current) => [entry, ...current.filter((candidate) => candidate.id !== entry.id)]);
  };

  const handleEntryDeleted = (entryId: number): void => {
    setAllEntries((current) => current.filter((entry) => entry.id !== entryId));
  };

  if (!token) {
    return <Auth onLogin={handleLogin} googleOAuthEnabled={googleOAuthEnabled} />;
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

      <main className="main-content" id="main-content">
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Open navigation"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>

        <div className="content-frame">
          {dataError && (
            <div className="app-alert" role="alert">
              <span>{dataError}</span>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw aria-hidden="true" />}
                onClick={() => void refreshAppData()}
              >
                Retry
              </Button>
            </div>
          )}

          {isInitialLoading ? (
            <LoadingState />
          ) : (
            <Suspense fallback={<LoadingState />}>
              {currentView === 'dashboard' && (
                <Dashboard
                  user={user}
                  entries={allEntries}
                  onPromptClick={(prompt) => {
                    setSelectedNotebook({ id: 'all', title: 'All entries' });
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
                  onEntryCreated={handleEntryCreated}
                  onEntryDeleted={handleEntryDeleted}
                />
              )}

              {currentView === 'settings' && user && (
                <Settings user={user} onUpdateUser={setUser} />
              )}

              {currentView === 'timeline' && <TimelineView entries={allEntries} showPageHeader />}
              {currentView === 'calendar' && <CalendarView entries={allEntries} showPageHeader />}
              {currentView === 'map' && <MapView entries={allEntries} showPageHeader />}
              {currentView === 'photos' && <PhotosView entries={allEntries} showPageHeader />}
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
