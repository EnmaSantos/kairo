import React from 'react';

function TimelineView({ entries }) {
    if (entries.length === 0) {
        return <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No entries yet.</p>;
    }

    return (
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto', padding: '2rem 0' }}>
            {/* Vertical Line */}
            <div style={{
                position: 'absolute',
                left: '20px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'var(--border-color)'
            }}></div>

            {entries.map((entry, index) => (
                <div key={entry.id} style={{
                    position: 'relative',
                    paddingLeft: '50px',
                    marginBottom: '2rem'
                }}>
                    {/* Dot */}
                    <div style={{
                        position: 'absolute',
                        left: '11px',
                        top: '0',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--bg-primary)',
                        border: '4px solid var(--accent-primary)',
                        zIndex: 1
                    }}></div>

                    {/* Content */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {new Date(entry.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>{entry.text_content}</p>

                        {entry.image_url && (
                            <img
                                src={entry.image_url}
                                alt="Memory"
                                style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }}
                            />
                        )}

                        {entry.sentiment && (
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                background: 'var(--bg-tertiary)',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                #{entry.sentiment}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default TimelineView;
