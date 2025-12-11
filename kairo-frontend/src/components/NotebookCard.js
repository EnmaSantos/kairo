import React from 'react';
import './NotebookCard.css';

const NotebookCard = ({ notebook, onClick, onDelete }) => {
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
        <div className="notebook-card" onClick={() => onClick(notebook.id)}>
            <div className="card-header">
                <span className="card-icon">{emoji}</span>
                <button
                    className="card-menu-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notebook.id);
                    }}
                >
                    ⋮
                </button>
            </div>
            <div className="card-body">
                <h3 className="card-title">{notebook.title}</h3>
                <p className="card-meta">{date} • {notebook.entries ? notebook.entries.length : 0} entries</p>
            </div>
        </div>
    );
};

export default NotebookCard;
