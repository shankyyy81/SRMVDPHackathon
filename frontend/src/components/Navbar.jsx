import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <div className="container nav-container">
                <Link to="/" className="nav-brand">
                    SDG Project Manager
                </Link>
                <div className="nav-links">
                    <button
                        onClick={toggleTheme}
                        className="btn btn-secondary d-flex items-center gap-2"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderRadius: '20px' }}
                        title="Toggle Dark/Light Mode"
                    >
                        {theme === 'light' ? (
                            <>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                <span>Dark Mode</span>
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                <span>Light Mode</span>
                            </>
                        )}
                    </button>
                    {user ? (
                        <>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {user.full_name} <span style={{ opacity: 0.5 }}>|</span> {user.role}
                            </span>
                            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                                Dashboard
                            </Link>
                            {user.role === 'FACULTY' && (
                                <Link to="/project/new" className={`nav-link ${isActive('/project/new')}`}>
                                    Create Project
                                </Link>
                            )}
                            <button
                                onClick={logout}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={`nav-link ${isActive('/login')}`}>
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary">
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
