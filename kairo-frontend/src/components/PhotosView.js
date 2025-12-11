import React from 'react';

function PhotosView({ entries }) {
    const entriesWithPhotos = entries.filter(e => e.image_url);

    if (entriesWithPhotos.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No photos found in your journal.</p>
                <p style={{ fontSize: '0.9rem' }}>Attach images to your entries to see them here!</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem'
        }}>
            {entriesWithPhotos.map(entry => (
                <div key={entry.id} style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    aspectRatio: '1/1',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    group: 'photo-card'
                }}>
                    <img
                        src={entry.image_url}
                        alt="Memory"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '10px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date(entry.created_at).toLocaleDateString()}</p>
                        <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.text_content}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PhotosView;
