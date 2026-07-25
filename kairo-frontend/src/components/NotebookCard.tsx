import './NotebookCard.css';
import type { Notebook } from '../types';

interface NotebookCardProps {
    notebook: Notebook;
    onClick: (notebookId: number) => void;
    onDelete: (notebookId: number) => void;
}

export function NotebookCard({ notebook, onClick, onDelete }: NotebookCardProps) {
    // Random emoji if none provided (or use a fixed one based on title hash)
    const emojis = ['📓', '🧠', '⚡', '💡', '📋', '🧑‍💻', '🤔'];
    const emoji = emojis[notebook.id % emojis.length];

    // Format date
    const date = new Date(notebook.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <article className="notebook-card">
            <div className="card-header">
                <span className="card-icon">{emoji}</span>
                <button
                    className="card-menu-btn"
                    aria-label={`Delete ${notebook.title}`}
                    onClick={(e) => {
                        onDelete(notebook.id);
                    }}
                >
                    ⋮
                </button>
            </div>
            <button
                type="button"
                className="notebook-open-button"
                onClick={() => onClick(notebook.id)}
            >
                <div className="card-body">
                    <h3 className="card-title">{notebook.title}</h3>
                    <p className="card-meta">{date} • {notebook.entries.length} entries</p>
                </div>
            </button>
        </article>
    );
}
