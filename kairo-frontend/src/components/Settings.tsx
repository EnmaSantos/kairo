import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Camera, CheckCircle2, Pencil, Save, Shuffle, X } from 'lucide-react';
import api from '../api';
import type { User, UserUpdate } from '../types';
import { getApiErrorDetail } from '../utils/errors';
import { convertHeicToJpeg, isHeicImage } from '../utils/images';
import { Button } from './Button';
import { PageHeader } from './PageHeader';

interface SettingsProps {
    user: User;
    onUpdateUser: (user: User) => void;
}

interface SettingsFormData {
    full_name: string;
    username: string;
    email: string;
    password: string;
}

interface SettingsMessage {
    type: 'success' | 'error';
    text: string;
}

export function Settings({ user, onUpdateUser }: SettingsProps) {
    const [formData, setFormData] = useState<SettingsFormData>({
        full_name: '',
        username: '',
        email: '',
        password: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<SettingsMessage | null>(null);

    useEffect(() => {
        setFormData({
            full_name: user.full_name || '',
            username: user.username,
            email: user.email,
            password: '',
        });
    }, [user]);

    const getToken = (): string => {
        const activeToken = window.localStorage.getItem('kairo_token');
        if (!activeToken) throw new Error('Your session has expired.');
        return activeToken;
    };

    const resetForm = (): void => {
        setFormData({
            full_name: user.full_name || '',
            username: user.username,
            email: user.email,
            password: '',
        });
        setIsEditing(false);
        setMessage(null);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (isLoading) return;

        const updateData: UserUpdate = {};
        if (formData.full_name !== (user.full_name || '')) updateData.full_name = formData.full_name.trim();
        if (formData.username !== user.username) updateData.username = formData.username.trim();
        if (formData.email !== user.email) updateData.email = formData.email.trim();
        if (formData.password) updateData.password = formData.password;

        if (Object.keys(updateData).length === 0) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            const updatedUser = await api.updateUser(getToken(), updateData);
            onUpdateUser(updatedUser);
            setMessage({ type: 'success', text: 'Your profile has been updated.' });
            setIsEditing(false);
            setFormData((current) => ({ ...current, password: '' }));
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: getApiErrorDetail(error, 'Your profile could not be updated.') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAvatar = async (): Promise<void> => {
        if (isLoading) return;
        setIsLoading(true);
        setMessage(null);
        try {
            const seed = `${user.username}-${Math.floor(1000 + Math.random() * 9000)}`;
            const profilePictureUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
            const updatedUser = await api.updateUser(getToken(), { profile_picture_url: profilePictureUrl });
            onUpdateUser(updatedUser);
            setMessage({ type: 'success', text: 'A new avatar has been generated.' });
        } catch (error) {
            console.error('Failed to generate avatar:', error);
            setMessage({ type: 'error', text: 'A new avatar could not be generated.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = async (file: File): Promise<void> => {
        if (isLoading) return;
        setIsLoading(true);
        setMessage(null);
        try {
            const convertedFile = isHeicImage(file) ? await convertHeicToJpeg(file) : file;
            const upload = await api.uploadImage(getToken(), convertedFile);
            const updatedUser = await api.updateUser(getToken(), { profile_picture_url: upload.url });
            onUpdateUser(updatedUser);
            setMessage({ type: 'success', text: 'Your profile photo has been updated.' });
        } catch (error) {
            console.error('Avatar upload failed:', error);
            setMessage({ type: 'error', text: 'Your profile photo could not be uploaded.' });
        } finally {
            setIsLoading(false);
        }
    };

    const displayName = user.full_name?.trim() || user.username;
    const avatarUrl = user.profile_picture_url
        || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

    return (
        <div className="settings-view">
            <div className="settings-shell">
                <PageHeader
                    eyebrow="Account"
                    title="Profile settings"
                    description="Keep your personal details and journal identity up to date."
                />

                <section className="settings-card surface-card">
                    <div className="profile-summary">
                        <div className="profile-avatar-wrap">
                            <img src={avatarUrl} alt={`${displayName}'s profile`} className="profile-avatar" />
                            {isEditing && (
                                <div className="profile-avatar-actions">
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        className="sr-only"
                                        accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) void handleAvatarUpload(file);
                                            event.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="icon-button"
                                        aria-label="Upload profile photo"
                                        title="Upload profile photo"
                                        disabled={isLoading}
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                    >
                                        <Camera aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-button"
                                        aria-label="Generate a new avatar"
                                        title="Generate a new avatar"
                                        disabled={isLoading}
                                        onClick={() => void handleGenerateAvatar()}
                                    >
                                        <Shuffle aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="profile-copy">
                            <h2>{displayName}</h2>
                            <p>@{user.username}</p>
                        </div>
                        {!isEditing && (
                            <Button icon={<Pencil aria-hidden="true" />} onClick={() => {
                                setIsEditing(true);
                                setMessage(null);
                            }}>
                                Edit profile
                            </Button>
                        )}
                    </div>

                    {message && (
                        <div
                            className={`form-message form-message-${message.type}`}
                            role={message.type === 'error' ? 'alert' : 'status'}
                        >
                            {message.type === 'success'
                                ? <CheckCircle2 aria-hidden="true" />
                                : <AlertCircle aria-hidden="true" />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="settings-form">
                        <div className="settings-field">
                            <label className="form-label" htmlFor="settings-full-name">Full name</label>
                            {isEditing ? (
                                <input
                                    id="settings-full-name"
                                    type="text"
                                    name="full_name"
                                    className="neo-input"
                                    autoComplete="name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                />
                            ) : (
                                <div className="settings-value">{user.full_name || 'Not set'}</div>
                            )}
                        </div>

                        <div className="settings-field">
                            <label className="form-label" htmlFor="settings-username">Username</label>
                            {isEditing ? (
                                <input
                                    id="settings-username"
                                    type="text"
                                    name="username"
                                    className="neo-input"
                                    autoComplete="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            ) : (
                                <div className="settings-value">@{user.username}</div>
                            )}
                        </div>

                        <div className="settings-field">
                            <label className="form-label" htmlFor="settings-email">Email address</label>
                            {isEditing ? (
                                <input
                                    id="settings-email"
                                    type="email"
                                    name="email"
                                    className="neo-input"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            ) : (
                                <div className="settings-value">{user.email}</div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="settings-field">
                                <label className="form-label" htmlFor="settings-password">New password</label>
                                <div>
                                    <input
                                        id="settings-password"
                                        type="password"
                                        name="password"
                                        className="neo-input"
                                        placeholder="Leave blank to keep your current password"
                                        autoComplete="new-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <p className="form-hint">Only enter a value if you want to change your password.</p>
                                </div>
                            </div>
                        )}

                        {isEditing && (
                            <div className="settings-actions">
                                <Button type="button" icon={<X aria-hidden="true" />} onClick={resetForm}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    icon={<Save aria-hidden="true" />}
                                    isLoading={isLoading}
                                >
                                    Save changes
                                </Button>
                            </div>
                        )}
                    </form>
                </section>
            </div>
        </div>
    );
}
