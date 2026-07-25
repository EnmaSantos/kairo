import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import api from '../api';
import type { User, UserUpdate } from '../types';
import { getApiErrorDetail } from '../utils/errors';
import { convertHeicToJpeg, isHeicImage } from '../utils/images';
import { NeoButton } from './NeoButton';

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
        password: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<SettingsMessage | null>(null);

    useEffect(() => {
        setFormData({
            full_name: user.full_name || '',
            username: user.username,
            email: user.email,
            password: ''
        });
    }, [user]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        // Only send fields that have values (except password which is optional)
        const updateData: UserUpdate = {};
        if (formData.full_name !== user.full_name) updateData.full_name = formData.full_name;
        if (formData.username !== user.username) updateData.username = formData.username;
        if (formData.email !== user.email) updateData.email = formData.email;
        if (formData.password) updateData.password = formData.password;

        if (Object.keys(updateData).length === 0) {
            setIsLoading(false);
            setIsEditing(false);
            return;
        }

        try {
            const token = window.localStorage.getItem('kairo_token');
            if (!token) {
                throw new Error('Your session has expired.');
            }
            const updatedUser = await api.updateUser(token, updateData);
            onUpdateUser(updatedUser);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
            setFormData(prev => ({ ...prev, password: '' })); // Clear password
        } catch (err) {
            console.error('Failed to update profile:', err);
            setMessage({ type: 'error', text: getApiErrorDetail(err, 'Failed to update profile.') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAvatar = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const seed = `${user.username}${randomSuffix}`;
            const newAvatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

            const token = window.localStorage.getItem('kairo_token');
            if (!token) {
                throw new Error('Your session has expired.');
            }
            const updatedUser = await api.updateUser(token, { profile_picture_url: newAvatarUrl });

            onUpdateUser(updatedUser);
            setMessage({ type: 'success', text: 'New avatar generated!' });
        } catch (err) {
            console.error('Failed to generate avatar:', err);
            setMessage({ type: 'error', text: 'Failed to generate avatar.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="settings-view" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Account Settings</h1>

            <div className="settings-card" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '2rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={user?.profile_picture_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                alt="Profile"
                                style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--accent-primary)', background: 'var(--bg-tertiary)' }}
                            />
                            {isEditing && (
                                <>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        style={{ display: 'none' }}
                                        accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                                        onChange={async (e) => {
                                            let file = e.target.files?.[0];
                                            if (!file) return;

                                            setIsLoading(true);
                                            try {
                                                if (isHeicImage(file)) {
                                                    file = await convertHeicToJpeg(file);
                                                }

                                                const token = window.localStorage.getItem('kairo_token');
                                                if (!token) {
                                                    throw new Error('Your session has expired.');
                                                }
                                                const uploadRes = await api.uploadImage(token, file);
                                                const updatedUser = await api.updateUser(token, { profile_picture_url: uploadRes.url });
                                                onUpdateUser(updatedUser);
                                                setMessage({ type: 'success', text: 'Avatar updated!' });
                                            } catch (err) {
                                                console.error('Avatar upload failed:', err);
                                                setMessage({ type: 'error', text: 'Failed to upload avatar.' });
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                    />
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                            type="button"
                                            title="Upload Photo"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.2rem'
                                            }}
                                        >
                                            📷
                                        </button>
                                        <button
                                            onClick={handleGenerateAvatar}
                                            type="button"
                                            title="Generate New Random Avatar"
                                            style={{
                                                background: 'var(--accent-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.2rem'
                                            }}
                                        >
                                            🎲
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{user?.full_name}</h2>
                            <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>@{user?.username}</p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            {!isEditing && (
                                <NeoButton text="Edit Profile" onClick={() => setIsEditing(true)} color="#2F81F7" />
                            )}
                        </div>
                    </div>

                    <hr style={{ borderColor: 'var(--border-color)', margin: 0 }} />

                    {message && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '6px',
                            background: message.type === 'success' ? 'rgba(35, 134, 54, 0.2)' : 'rgba(218, 54, 51, 0.2)',
                            color: message.type === 'success' ? '#238636' : '#DA3633',
                            textAlign: 'center'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label className="form-label">Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="full_name"
                                        className="neo-input"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div style={{ fontSize: '1.1rem', padding: '0.75rem 0' }}>{user?.full_name}</div>
                                )}
                            </div>

                            <div>
                                <label className="form-label">Username</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="username"
                                        className="neo-input"
                                        value={formData.username}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div style={{ fontSize: '1.1rem', padding: '0.75rem 0' }}>@{user?.username}</div>
                                )}
                            </div>

                            <div>
                                <label className="form-label">Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        className="neo-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div style={{ fontSize: '1.1rem', padding: '0.75rem 0' }}>{user?.email}</div>
                                )}
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="form-label">New Password (Optional)</label>
                                    <input
                                        type="password"
                                        name="password"
                                        className="neo-input"
                                        placeholder="Leave blank to keep current password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            {isEditing && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                    <NeoButton
                                        text={isLoading ? "Saving..." : "Save Changes"}
                                        color="#238636"
                                        type="submit"
                                        style={{ flex: 1 }}
                                    />
                                    <NeoButton
                                        text="Cancel"
                                        color="#6E7681"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setMessage(null);
                                            // Reset form
                                            setFormData({
                                                full_name: user.full_name || '',
                                                username: user.username || '',
                                                email: user.email || '',
                                                password: ''
                                            });
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
