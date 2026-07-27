import { useState } from 'react';
import { Clock3 } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatEntryDay, formatSentiment, getEntryPresentation } from '../utils/entries';
import { EmptyState } from './EmptyState';
import { EntryDetailModal } from './EntryDetailModal';
import { PageHeader } from './PageHeader';

interface TimelineViewProps {
    entries: JournalEntry[];
    showPageHeader?: boolean;
}

export function TimelineView({ entries, showPageHeader = false }: TimelineViewProps) {
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const content = entries.length === 0 ? (
        <EmptyState
            title="Your timeline is waiting"
            description="Entries will appear here in chronological order as your journal grows."
            icon={<Clock3 />}
        />
    ) : (
        <div className="timeline-list">
            {entries.map((entry) => {
                const presentation = getEntryPresentation(entry);
                return (
                    <article key={entry.id} className="timeline-item">
                        <span className="timeline-dot" aria-hidden="true" />
                        <div className="timeline-card surface-card clickable-card">
                            <button
                                type="button"
                                className="card-click-target"
                                aria-label={`Open ${presentation.title}`}
                                onClick={() => setSelectedEntry(entry)}
                            />
                            <div className="timeline-date">
                                <time dateTime={entry.created_at}>{formatEntryDay(entry.created_at)}</time>
                                <span>
                                    {new Intl.DateTimeFormat(undefined, {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }).format(new Date(entry.created_at))}
                                </span>
                            </div>
                            <h3 className="entry-title">{presentation.title}</h3>
                            {presentation.body && <p className="entry-preview">{presentation.body}</p>}
                            {entry.image_url && (
                                <img src={entry.image_url} alt="Entry attachment" className="entry-image" />
                            )}
                            {entry.sentiment && (
                                <div className="entry-meta entry-card-footer">
                                    <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                        {formatSentiment(entry.sentiment)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );

    const detailModal = (
        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    );

    if (!showPageHeader) {
        return (
            <>
                {content}
                {detailModal}
            </>
        );
    }

    return (
        <div className="standalone-view">
            <PageHeader
                eyebrow="Chronology"
                title="Timeline"
                description="See how your thoughts, projects, and routines have evolved over time."
            />
            {content}
            {detailModal}
        </div>
    );
}
