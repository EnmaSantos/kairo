import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    BookOpenText,
    ImagePlus,
    MapPin,
    MessageSquareText,
    Save,
    Search,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import api from '../api';
import type {
    ChatResponse,
    JournalEntry,
    LocationCoordinates,
    NotebookSelectionId,
} from '../types';
import { formatEntryDate, formatSentiment, getEntryPresentation } from '../utils/entries';
import { convertHeicToJpeg, isHeicImage } from '../utils/images';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { VoiceRecorder } from './VoiceRecorder';

interface JournalProps {
    notebookId: NotebookSelectionId;
    notebookTitle?: string;
    token: string;
    onBack: () => void;
    initialText: string;
    onEntryCreated: (entry: JournalEntry) => void;
    onEntryDeleted: (entryId: number) => void;
}

export function Journal({
    notebookId,
    notebookTitle,
    token,
    onBack,
    initialText,
    onEntryCreated,
    onEntryDeleted,
}: JournalProps) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [newEntryText, setNewEntryText] = useState(initialText || '');
    const [newEntryImage, setNewEntryImage] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationCoordinates | null>(null);
    const [viewingLocation, setViewingLocation] = useState<LocationCoordinates | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isLoadingEntries, setIsLoadingEntries] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState('All');
    const [error, setError] = useState('');

    const [chatQuestion, setChatQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState<ChatResponse | null>(null);
    const [isChatting, setIsChatting] = useState(false);
    const [chatError, setChatError] = useState('');
    const [expandedContextIds, setExpandedContextIds] = useState<Set<number>>(() => new Set());

    useEffect(() => {
        if (initialText) setNewEntryText(initialText);
    }, [initialText]);

    useEffect(() => {
        let isCurrent = true;
        const timer = window.setTimeout(() => {
            const getEntries = async (): Promise<void> => {
                setIsLoadingEntries(true);
                setError('');
                try {
                    const data = await api.getEntries(
                        token,
                        searchQuery,
                        sentimentFilter,
                        notebookId === 'all' ? null : notebookId,
                    );
                    if (isCurrent) setEntries(data);
                } catch (requestError) {
                    console.error('Failed to fetch entries:', requestError);
                    if (isCurrent) setError('Entries could not be loaded. Please try again.');
                } finally {
                    if (isCurrent) setIsLoadingEntries(false);
                }
            };

            void getEntries();
        }, searchQuery ? 250 : 0);

        return () => {
            isCurrent = false;
            window.clearTimeout(timer);
        };
    }, [notebookId, searchQuery, sentimentFilter, token]);

    const addEntryToView = (entry: JournalEntry): void => {
        setEntries((current) => [entry, ...current.filter((candidate) => candidate.id !== entry.id)]);
        onEntryCreated(entry);
    };

    const handleCreateEntry = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (isPosting || (!newEntryText.trim() && !newEntryImage)) return;

        setIsPosting(true);
        setError('');
        try {
            const newEntry = await api.createEntry(
                token,
                newEntryText.trim(),
                notebookId === 'all' ? null : notebookId,
                newEntryImage,
                location?.lat,
                location?.lng,
            );
            addEntryToView(newEntry);
            setNewEntryText('');
            setNewEntryImage(null);
            setLocation(null);
        } catch (requestError) {
            console.error('Failed to create entry:', requestError);
            setError('Your entry could not be saved. Your text is still here so you can try again.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteEntry = async (entry: JournalEntry): Promise<void> => {
        const presentation = getEntryPresentation(entry);
        if (!window.confirm(`Delete “${presentation.title}”? This action cannot be undone.`)) return;

        setError('');
        try {
            await api.deleteEntry(token, entry.id);
            setEntries((current) => current.filter((candidate) => candidate.id !== entry.id));
            onEntryDeleted(entry.id);
        } catch (requestError) {
            console.error('Failed to delete entry:', requestError);
            setError('The entry could not be deleted. Please try again.');
        }
    };

    const handleImageUpload = async (file: File): Promise<void> => {
        setIsUploadingImage(true);
        setError('');
        try {
            const convertedFile = isHeicImage(file) ? await convertHeicToJpeg(file) : file;
            const upload = await api.uploadImage(token, convertedFile);
            setNewEntryImage(upload.url);
        } catch (requestError) {
            console.error('Image upload failed:', requestError);
            setError('The image could not be attached. Try a JPEG, PNG, WebP, or HEIC file.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleAttachLocation = (): void => {
        setError('');
        if (!navigator.geolocation) {
            setError('Location is not supported by this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (requestError) => {
                console.error('Location request failed:', requestError);
                setError('Kairo could not access your location. Check your browser permission and try again.');
            },
        );
    };

    const handleChat = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!chatQuestion.trim() || isChatting) return;

        setIsChatting(true);
        setChatAnswer(null);
        setChatError('');
        try {
            setChatAnswer(await api.chatWithJournal(token, chatQuestion.trim()));
        } catch (requestError) {
            console.error('Journal chat failed:', requestError);
            setChatError('Kairo could not search your journal right now. Please try again.');
        } finally {
            setIsChatting(false);
        }
    };

    const toggleContextExpansion = (id: number): void => {
        setExpandedContextIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const showEntryLocation = (entry: JournalEntry): void => {
        if (entry.latitude === null || entry.longitude === null) return;
        setViewingLocation({ lat: entry.latitude, lng: entry.longitude });
    };

    const isFiltered = Boolean(searchQuery || sentimentFilter !== 'All');

    return (
        <div className="journal-view">
            <header className="journal-header">
                <div className="journal-title-row">
                    <button type="button" className="icon-button" onClick={onBack} aria-label="Back to notebooks">
                        <ArrowLeft aria-hidden="true" />
                    </button>
                    <div>
                        <p className="page-eyebrow">Write and reflect</p>
                        <h1>{notebookTitle || 'All entries'}</h1>
                        <p>
                            {new Intl.DateTimeFormat(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                            }).format(new Date())}
                        </p>
                    </div>
                </div>

                <div className="journal-tools">
                    <div className="input-with-icon">
                        <Search aria-hidden="true" />
                        <label className="sr-only" htmlFor="entry-search">Search entries</label>
                        <input
                            id="entry-search"
                            type="search"
                            placeholder="Search entries"
                            className="neo-input"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                    <label className="sr-only" htmlFor="sentiment-filter">Filter by mood</label>
                    <select
                        id="sentiment-filter"
                        className="neo-input"
                        value={sentimentFilter}
                        onChange={(event) => setSentimentFilter(event.target.value)}
                    >
                        <option value="All">All moods</option>
                        <option value="joy">Joy</option>
                        <option value="neutral">Neutral</option>
                        <option value="surprise">Surprise</option>
                        <option value="sadness">Sadness</option>
                        <option value="fear">Fear</option>
                        <option value="anger">Anger</option>
                        <option value="disgust">Disgust</option>
                    </select>
                </div>
            </header>

            <div className="journal-content">
                <section className="create-entry-section">
                    <div className="composer-card surface-card">
                        <div className="composer-header">
                            <div>
                                <h2>New entry</h2>
                                <p>Write freely or record a thought and turn it into text.</p>
                            </div>
                        </div>

                        <VoiceRecorder
                            onTranscriptionComplete={(text) => setNewEntryText(text)}
                            onSave={addEntryToView}
                            token={token}
                            notebookId={notebookId === 'all' ? null : notebookId}
                        />

                        <form onSubmit={handleCreateEntry} className="entry-form">
                            <label className="sr-only" htmlFor="new-entry-text">Journal entry</label>
                            <textarea
                                id="new-entry-text"
                                className="neo-textarea"
                                placeholder="Start with a title on the first line, then write what’s on your mind…"
                                value={newEntryText}
                                onChange={(event) => setNewEntryText(event.target.value)}
                            />

                            {newEntryImage && (
                                <div className="image-preview-wrap">
                                    <img src={newEntryImage} alt="Entry attachment preview" />
                                    <button
                                        type="button"
                                        className="icon-button image-preview-remove"
                                        aria-label="Remove attached image"
                                        onClick={() => setNewEntryImage(null)}
                                    >
                                        <X aria-hidden="true" />
                                    </button>
                                </div>
                            )}

                            <div className="composer-footer">
                                <div className="composer-utilities">
                                    <input
                                        type="file"
                                        id="entry-image-upload"
                                        className="sr-only"
                                        accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) void handleImageUpload(file);
                                            event.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="icon-button composer-utility"
                                        aria-label="Attach an image"
                                        title="Attach an image"
                                        disabled={isUploadingImage}
                                        onClick={() => document.getElementById('entry-image-upload')?.click()}
                                    >
                                        <ImagePlus aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className={`icon-button composer-utility ${location ? 'active' : ''}`}
                                        aria-label={location ? 'Location attached' : 'Attach current location'}
                                        title={location ? 'Location attached' : 'Attach current location'}
                                        onClick={handleAttachLocation}
                                    >
                                        <MapPin aria-hidden="true" />
                                    </button>
                                </div>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    icon={<Save aria-hidden="true" />}
                                    isLoading={isPosting}
                                    disabled={!newEntryText.trim() && !newEntryImage}
                                >
                                    Save entry
                                </Button>
                            </div>
                        </form>

                        {error && (
                            <div className="form-message form-message-error" role="alert">
                                <AlertCircle aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </section>

                <section className="chat-interface">
                    <div className="chat-card surface-card">
                        <div className="chat-heading">
                            <span className="chat-heading-icon"><Sparkles aria-hidden="true" /></span>
                            <div>
                                <h2>Ask your journal</h2>
                                <p>Search the themes and patterns in your previous entries.</p>
                            </div>
                        </div>
                        <form onSubmit={handleChat} className="chat-form">
                            <label className="sr-only" htmlFor="journal-question">Question for your journal</label>
                            <input
                                id="journal-question"
                                type="text"
                                placeholder="What progress have I made on my project?"
                                className="neo-input"
                                value={chatQuestion}
                                onChange={(event) => setChatQuestion(event.target.value)}
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                icon={<MessageSquareText aria-hidden="true" />}
                                isLoading={isChatting}
                                disabled={!chatQuestion.trim()}
                            >
                                Ask
                            </Button>
                        </form>

                        {chatError && (
                            <div className="form-message form-message-error" role="alert">
                                <AlertCircle aria-hidden="true" />
                                <span>{chatError}</span>
                            </div>
                        )}

                        {chatAnswer && (
                            <div className="chat-answer" aria-live="polite">
                                <p>{chatAnswer.answer}</p>
                                {chatAnswer.context.length > 0 && (
                                    <div className="chat-context">
                                        <div className="chat-context-title">Relevant entries</div>
                                        <ul className="chat-context-list">
                                            {chatAnswer.context.map((contextEntry) => {
                                                const isExpanded = expandedContextIds.has(contextEntry.id);
                                                return (
                                                    <li key={contextEntry.id}>
                                                        <button
                                                            type="button"
                                                            className="chat-context-button"
                                                            onClick={() => toggleContextExpansion(contextEntry.id)}
                                                            aria-expanded={isExpanded}
                                                        >
                                                            {isExpanded
                                                                ? contextEntry.text
                                                                : `${contextEntry.text.substring(0, 115)}${contextEntry.text.length > 115 ? '…' : ''}`}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="entries-section">
                    <div className="entries-section-header">
                        <h2>Entries</h2>
                        <span className="entries-count">
                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>

                    {isLoadingEntries ? (
                        <div className="empty-state empty-state-compact" role="status">
                            <span className="button-spinner" aria-hidden="true" />
                            <p>Loading entries…</p>
                        </div>
                    ) : entries.length === 0 ? (
                        <EmptyState
                            compact
                            title={isFiltered ? 'No matching entries' : 'No entries here yet'}
                            description={
                                isFiltered
                                    ? 'Try a different search term or mood filter.'
                                    : 'Use the composer above to add the first entry to this notebook.'
                            }
                            icon={isFiltered ? <Search /> : <BookOpenText />}
                            action={isFiltered ? (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSentimentFilter('All');
                                    }}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined}
                        />
                    ) : (
                        <div className="entries-list">
                            {entries.map((entry) => {
                                const presentation = getEntryPresentation(entry);
                                return (
                                    <article key={entry.id} className="entry-card">
                                        <div className="entry-header">
                                            <div className="entry-meta">
                                                <time dateTime={entry.created_at}>{formatEntryDate(entry.created_at)}</time>
                                                {entry.sentiment && (
                                                    <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                                        {formatSentiment(entry.sentiment)}
                                                    </span>
                                                )}
                                                {entry.latitude !== null && entry.longitude !== null && (
                                                    <button
                                                        type="button"
                                                        className="entry-location"
                                                        onClick={() => showEntryLocation(entry)}
                                                    >
                                                        <MapPin aria-hidden="true" />
                                                        Location
                                                    </button>
                                                )}
                                            </div>
                                            <div className="entry-actions">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={<Trash2 aria-hidden="true" />}
                                                    aria-label={`Delete ${presentation.title}`}
                                                    onClick={() => void handleDeleteEntry(entry)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                        <h3 className="entry-title">{presentation.title}</h3>
                                        {presentation.body && <div className="entry-content">{presentation.body}</div>}
                                        {entry.image_url && (
                                            <img src={entry.image_url} alt="Entry attachment" className="entry-image" />
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {viewingLocation && (
                    <div className="modal-backdrop" role="presentation" onMouseDown={() => setViewingLocation(null)}>
                        <section
                            className="modal-card modal-card-lg"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Entry location"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className="map-modal-header">
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label="Close map"
                                    onClick={() => setViewingLocation(null)}
                                >
                                    <X aria-hidden="true" />
                                </button>
                            </div>
                            <iframe
                                title="Entry location on Google Maps"
                                className="map-modal-frame"
                                src={`https://maps.google.com/maps?q=${viewingLocation.lat},${viewingLocation.lng}&z=15&output=embed`}
                                allowFullScreen
                            />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
