import { lazy, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    Flame,
    Images,
    Lightbulb,
    List,
    MapPinned,
    PenLine,
} from 'lucide-react';
import { dailyPrompts } from '../prompts';
import type { DashboardView, JournalEntry, User } from '../types';
import { formatEntryDate, formatSentiment, getEntryPresentation } from '../utils/entries';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

const CalendarView = lazy(() => import('./CalendarView').then((module) => ({ default: module.CalendarView })));
const MapView = lazy(() => import('./MapView').then((module) => ({ default: module.MapView })));
const PhotosView = lazy(() => import('./PhotosView').then((module) => ({ default: module.PhotosView })));
const TimelineView = lazy(() => import('./TimelineView').then((module) => ({ default: module.TimelineView })));

interface DashboardProps {
    user: User | null;
    entries: JournalEntry[];
    onPromptClick: (prompt: string) => void;
}

interface DashboardStat {
    label: string;
    value?: string;
    icon: LucideIcon;
    tone?: 'accent' | 'success' | 'warning';
    subtext: string;
    action?: () => void;
}

const viewOptions: { id: DashboardView; label: string; icon: LucideIcon }[] = [
    { id: 'list', label: 'List', icon: List },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'map', label: 'Map', icon: MapPinned },
    { id: 'photos', label: 'Photos', icon: Images },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
];

export function Dashboard({ user, entries, onPromptClick }: DashboardProps) {
    const [currentView, setCurrentView] = useState<DashboardView>('list');

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const dailyPrompt = useMemo(() => {
        const daySeed = Number(
            new Date().toISOString().slice(0, 10).replaceAll('-', ''),
        );
        return dailyPrompts[daySeed % dailyPrompts.length] ?? dailyPrompts[0] ?? 'What deserves your attention today?';
    }, []);

    const stats = useMemo(() => {
        const now = new Date();
        const wordsWritten = entries.reduce((total, entry) => {
            const entryDate = new Date(entry.created_at);
            if (entryDate.getMonth() !== now.getMonth() || entryDate.getFullYear() !== now.getFullYear()) {
                return total;
            }
            return total + entry.text_content.trim().split(/\s+/).filter(Boolean).length;
        }, 0);

        const localDayKey = (value: string): string => {
            const date = new Date(value);
            return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
            ].join('-');
        };
        const uniqueDays = [...new Set(entries.map((entry) => localDayKey(entry.created_at)))]
            .sort()
            .reverse();

        let streak = 0;
        if (uniqueDays.length > 0) {
            const cursor = new Date();
            cursor.setHours(0, 0, 0, 0);
            const latest = new Date(`${uniqueDays[0]}T00:00:00`);
            const ageInDays = Math.round((cursor.getTime() - latest.getTime()) / 86400000);

            if (ageInDays <= 1) {
                let expected = latest;
                for (const day of uniqueDays) {
                    const entryDay = new Date(`${day}T00:00:00`);
                    if (entryDay.getTime() === expected.getTime()) {
                        streak += 1;
                        expected = new Date(expected);
                        expected.setDate(expected.getDate() - 1);
                    } else {
                        break;
                    }
                }
            }
        }

        return [
            {
                label: 'Daily prompt',
                icon: Lightbulb,
                subtext: dailyPrompt,
                action: () => onPromptClick(dailyPrompt),
            },
            {
                label: 'Current streak',
                value: `${streak} ${streak === 1 ? 'day' : 'days'}`,
                icon: Flame,
                tone: 'warning',
                subtext: streak > 0 ? 'A steady rhythm is taking shape.' : 'Write today to begin a new streak.',
            },
            {
                label: 'Words this month',
                value: wordsWritten.toLocaleString(),
                icon: PenLine,
                tone: 'success',
                subtext: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} in your journal.`,
            },
        ] satisfies DashboardStat[];
    }, [dailyPrompt, entries, onPromptClick]);

    const firstName = user?.full_name?.trim().split(/\s+/)[0] || user?.username || 'there';
    const formattedToday = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    return (
        <div className="dashboard-container">
            <section className="dashboard-welcome">
                <div className="dashboard-welcome-copy">
                    <p className="page-eyebrow">Your journal</p>
                    <h1>{greeting}, {firstName}.</h1>
                    <p>A quiet place to notice patterns, keep meaningful moments, and make space for what comes next.</p>
                </div>
                <span className="dashboard-date">{formattedToday}</span>
            </section>

            <div className="dashboard-grid" role="group" aria-label="Journal overview">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const content = (
                        <>
                            <div className={`stat-icon-box ${stat.tone ? `stat-icon-${stat.tone}` : ''}`}>
                                <Icon aria-hidden="true" />
                            </div>
                            <div className="stat-content">
                                <h3>{stat.label}</h3>
                                {stat.value ? (
                                    <>
                                        <div className="value">{stat.value}</div>
                                        <p className="subtext">{stat.subtext}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="prompt-copy">{stat.subtext}</p>
                                        <span className="text-link">
                                            Answer prompt <ArrowRight aria-hidden="true" />
                                        </span>
                                    </>
                                )}
                            </div>
                        </>
                    );

                    return stat.action ? (
                        <button key={stat.label} type="button" className="stat-card" onClick={stat.action}>
                            {content}
                        </button>
                    ) : (
                        <div key={stat.label} className="stat-card">{content}</div>
                    );
                })}
            </div>

            <div className="view-toolbar">
                <h2>Recent entries</h2>
                <div className="segmented-control" role="group" aria-label="Entry view">
                    {viewOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = currentView === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={`segment-button ${isActive ? 'active' : ''}`}
                                aria-pressed={isActive}
                                onClick={() => setCurrentView(option.id)}
                            >
                                <Icon aria-hidden="true" />
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {currentView === 'list' && (
                entries.length === 0 ? (
                    <EmptyState
                        title="Your first entry starts here"
                        description="Capture a thought, speak a reflection, or use today’s prompt to begin building your journal."
                        icon={<PenLine />}
                        action={(
                            <Button variant="primary" icon={<PenLine aria-hidden="true" />} onClick={() => onPromptClick('')}>
                                Write an entry
                            </Button>
                        )}
                    />
                ) : (
                    <div className="recent-entry-grid">
                        {entries.slice(0, 6).map((entry) => {
                            const presentation = getEntryPresentation(entry);
                            return (
                                <article key={entry.id} className="entry-card recent-entry-card">
                                    <div className="entry-header">
                                        <div className="entry-meta">
                                            <time dateTime={entry.created_at}>{formatEntryDate(entry.created_at)}</time>
                                            {entry.sentiment && (
                                                <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                                    {formatSentiment(entry.sentiment)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="entry-title">{presentation.title}</h3>
                                    {presentation.body && <p className="entry-preview">{presentation.body}</p>}
                                </article>
                            );
                        })}
                    </div>
                )
            )}

            {currentView === 'calendar' && <CalendarView entries={entries} />}
            {currentView === 'map' && <MapView entries={entries} />}
            {currentView === 'photos' && <PhotosView entries={entries} />}
            {currentView === 'timeline' && <TimelineView entries={entries} />}
        </div>
    );
}
