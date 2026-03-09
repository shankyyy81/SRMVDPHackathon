import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <div className="container nav-container">
                <Link to="/" className="nav-brand">
                    SDG Project Manager
                </Link>
                <div className="nav-links">
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
