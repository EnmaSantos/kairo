import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatEntryDate, formatSentiment, getEntryPresentation } from '../utils/entries';

interface EntryDetailModalProps {
    entry: JournalEntry | null;
    onClose: () => void;
}

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
    const titleId = useId();
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!entry) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        window.requestAnimationFrame(() => closeButtonRef.current?.focus());

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [entry, onClose]);

    if (!entry) return null;

    const presentation = getEntryPresentation(entry);

    return (
        <div
            className="modal-backdrop entry-detail-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) onClose();
            }}
        >
            <section
                className="modal-card entry-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="entry-detail-header">
                    <div>
                        <p className="page-eyebrow">Journal entry</p>
                        <h2 id={titleId}>{presentation.title}</h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="icon-button"
                        aria-label="Close entry"
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className="entry-detail-scroll">
                    <div className="entry-detail-meta">
                        <time dateTime={entry.created_at}>{formatEntryDate(entry.created_at)}</time>
                        {entry.sentiment && (
                            <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                {formatSentiment(entry.sentiment)}
                            </span>
                        )}
                    </div>

                    {presentation.body && (
                        <div className="entry-detail-body">{presentation.body}</div>
                    )}

                    {entry.image_url && (
                        <img
                            src={entry.image_url}
                            alt={`Attachment for ${presentation.title}`}
                            className="entry-detail-image"
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
