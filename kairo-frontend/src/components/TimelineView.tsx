import { Clock3 } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatEntryDay, formatSentiment, getEntryPresentation } from '../utils/entries';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

interface TimelineViewProps {
    entries: JournalEntry[];
    showPageHeader?: boolean;
}

export function TimelineView({ entries, showPageHeader = false }: TimelineViewProps) {
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
                        <div className="timeline-card surface-card">
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
                                <div className="entry-meta">
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

    if (!showPageHeader) return content;

    return (
        <div className="standalone-view">
            <PageHeader
                eyebrow="Chronology"
                title="Timeline"
                description="See how your thoughts, projects, and routines have evolved over time."
            />
            {content}
        </div>
    );
}
