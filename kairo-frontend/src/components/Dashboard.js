import React, { useMemo } from 'react';
import { dailyPrompts } from '../prompts';
import CalendarView from './CalendarView';
import MapView from './MapView';
import PhotosView from './PhotosView';
import TimelineView from './TimelineView';
import { useState } from 'react';

function Dashboard({ user, entries, onNavigate, onPromptClick }) {
    const [currentView, setCurrentView] = useState('list'); // list, calendar, map, photos, timeline

    // --- Dynamic Greeting ---
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // --- Dynamic Prompt ---
    const dailyPrompt = useMemo(() => {
        // Use the date as a seed so it changes daily but stays same for the day
        // Or just random for now as requested "depending on mood or time of day" implies variety
        // Let's pick a random one on mount for variety
        const randomIndex = Math.floor(Math.random() * dailyPrompts.length);
        return dailyPrompts[randomIndex];
    }, []);

    // --- Dynamic Stats Calculation ---
    const stats = useMemo(() => {
        // 1. Words Written (This Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const wordsWritten = entries.reduce((acc, entry) => {
            const entryDate = new Date(entry.created_at);
            if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
                return acc + (entry.text_content ? entry.text_content.trim().split(/\s+/).length : 0);
            }
            return acc;
        }, 0);

        // 2. Current Streak
        // Sort entries by date descending
        const sortedEntries = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        let streak = 0;
        if (sortedEntries.length > 0) {
            const today = new Date().setHours(0, 0, 0, 0);
            const lastEntryDate = new Date(sortedEntries[0].created_at).setHours(0, 0, 0, 0);

            // If last entry was today or yesterday, streak is alive
            const diffDays = (today - lastEntryDate) / (1000 * 60 * 60 * 24);

            if (diffDays <= 1) {
                streak = 1;
                let currentDate = lastEntryDate;

                for (let i = 1; i < sortedEntries.length; i++) {
                    const entryDate = new Date(sortedEntries[i].created_at).setHours(0, 0, 0, 0);
                    if (entryDate === currentDate) continue; // Multiple entries same day

                    if (currentDate - entryDate === 86400000) { // Exactly 1 day difference
                        streak++;
                        currentDate = entryDate;
                    } else {
                        break;
                    }
                }
            }
        }

        return [
            {
                label: 'Daily Prompt',
                value: 'Answer Prompt →',
                icon: '💡',
                color: '#2F81F7',
                subtext: dailyPrompt,
                action: () => onPromptClick(dailyPrompt)
            },
            {
                label: 'Current Streak',
                value: `${streak} Days`,
                icon: '🔥',
                color: '#D29922',
                subtext: 'Keep it up! You\'re on fire.'
            },
            {
                label: 'Words Written',
                value: wordsWritten.toLocaleString(),
                icon: '📝',
                color: '#238636',
                subtext: 'This month.'
            },
        ];
    }, [entries, onPromptClick]);

    // --- Emoji Helper ---
    const getSentimentEmoji = (sentiment) => {
        switch (sentiment?.toLowerCase()) {
            case 'joy': return '😄';
            case 'sadness': return '😢';
            case 'anger': return '😠';
            case 'fear': return '😨';
            case 'surprise': return '😲';
            case 'disgust': return '🤢';
            default: return '📝';
        }
    };

    return (
        <div className="dashboard-container">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{greeting}, {user?.full_name?.split(' ')[0] || 'Traveler'}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Ready to capture your thoughts today?</p>
            </header>

            <div className="dashboard-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card" onClick={stat.action ? stat.action : undefined} style={{ cursor: stat.action ? 'pointer' : 'default' }}>
                        <div className="stat-icon-box" style={{ backgroundColor: `${stat.color} 20`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="stat-content">
                            <h3>{stat.label}</h3>
                            {stat.label === 'Daily Prompt' ? (
                                <>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{stat.subtext}</p>
                                    <span style={{ color: stat.color, fontWeight: 600 }}>{stat.value}</span>
                                </>
                            ) : (
                                <>
                                    <div className="value">{stat.value}</div>
                                    <div className="subtext">{stat.subtext}</div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2>Recent Entries</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className={`nav-item ${currentView === 'list' ? 'active' : ''}`}
                        onClick={() => setCurrentView('list')}
                        style={{ border: 'none', background: currentView === 'list' ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                        List
                    </button>
                    <button
                        className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
                        onClick={() => setCurrentView('calendar')}
                        style={{ border: 'none', background: currentView === 'calendar' ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                        Calendar
                    </button>
                    <button
                        className={`nav-item ${currentView === 'map' ? 'active' : ''}`}
                        onClick={() => setCurrentView('map')}
                        style={{ border: 'none', background: currentView === 'map' ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                        Map
                    </button>
                    <button
                        className={`nav-item ${currentView === 'photos' ? 'active' : ''}`}
                        onClick={() => setCurrentView('photos')}
                        style={{ border: 'none', background: currentView === 'photos' ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                        Photos
                    </button>
                    <button
                        className={`nav-item ${currentView === 'timeline' ? 'active' : ''}`}
                        onClick={() => setCurrentView('timeline')}
                        style={{ border: 'none', background: currentView === 'timeline' ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                        Timeline
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {currentView === 'list' && (
                    entries.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No entries yet. Start writing to see them here!</p>
                    ) : (
                        entries.slice(0, 5).map(entry => (
                            <div key={entry.id} className="entry-card">
                                <div className="entry-header">
                                    <div className="entry-meta">
                                        <span>{new Date(entry.created_at).toLocaleString()}</span>
                                        {entry.sentiment && (
                                            <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                                {entry.sentiment}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '1.5rem' }}>{getSentimentEmoji(entry.sentiment)}</span>
                                </div>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Entry #{entry.id}</h3>
                                <p className="entry-preview">{entry.text_content}</p>
                            </div>
                        ))
                    )
                )}

                {currentView === 'calendar' && <CalendarView entries={entries} />}
                {currentView === 'map' && <MapView entries={entries} />}
                {currentView === 'photos' && <PhotosView entries={entries} />}
                {currentView === 'timeline' && <TimelineView entries={entries} />}
            </div>
        </div>
    );
}

export default Dashboard;
