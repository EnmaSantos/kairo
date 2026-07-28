import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import axios from 'axios';
import { AlertCircle, BookOpen, CalendarRange, Plus, Sparkles, X } from 'lucide-react';
import api from '../api';
import type { GenerationMode, Notebook, NotebookSelectionId } from '../types';
import { Button } from './Button';
import { NotebookCard } from './NotebookCard';
import { PageHeader } from './PageHeader';

interface LibraryProps {
    notebooks: Notebook[];
    setNotebooks: Dispatch<SetStateAction<Notebook[]>>;
    onSelectNotebook: (notebookId: NotebookSelectionId) => void;
    token: string;
}

export function Library({ notebooks, setNotebooks, onSelectNotebook, token }: LibraryProps) {
    const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
    const [newNotebookTitle, setNewNotebookTitle] = useState('');
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [genStartDate, setGenStartDate] = useState('');
    const [genEndDate, setGenEndDate] = useState('');
    const [genMode, setGenMode] = useState<GenerationMode>('daily');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [message, setMessage] = useState('');

    const handleCreateNotebook = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const title = newNotebookTitle.trim();
        if (!title || isCreating) return;

        setIsCreating(true);
        setMessage('');
        try {
            const newNotebook = await api.createNotebook(token, title);
            setNotebooks((current) => [...current, newNotebook]);
            setNewNotebookTitle('');
            setIsCreatingNotebook(false);
        } catch (error) {
            console.error('Failed to create notebook:', error);
            setMessage('The notebook could not be created. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteNotebook = async (id: number): Promise<void> => {
        const notebook = notebooks.find((candidate) => candidate.id === id);
        const confirmed = window.confirm(
            `Delete “${notebook?.title ?? 'this notebook'}”? Its entries will remain in All entries.`,
        );
        if (!confirmed) return;

        setMessage('');
        try {
            await api.deleteNotebook(token, id);
            setNotebooks((current) => current.filter((candidate) => candidate.id !== id));
        } catch (error) {
            console.error('Failed to delete notebook:', error);
            setMessage('The notebook could not be deleted. Please try again.');
        }
    };

    const handleQuickSelect = (mode: GenerationMode): void => {
        setGenMode(mode);
        const today = new Date();
        const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

        if (mode === 'custom') return;

        const startDate = new Date(today);
        if (mode === 'weekly') startDate.setDate(today.getDate() - 7);
        if (mode === 'monthly') startDate.setMonth(today.getMonth() - 1);
        if (mode === 'quarterly') startDate.setMonth(today.getMonth() - 3);

        setGenStartDate(formatDate(startDate));
        setGenEndDate(formatDate(today));
    };

    const handleAutoGenerateNotebook = async (): Promise<void> => {
        if (isGenerating) return;
        setIsGenerating(true);
        setMessage('');
        try {
            const newNotebook = await api.autoGenerateNotebook(token, genStartDate, genEndDate, genMode);
            setNotebooks((current) => [...current, newNotebook]);
            setShowGenerateModal(false);
        } catch (error) {
            console.error('Failed to auto-generate notebook:', error);
            setMessage(
                axios.isAxiosError(error) && error.response?.status === 404
                    ? 'There are no uncategorized entries in that date range.'
                    : 'The notebook could not be generated. Please try again.',
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="library-view">
            <PageHeader
                eyebrow="Organize"
                title="Notebooks"
                description={`${notebooks.length} ${notebooks.length === 1 ? 'notebook' : 'notebooks'} for the parts of life you want to keep together.`}
                actions={(
                    <div className="library-actions">
                        <Button
                            icon={<Sparkles aria-hidden="true" />}
                            onClick={() => {
                                handleQuickSelect('weekly');
                                setShowGenerateModal(true);
                                setMessage('');
                            }}
                        >
                            Auto-organize
                        </Button>
                        <Button
                            variant="primary"
                            icon={<Plus aria-hidden="true" />}
                            onClick={() => {
                                setIsCreatingNotebook(true);
                                setMessage('');
                            }}
                        >
                            New notebook
                        </Button>
                    </div>
                )}
            />

            {message && (
                <div className="form-message form-message-error" role="alert">
                    <AlertCircle aria-hidden="true" />
                    <span>{message}</span>
                </div>
            )}

            <div className="notebook-grid">
                <button type="button" className="all-entries-card" onClick={() => onSelectNotebook('all')}>
                    <span className="notebook-symbol"><BookOpen aria-hidden="true" /></span>
                    <span>
                        <span className="card-title">All entries</span>
                        <span className="card-meta">Browse your complete journal</span>
                    </span>
                </button>

                {notebooks.map((notebook) => (
                    <NotebookCard
                        key={notebook.id}
                        notebook={notebook}
                        onClick={onSelectNotebook}
                        onDelete={handleDeleteNotebook}
                    />
                ))}
            </div>

            {showGenerateModal && (
                <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowGenerateModal(false)}>
                    <section
                        className="modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="generate-notebook-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h2 id="generate-notebook-title">Auto-organize entries</h2>
                                <p>Collect uncategorized entries from a date range into a new notebook.</p>
                            </div>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Close dialog"
                                onClick={() => setShowGenerateModal(false)}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="generation-range">Date range</label>
                            <select
                                id="generation-range"
                                className="neo-input"
                                value={genMode}
                                onChange={(event) => handleQuickSelect(event.target.value as GenerationMode)}
                            >
                                <option value="daily">Today</option>
                                <option value="weekly">Last 7 days</option>
                                <option value="monthly">Last 30 days</option>
                                <option value="quarterly">Last 90 days</option>
                                <option value="custom">Custom range</option>
                            </select>
                        </div>

                        <div className="date-range-grid">
                            <div className="form-group">
                                <label className="form-label" htmlFor="generation-start">Start date</label>
                                <input
                                    id="generation-start"
                                    type="date"
                                    className="neo-input"
                                    value={genStartDate}
                                    onChange={(event) => {
                                        setGenStartDate(event.target.value);
                                        setGenMode('custom');
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="generation-end">End date</label>
                                <input
                                    id="generation-end"
                                    type="date"
                                    className="neo-input"
                                    value={genEndDate}
                                    onChange={(event) => {
                                        setGenEndDate(event.target.value);
                                        setGenMode('custom');
                                    }}
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <Button onClick={() => setShowGenerateModal(false)}>Cancel</Button>
                            <Button
                                variant="primary"
                                icon={<CalendarRange aria-hidden="true" />}
                                isLoading={isGenerating}
                                disabled={!genStartDate || !genEndDate}
                                onClick={() => void handleAutoGenerateNotebook()}
                            >
                                Generate notebook
                            </Button>
                        </div>
                    </section>
                </div>
            )}

            {isCreatingNotebook && (
                <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCreatingNotebook(false)}>
                    <section
                        className="modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-notebook-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h2 id="create-notebook-title">Create a notebook</h2>
                                <p>Give related entries a clear place to live.</p>
                            </div>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Close dialog"
                                onClick={() => setIsCreatingNotebook(false)}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNotebook}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="new-notebook-title">Notebook name</label>
                                <input
                                    id="new-notebook-title"
                                    type="text"
                                    className="neo-input"
                                    placeholder="e.g. Weekly reflections"
                                    value={newNotebookTitle}
                                    onChange={(event) => setNewNotebookTitle(event.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <Button type="button" onClick={() => setIsCreatingNotebook(false)}>Cancel</Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    icon={<Plus aria-hidden="true" />}
                                    isLoading={isCreating}
                                    disabled={!newNotebookTitle.trim()}
                                >
                                    Create notebook
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
