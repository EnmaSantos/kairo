import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css';
import type { JournalEntry } from '../types';
import { formatSentiment, getEntryPresentation } from '../utils/entries';
import { EmptyState } from './EmptyState';
import { EntryDetailModal } from './EntryDetailModal';
import { PageHeader } from './PageHeader';

interface CalendarViewProps {
    entries: JournalEntry[];
    showPageHeader?: boolean;
}

function isSameDay(left: Date, right: Date): boolean {
    return left.getDate() === right.getDate()
        && left.getMonth() === right.getMonth()
        && left.getFullYear() === right.getFullYear();
}

export function CalendarView({ entries, showPageHeader = false }: CalendarViewProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const hasEntries = (date: Date): boolean => (
        entries.some((entry) => isSameDay(new Date(entry.created_at), date))
    );

    const selectedEntries = entries.filter((entry) => (
        isSameDay(new Date(entry.created_at), selectedDate)
    ));

    const content = entries.length === 0 ? (
        <EmptyState
            title="No journal dates yet"
            description="Days with entries will be marked here once you begin writing."
            icon={<CalendarDays />}
        />
    ) : (
        <div className="calendar-view-container">
            <div className="calendar-panel surface-card">
                <Calendar
                    onChange={(value) => {
                        if (value instanceof Date) setSelectedDate(value);
                    }}
                    value={selectedDate}
                    tileClassName={({ date, view }) => (
                        view === 'month' && hasEntries(date) ? 'has-entries' : undefined
                    )}
                />
            </div>

            <section className="calendar-day-panel surface-card">
                <h2>
                    {new Intl.DateTimeFormat(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    }).format(selectedDate)}
                </h2>
                {selectedEntries.length === 0 ? (
                    <EmptyState
                        compact
                        title="Nothing recorded this day"
                        description="Choose a marked date to revisit its entries."
                        icon={<CalendarDays />}
                    />
                ) : (
                    <div className="calendar-entry-list">
                        {selectedEntries.map((entry) => {
                            const presentation = getEntryPresentation(entry);
                            return (
                                <article key={entry.id} className="calendar-entry clickable-card">
                                    <button
                                        type="button"
                                        className="card-click-target"
                                        aria-label={`Open ${presentation.title}`}
                                        onClick={() => setSelectedEntry(entry)}
                                    />
                                    <h3>{presentation.title}</h3>
                                    {presentation.body && <p>{presentation.body}</p>}
                                    <div className="calendar-entry-meta">
                                        <time dateTime={entry.created_at}>
                                            {new Intl.DateTimeFormat(undefined, {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            }).format(new Date(entry.created_at))}
                                        </time>
                                        {entry.sentiment && (
                                            <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                                {formatSentiment(entry.sentiment)}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
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
                eyebrow="Daily rhythm"
                title="Calendar"
                description="Browse your journal by day and revisit the moments that shaped each week."
            />
            {content}
            {detailModal}
        </div>
    );
}
