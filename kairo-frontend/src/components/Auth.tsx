import { useState } from 'react';
import type { FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, BookOpenText, LogIn, UserPlus } from 'lucide-react';
import api from '../api';
import { getApiErrorDetail } from '../utils/errors';
import { Button } from './Button';

interface AuthProps {
    onLogin: (token: string) => void;
    googleOAuthEnabled: boolean;
}

export function Auth({ onLogin, googleOAuthEnabled }: AuthProps) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (isLoading) return;

        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError("Your passwords don't match. Please try again.");
                    return;
                }
                await api.register(email, password, username, fullName);
            }

            const data = await api.login(email, password);
            onLogin(data.access_token);
        } catch (err) {
            console.error('Authentication failed:', err);
            const fallback = isRegistering
                ? 'We could not create that account. The email or username may already be in use.'
                : 'We could not sign you in. Check your email and password, then try again.';
            setError(getApiErrorDetail(err, fallback));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = (): void => {
        setIsRegistering((current) => !current);
        setError('');
        setConfirmPassword('');
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-left" aria-hidden="true">
                <div className="auth-quote">
                    <h2>“Fill your paper with the breathings of your heart.”</h2>
                    <p>— William Wordsworth</p>
                </div>
            </div>

            <main className="auth-right">
                <div className="auth-box">
                    <div className="auth-brand">
                        <span className="brand-mark"><BookOpenText aria-hidden="true" /></span>
                        <span className="auth-brand-name">Kairo</span>
                    </div>

                    <div className="auth-header">
                        <h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
                        <p>
                            {isRegistering
                                ? 'Create a thoughtful space for the moments you want to remember.'
                                : 'Continue your journal and pick up where you left off.'}
                        </p>
                    </div>

                    {googleOAuthEnabled ? (
                        <div className="auth-google-wrap">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    try {
                                        setError('');
                                        setIsLoading(true);
                                        if (!credentialResponse.credential) {
                                            throw new Error('Google did not return a sign-in credential.');
                                        }
                                        const mode = isRegistering ? 'register' : 'login';
                                        const data = await api.googleLogin(credentialResponse.credential, mode);
                                        onLogin(data.access_token);
                                    } catch (err) {
                                        console.error('Google authentication failed:', err);
                                        const detail = getApiErrorDetail(err, 'Google sign-in failed. Please try again.');
                                        setError(
                                            detail.includes('Account already exists')
                                                ? 'That account already exists. Switch to Log in to continue.'
                                                : detail,
                                        );
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                onError={() => setError('Google sign-in failed. Please try again.')}
                                theme="filled_black"
                                shape="rectangular"
                                text={isRegistering ? 'signup_with' : 'signin_with'}
                                width="340"
                            />
                        </div>
                    ) : (
                        <p className="google-auth-notice" role="status">
                            Google sign-in is unavailable in this local copy. Email sign-in is ready below.
                        </p>
                    )}

                    <div className="auth-divider">
                        {isRegistering ? 'Or register with email' : 'Or continue with email'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {isRegistering && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="auth-full-name">Full name</label>
                                    <input
                                        id="auth-full-name"
                                        type="text"
                                        className="neo-input"
                                        placeholder="Jane Doe"
                                        autoComplete="name"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="auth-username">Username</label>
                                    <input
                                        id="auth-username"
                                        type="text"
                                        className="neo-input"
                                        placeholder="janedoe"
                                        autoComplete="username"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-email">Email address</label>
                            <input
                                id="auth-email"
                                type="email"
                                className="neo-input"
                                placeholder="name@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-password">Password</label>
                            <input
                                id="auth-password"
                                type="password"
                                className="neo-input"
                                placeholder="Enter your password"
                                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </div>

                        {isRegistering && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="auth-confirm-password">
                                    Confirm password
                                </label>
                                <input
                                    id="auth-confirm-password"
                                    type="password"
                                    className="neo-input"
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="auth-submit"
                            icon={isRegistering ? <UserPlus aria-hidden="true" /> : <LogIn aria-hidden="true" />}
                            isLoading={isLoading}
                        >
                            {isRegistering ? 'Create account' : 'Log in'}
                        </Button>
                    </form>

                    {error && (
                        <div className="form-message form-message-error" role="alert">
                            <AlertCircle aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    <p className="auth-switch">
                        {isRegistering ? 'Already have an account? ' : 'New to Kairo? '}
                        <button type="button" onClick={toggleMode}>
                            {isRegistering ? 'Log in' : 'Create an account'}
                        </button>
                    </p>
                </div>
            </main>
        </div>
    );
}
