import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';

function Auth({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError("Passwords don't match!");
                    setIsLoading(false);
                    return;
                }
                await api.register(email, password, username, fullName);
                // Auto login after register
                const data = await api.login(email, password);
                onLogin(data.access_token);
            } else {
                const data = await api.login(email, password);
                onLogin(data.access_token);
            }
        } catch (err) {
            console.error('Auth failed:', err);
            setError(isRegistering
                ? 'Registration failed. Username or Email might be taken.'
                : 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            {/* Left Side - Image & Quote */}
            <div className="auth-left">
                <div className="auth-quote">
                    <h2>"Fill your paper with the breathings of your heart."</h2>
                    <p>— William Wordsworth</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="auth-right">
                <div className="auth-box">
                    <div className="auth-header">
                        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)' }}>Kairo</h1>
                        <h2 style={{ fontSize: '1.5rem', marginTop: 0 }}>{isRegistering ? 'Create your account' : 'Welcome back'}</h2>
                        <p>{isRegistering ? 'Join Kairo and start your journaling journey today.' : 'Ready to write? Log in to continue your journey.'}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <GoogleLogin
                            onSuccess={async (credentialResponse) => {
                                try {
                                    setIsLoading(true);
                                    const mode = isRegistering ? 'register' : 'login';
                                    const data = await api.googleLogin(credentialResponse.credential, mode);
                                    onLogin(data.access_token);
                                } catch (err) {
                                    console.error('Google Login Failed', err);
                                    if (err.response && err.response.data && err.response.data.detail && err.response.data.detail.includes("Account already exists")) {
                                        setError("Account already exists. Please switch to Log In.");
                                    } else {
                                        setError('Google Login failed. Please try again.');
                                    }
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            onError={() => {
                                console.log('Login Failed');
                                setError('Google Login failed.');
                            }}
                            theme="filled_black"
                            shape="pill"
                            width="320"
                        />
                    </div>

                    <div className="auth-divider">OR LOG IN WITH EMAIL</div>

                    <form onSubmit={handleSubmit}>
                        {isRegistering && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="neo-input"
                                        placeholder="Jane Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="neo-input"
                                        placeholder="@janedoe"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="neo-input"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                                {!isRegistering && <button type="button" style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}>Forgot Password?</button>}
                            </div>
                            <input
                                type="password"
                                className="neo-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {isRegistering && (
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="neo-input"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Log In')}
                        </button>
                    </form>

                    {error && <div className="error-message">{error}</div>}

                    <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {isRegistering ? "Already have an account? " : "Don't have an account? "}
                        <button
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                        >
                            {isRegistering ? 'Log In' : 'Register'}
                        </button>
                    </div>



                </div>
            </div>
        </div>
    );
}

export default Auth;
