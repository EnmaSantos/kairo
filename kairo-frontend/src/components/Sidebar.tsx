import type { AppView, User } from '../types';

interface SidebarProps {
    currentView: AppView;
    onChangeView: (view: AppView) => void;
    onLogout: () => void;
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

interface NavigationItem {
    id: AppView;
    label: string;
    icon: string;
}

export function Sidebar({ currentView, onChangeView, onLogout, user, isOpen, onClose }: SidebarProps) {
    const navItems: NavigationItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'timeline', label: 'Timeline', icon: '🕒' },
        { id: 'calendar', label: 'Calendar', icon: '📅' },
        { id: 'photos', label: 'Photos', icon: '🖼️' },
        { id: 'map', label: 'Map', icon: '📍' },
    ];

    const journals: NavigationItem[] = [
        { id: 'library', label: 'All Journals', icon: '📚' },
    ];

    const handleNavClick = (viewId: AppView): void => {
        onChangeView(viewId);
        onClose();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <button
                    type="button"
                    className="sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={onClose}
                />
            )}

            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo192.png" alt="Kairo Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                        <div className="app-name">Kairo</div>
                    </div>
                    <button className="close-sidebar-btn" aria-label="Close navigation" onClick={onClose}>×</button>
                </div>

                <div className="nav-section">
                    <button
                        type="button"
                        className="nav-item active"
                        style={{ marginBottom: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: 'pointer' }}
                        onClick={() => handleNavClick('journal')}
                    >
                        <span className="nav-icon">✏️</span>
                        <span style={{ fontWeight: 600 }}>New Entry</span>
                    </button>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Overview</div>
                    {navItems.map(item => (
                        <button
                            type="button"
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="nav-section">
                    <div className="nav-label">Journals</div>
                    {journals.map(item => (
                        <button
                            type="button"
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <button type="button" className="user-profile-mini" onClick={() => handleNavClick('settings')} title="Go to Settings">
                        <img src={user?.profile_picture_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="User" className="avatar" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>My Journal</div>
                        </div>
                    </button>
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Log Out</button>
                    </div>
                </div>
            </div>
        </>
    );
}
