import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css'; // We'll create this for custom styling

function CalendarView({ entries }) {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Helper to check if a date has entries
    const hasEntries = (date) => {
        return entries.some(entry => {
            const entryDate = new Date(entry.created_at);
            return (
                entryDate.getDate() === date.getDate() &&
                entryDate.getMonth() === date.getMonth() &&
                entryDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Get entries for the selected date
    const selectedEntries = entries.filter(entry => {
        const entryDate = new Date(entry.created_at);
        return (
            entryDate.getDate() === selectedDate.getDate() &&
            entryDate.getMonth() === selectedDate.getMonth() &&
            entryDate.getFullYear() === selectedDate.getFullYear()
        );
    });

    return (
        <div className="calendar-view-container" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        tileClassName={({ date, view }) => {
                            if (view === 'month' && hasEntries(date)) {
                                return 'has-entries';
                            }
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: '1', minWidth: '300px' }}>
                <h3 style={{ marginBottom: '1rem' }}>Entries for {selectedDate.toLocaleDateString()}</h3>
                {selectedEntries.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No entries for this day.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedEntries.map(entry => (
                            <div key={entry.id} style={{
                                background: 'var(--bg-secondary)',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <p style={{ margin: 0 }}>{entry.text_content}</p>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {new Date(entry.created_at).toLocaleTimeString()}
                                    {entry.sentiment && <span style={{ marginLeft: '10px' }}>#{entry.sentiment}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CalendarView;
