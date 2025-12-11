import React, { useState, useEffect } from 'react';
import NeoButton from './NeoButton';
import VoiceRecorder from './VoiceRecorder';
import api from '../api';
import anime from 'animejs';
import heic2any from 'heic2any';

function Journal({ notebookId, notebookTitle, token, onBack, initialText }) {
    const [entries, setEntries] = useState([]);
    const [newEntryText, setNewEntryText] = useState(initialText || '');
    const [newEntryImage, setNewEntryImage] = useState(null); // URL of uploaded image
    const [location, setLocation] = useState(null); // { lat, lng }
    const [viewingLocation, setViewingLocation] = useState(null); // { lat, lng } for modal
    const [isPosting, setIsPosting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState('All');
    const [error, setError] = useState('');

    // Chat State
    const [chatQuestion, setChatQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState(null);
    const [isChatting, setIsChatting] = useState(false);
    const [expandedContextIds, setExpandedContextIds] = useState(new Set());

    useEffect(() => {
        if (initialText) {
            setNewEntryText(initialText);
        }
    }, [initialText]);

    useEffect(() => {
        handleGetEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notebookId, searchQuery, sentimentFilter]);

    // Animation Effect
    useEffect(() => {
        if (entries.length > 0) {
            anime({
                targets: '.entry-card',
                translateY: [20, 0],
                opacity: [0, 1],
                delay: anime.stagger(100),
                easing: 'easeOutExpo'
            });
        }
    }, [entries]);

    const handleGetEntries = async () => {
        if (!token) return;
        try {
            const data = await api.getEntries(token, searchQuery, sentimentFilter, notebookId === 'all' ? null : notebookId);
            setEntries(data);
        } catch (err) {
            console.error('Failed to fetch entries:', err);
        }
    };

    const handleCreateEntry = async (e) => {
        e.preventDefault();
        // Allow submission if there is text OR an image
        if (!token || isPosting || (!newEntryText.trim() && !newEntryImage)) return;
        setIsPosting(true);
        setError('');
        try {
            const newEntry = await api.createEntry(
                token,
                newEntryText,
                notebookId === 'all' ? null : notebookId,
                newEntryImage,
                location?.lat,
                location?.lng
            );
            setEntries([newEntry, ...entries]);
            setNewEntryText('');
            setNewEntryImage(null);
            setLocation(null);
        } catch (err) {
            console.error('Failed to create entry:', err);
            setError('Could not create entry.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteEntry = async (entryId) => {
        if (!window.confirm("Are you sure you want to delete this entry?")) return;
        try {
            await api.deleteEntry(token, entryId);
            setEntries(entries.filter(e => e.id !== entryId));
        } catch (err) {
            console.error('Failed to delete entry:', err);
            alert("Failed to delete entry.");
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!token || !chatQuestion.trim()) return;
        setIsChatting(true);
        setChatAnswer(null);
        try {
            const data = await api.chatWithJournal(token, chatQuestion);
            setChatAnswer(data);
        } catch (err) {
            console.error('Chat failed:', err);
            alert('Failed to chat with journal.');
        } finally {
            setIsChatting(false);
        }
    };

    const toggleContextExpansion = (id) => {
        const newSet = new Set(expandedContextIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedContextIds(newSet);
    };

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
        <div className="journal-view">
            {/* ... header ... */}
            <header className="journal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="back-btn" onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{notebookTitle || "All Entries"}</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Search & Filter */}
                    <input
                        type="text"
                        placeholder="Search entries..."
                        className="neo-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '200px' }}
                    />
                    <select
                        className="neo-input"
                        value={sentimentFilter}
                        onChange={(e) => setSentimentFilter(e.target.value)}
                        style={{ width: '150px', cursor: 'pointer' }}
                    >
                        <option value="All">All Moods</option>
                        <option value="joy">Joy</option>
                        <option value="sadness">Sadness</option>
                        <option value="anger">Anger</option>
                        <option value="fear">Fear</option>
                        <option value="surprise">Surprise</option>
                        <option value="disgust">Disgust</option>
                        <option value="neutral">Neutral</option>
                    </select>
                </div>
            </header>

            <div className="journal-content" style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* --- Create Entry Section --- */}
                <div className="create-entry-section" style={{ marginBottom: '3rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>New Entry</h3>

                        <VoiceRecorder
                            onTranscriptionComplete={(text) => setNewEntryText(text)}
                            onSave={(entry) => setEntries([entry, ...entries])}
                            token={token}
                            notebookId={notebookId === 'all' ? null : notebookId}
                        />

                        <form onSubmit={handleCreateEntry} className="entry-form" style={{ marginTop: '1rem' }}>
                            <textarea
                                className="neo-textarea"
                                placeholder="What's on your mind? (Type or record above)"
                                value={newEntryText}
                                onChange={(e) => setNewEntryText(e.target.value)}
                                style={{ marginBottom: '1rem' }}
                            />

                            {/* Image Upload Preview */}
                            {newEntryImage && (
                                <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
                                    <img src={newEntryImage} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                    <button
                                        type="button"
                                        onClick={() => setNewEntryImage(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: '-10px',
                                            background: 'var(--accent-danger)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <input
                                        type="file"
                                        id="entry-image-upload"
                                        style={{ display: 'none' }}
                                        accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                                        onChange={async (e) => {
                                            let file = e.target.files[0];
                                            if (!file) return;

                                            // HEIC Conversion
                                            if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
                                                try {
                                                    const convertedBlob = await heic2any({
                                                        blob: file,
                                                        toType: 'image/jpeg',
                                                        quality: 0.8
                                                    });
                                                    file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                                                } catch (err) {
                                                    console.error('HEIC conversion failed:', err);
                                                    alert('Could not convert HEIC image.');
                                                    return;
                                                }
                                            }

                                            // Optional: Show loading state for image
                                            try {
                                                const uploadRes = await api.uploadImage(token, file);
                                                setNewEntryImage(uploadRes.url);
                                            } catch (err) {
                                                console.error('Image upload failed:', err);
                                                alert('Failed to upload image');
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('entry-image-upload').click()}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.5rem',
                                            padding: '5px'
                                        }}
                                        title="Attach Image"
                                    >
                                        📷
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        setLocation({
                                                            lat: position.coords.latitude,
                                                            lng: position.coords.longitude
                                                        });
                                                        alert("Location attached!");
                                                    },
                                                    (error) => {
                                                        console.error("Error getting location:", error);
                                                        alert("Could not get location.");
                                                    }
                                                );
                                            } else {
                                                alert("Geolocation is not supported by this browser.");
                                            }
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.5rem',
                                            padding: '5px',
                                            color: location ? 'var(--accent-success)' : 'inherit'
                                        }}
                                        title="Attach Location"
                                    >
                                        📍
                                    </button>
                                </div>
                                <NeoButton
                                    text={isPosting ? "Saving..." : "Save Entry"}
                                    color="#2F81F7"
                                    type="submit"
                                />
                            </div>
                        </form>
                        {error && <p className="error-message">{error}</p>}
                    </div>
                </div>

                {/* --- Chat Interface --- */}
                <div className="chat-interface" style={{ marginBottom: '3rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #2F81F720 0%, #0D1117 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--accent-primary)' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>✨</span>
                            Ask your Journal
                        </h3>
                        <form onSubmit={handleChat} style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="e.g., What have I been worried about lately?"
                                className="neo-input"
                                value={chatQuestion}
                                onChange={(e) => setChatQuestion(e.target.value)}
                                style={{ flex: 1, background: 'var(--bg-primary)' }}
                            />
                            <NeoButton
                                text={isChatting ? "..." : "Ask"}
                                color="#9D4EDD"
                                type="submit"
                                style={{ width: '100px' }}
                            />
                        </form>

                        {chatAnswer && (
                            <div className="chat-answer" style={{
                                marginTop: '15px',
                                padding: '15px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                            }}>
                                <p style={{ fontWeight: 'bold', marginBottom: '10px', lineHeight: '1.6' }}>{chatAnswer.answer}</p>
                                {chatAnswer.context && chatAnswer.context.length > 0 && (
                                    <div className="chat-context">
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relevant Entries:</p>
                                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                            {chatAnswer.context.map((ctx) => {
                                                const isExpanded = expandedContextIds.has(ctx.id);
                                                return (
                                                    <li
                                                        key={ctx.id}
                                                        style={{ fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                        onClick={() => toggleContextExpansion(ctx.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>[Collapse] </span>
                                                                "{ctx.text}"
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>[Expand] </span>
                                                                "{ctx.text.substring(0, 100)}..."
                                                            </>
                                                        )}
                                                        <span className="sentiment-tag" style={{ marginLeft: '10px' }}>#{ctx.sentiment}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="divider" style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

                {/* Entries List */}
                <div className="entries-list">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Entries</h2>
                    {entries.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No entries yet. Start writing!</p>}
                    {entries.map(entry => (
                        <div key={entry.id} className="entry-card">
                            <div className="entry-header">
                                <div className="entry-meta">
                                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                                    {entry.sentiment && (
                                        <span className={`sentiment-badge ${entry.sentiment.toLowerCase()}`}>
                                            {entry.sentiment}
                                        </span>
                                    )}
                                    {entry.latitude && entry.longitude && (
                                        <button
                                            onClick={() => setViewingLocation({ lat: entry.latitude, lng: entry.longitude })}
                                            style={{
                                                marginLeft: '10px',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                fontSize: '1rem'
                                            }}
                                            title="View on Google Maps"
                                        >
                                            📍 Location
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{getSentimentEmoji(entry.sentiment)}</span>
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDeleteEntry(entry.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="entry-content">
                                {entry.text_content}
                                {entry.image_url && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <img
                                            src={entry.image_url}
                                            alt="Entry attachment"
                                            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {/* Google Maps Modal */}
                {viewingLocation && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }} onClick={() => setViewingLocation(null)}>
                        <div style={{
                            position: 'relative',
                            width: '90%',
                            maxWidth: '800px',
                            height: '600px', // Fixed height for map
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }} onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setViewingLocation(null)}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    color: 'black',
                                    zIndex: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                            <iframe
                                title="Google Maps Location"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://maps.google.com/maps?q=${viewingLocation.lat},${viewingLocation.lng}&z=15&output=embed`}
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Journal;
