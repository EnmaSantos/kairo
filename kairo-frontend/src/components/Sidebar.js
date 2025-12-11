import React from 'react';

function Sidebar({ currentView, onChangeView, onLogout, user, isOpen, onClose }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'timeline', label: 'Timeline', icon: '🕒' },
        { id: 'calendar', label: 'Calendar', icon: '📅' },
        { id: 'photos', label: 'Photos', icon: '🖼️' },
        { id: 'map', label: 'Map', icon: '📍' },
    ];

    const journals = [
        { id: 'library', label: 'All Journals', icon: '📚' },
    ];

    const handleNavClick = (viewId) => {
        onChangeView(viewId);
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}

            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="app-logo">K</div>
                        <div className="app-name">Kairo</div>
                    </div>
                    <button className="close-sidebar-btn" onClick={onClose}>×</button>
                </div>

                <div className="nav-section">
                    <div
                        className="nav-item active"
                        style={{ marginBottom: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: 'pointer' }}
                        onClick={() => handleNavClick('journal')}
                    >
                        <span className="nav-icon">✏️</span>
                        <span style={{ fontWeight: 600 }}>New Entry</span>
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Overview</div>
                    {navItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>

                <div className="nav-section">
                    <div className="nav-label">Journals</div>
                    {journals.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="user-profile-mini" onClick={() => handleNavClick('settings')} title="Go to Settings">
                        <img src={user?.profile_picture_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="User" className="avatar" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>My Journal</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Log Out</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Sidebar;
