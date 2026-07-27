import { BookMarked, Trash2 } from 'lucide-react';
import './NotebookCard.css';
import type { Notebook } from '../types';

interface NotebookCardProps {
    notebook: Notebook;
    onClick: (notebookId: number) => void;
    onDelete: (notebookId: number) => void;
}

export function NotebookCard({ notebook, onClick, onDelete }: NotebookCardProps) {
    const date = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(notebook.created_at));

    return (
        <article className="notebook-card">
            <div className="card-header">
                <span className="notebook-symbol"><BookMarked aria-hidden="true" /></span>
                <button
                    type="button"
                    className="icon-button notebook-delete-button"
                    aria-label={`Delete ${notebook.title}`}
                    onClick={() => onDelete(notebook.id)}
                >
                    <Trash2 aria-hidden="true" />
                </button>
            </div>
            <button
                type="button"
                className="notebook-open-button"
                onClick={() => onClick(notebook.id)}
            >
                <span className="card-title">{notebook.title}</span>
                <span className="card-meta">
                    {notebook.entries.length} {notebook.entries.length === 1 ? 'entry' : 'entries'} · Created {date}
                </span>
            </button>
        </article>
    );
}
