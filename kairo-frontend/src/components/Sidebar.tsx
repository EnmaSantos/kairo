import type { LucideIcon } from 'lucide-react';
import {
    BookOpenText,
    CalendarDays,
    Clock3,
    FilePlus2,
    Images,
    LayoutDashboard,
    LibraryBig,
    LogOut,
    MapPinned,
    Settings,
    X,
} from 'lucide-react';
import type { AppView, User } from '../types';
import { Button } from './Button';

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
    icon: LucideIcon;
}

const overviewItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'photos', label: 'Photos', icon: Images },
    { id: 'map', label: 'Map', icon: MapPinned },
];

export function Sidebar({ currentView, onChangeView, onLogout, user, isOpen, onClose }: SidebarProps) {
    const handleNavClick = (viewId: AppView): void => {
        onChangeView(viewId);
        onClose();
    };

    const renderNavigationItem = (item: NavigationItem) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
            <button
                type="button"
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavClick(item.id)}
            >
                <span className="nav-icon"><Icon aria-hidden="true" /></span>
                <span>{item.label}</span>
            </button>
        );
    };

    const displayName = user?.full_name?.trim() || user?.username || 'My journal';
    const avatarUrl = user?.profile_picture_url
        || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={onClose}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Primary navigation">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <span className="brand-mark"><BookOpenText aria-hidden="true" /></span>
                        <span className="app-name">Kairo</span>
                    </div>
                    <button
                        type="button"
                        className="icon-button close-sidebar-btn"
                        aria-label="Close navigation"
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </div>

                <Button
                    variant="primary"
                    className="new-entry-button"
                    icon={<FilePlus2 aria-hidden="true" />}
                    onClick={() => handleNavClick('journal')}
                >
                    New entry
                </Button>

                <nav>
                    <div className="nav-section">
                        <div className="nav-label">Overview</div>
                        {overviewItems.map(renderNavigationItem)}
                    </div>

                    <div className="nav-section">
                        <div className="nav-label">Journal</div>
                        {renderNavigationItem({ id: 'library', label: 'Notebooks', icon: LibraryBig })}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button
                        type="button"
                        className="user-profile-mini"
                        onClick={() => handleNavClick('settings')}
                        aria-current={currentView === 'settings' ? 'page' : undefined}
                    >
                        <img src={avatarUrl} alt="" className="avatar" />
                        <span className="user-profile-copy">
                            <span className="user-profile-name">{displayName}</span>
                            <span className="user-profile-email">{user?.email || 'Account settings'}</span>
                        </span>
                        <Settings size={16} aria-hidden="true" />
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="sidebar-logout"
                        icon={<LogOut aria-hidden="true" />}
                        onClick={onLogout}
                    >
                        Log out
                    </Button>
                </div>
            </aside>
        </>
    );
}
