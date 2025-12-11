import React, { useState } from 'react';
import NeoButton from './NeoButton';
import NotebookCard from './NotebookCard';
import api from '../api';

function Library({ notebooks, setNotebooks, onSelectNotebook, token }) {
    const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
    const [newNotebookTitle, setNewNotebookTitle] = useState('');
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [genStartDate, setGenStartDate] = useState('');
    const [genEndDate, setGenEndDate] = useState('');
    const [genMode, setGenMode] = useState('daily');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCreateNotebook = async (e) => {
        e.preventDefault();
        if (!newNotebookTitle.trim()) return;
        try {
            const newNotebook = await api.createNotebook(token, newNotebookTitle);
            setNotebooks([...notebooks, newNotebook]);
            setNewNotebookTitle('');
            setIsCreatingNotebook(false);
        } catch (err) {
            console.error('Failed to create notebook:', err);
            alert('Failed to create notebook.');
        }
    };

    const handleDeleteNotebook = async (id) => {
        if (!window.confirm("Are you sure? This will NOT delete the entries inside, but they will become uncategorized.")) return;
        try {
            await api.deleteNotebook(token, id);
            setNotebooks(notebooks.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete notebook:', err);
            alert('Failed to delete notebook.');
        }
    };

    const handleQuickSelect = (mode) => {
        setGenMode(mode);
        const today = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (mode === 'daily') {
            setGenStartDate(formatDate(today));
            setGenEndDate(formatDate(today));
        } else if (mode === 'weekly') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            setGenStartDate(formatDate(lastWeek));
            setGenEndDate(formatDate(today));
        } else if (mode === 'monthly') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            setGenStartDate(formatDate(lastMonth));
            setGenEndDate(formatDate(today));
        } else if (mode === 'quarterly') {
            const lastQuarter = new Date(today);
            lastQuarter.setMonth(today.getMonth() - 3);
            setGenStartDate(formatDate(lastQuarter));
            setGenEndDate(formatDate(today));
        }
    };

    const handleAutoGenerateNotebook = async () => {
        setIsGenerating(true);
        try {
            const newNotebook = await api.autoGenerateNotebook(token, genStartDate, genEndDate, genMode);
            setNotebooks([...notebooks, newNotebook]);
            alert(`Generated notebook: ${newNotebook.title}`);
            setShowGenerateModal(false);
        } catch (err) {
            console.error('Failed to auto-generate:', err);
            if (err.response && err.response.status === 404) {
                alert("No uncategorized entries found for this period.");
            } else {
                alert('Failed to generate notebook.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="library-view">
            <header className="library-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Notebooks</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{notebooks.length} active notebooks</p>
                </div>
                <div className="library-actions" style={{ display: 'flex', gap: '10px' }}>
                    <NeoButton
                        text="✨ Auto-Generate"
                        color="#9D4EDD"
                        onClick={() => {
                            handleQuickSelect('daily');
                            setShowGenerateModal(true);
                        }}
                    />
                    <NeoButton
                        text="+ New Notebook"
                        color="#2F81F7"
                        onClick={() => setIsCreatingNotebook(true)}
                    />
                </div>
            </header>

            {/* --- Generate Modal --- */}
            {showGenerateModal && (
                <div className="create-notebook-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="create-notebook-form" style={{ width: '400px', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Generate Notebook</h3>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label className="form-label">Quick Select</label>
                            <select
                                className="neo-input"
                                value={genMode}
                                onChange={(e) => handleQuickSelect(e.target.value)}
                            >
                                <option value="daily">Today</option>
                                <option value="weekly">Last 7 Days</option>
                                <option value="monthly">Last 30 Days</option>
                                <option value="quarterly">Last 90 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="neo-input"
                                    value={genStartDate}
                                    onChange={(e) => {
                                        setGenStartDate(e.target.value);
                                        setGenMode('custom');
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">End Date</label>
                                <input
                                    type="date"
                                    className="neo-input"
                                    value={genEndDate}
                                    onChange={(e) => {
                                        setGenEndDate(e.target.value);
                                        setGenMode('custom');
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <NeoButton
                                text={isGenerating ? "Generating..." : "Generate"}
                                color="#00FF95"
                                onClick={handleAutoGenerateNotebook}
                                style={{ flex: 1 }}
                            />
                            <NeoButton
                                text="Cancel"
                                color="#FF4747"
                                onClick={() => setShowGenerateModal(false)}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- Create Notebook Modal --- */}
            {isCreatingNotebook && (
                <div className="create-notebook-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <form onSubmit={handleCreateNotebook} className="create-notebook-form" style={{ width: '400px', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Create New Notebook</h3>
                        <input
                            type="text"
                            className="neo-input"
                            placeholder="Notebook Name"
                            value={newNotebookTitle}
                            onChange={(e) => setNewNotebookTitle(e.target.value)}
                            autoFocus
                            style={{ marginBottom: '1.5rem' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <NeoButton text="Create" color="#00FF95" type="submit" style={{ flex: 1 }} />
                            <NeoButton text="Cancel" color="#FF4747" onClick={() => setIsCreatingNotebook(false)} style={{ flex: 1 }} />
                        </div>
                    </form>
                </div>
            )}

            <div className="notebook-grid">
                {/* "All Entries" Card */}
                <div className="notebook-card all-entries-card" onClick={() => onSelectNotebook('all')} style={{ background: 'linear-gradient(135deg, #2F81F7 0%, #0D1117 100%)', borderColor: 'transparent' }}>
                    <div className="card-body" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</span>
                        <h3 className="card-title" style={{ color: 'white' }}>All Entries</h3>
                        <p className="card-meta" style={{ color: 'rgba(255,255,255,0.7)' }}>View everything</p>
                    </div>
                </div>

                {notebooks.map(notebook => (
                    <NotebookCard
                        key={notebook.id}
                        notebook={notebook}
                        onClick={onSelectNotebook}
                        onDelete={handleDeleteNotebook}
                    />
                ))}
            </div>
        </div>
    );
}

export default Library;
