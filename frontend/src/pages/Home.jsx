import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="container">
            <div className="text-center" style={{ padding: '4rem 0' }}>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, var(--primary), #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Welcome to the SDG Project Manager
                </h1>
                <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 3rem' }}>
                    A generic, effective platform for managing academic social good projects aligned with United Nations Sustainable Development Goals.
                </p>
                <div className="flex-center gap-4">
                    <Link to="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Login to Dashboard
                    </Link>
                    <Link to="/register" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Create Account
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 grid-cols-3" style={{ marginTop: '4rem' }}>
                <div className="card text-center card-hover">
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</div>
                    <h3>SDG Alignment</h3>
                    <p className="text-muted">Automatically analyze and align your projects with relevant UN Sustainable Development Goals using AI.</p>
                </div>
                <div className="card text-center card-hover">
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤝</div>
                    <h3>Collaboration</h3>
                    <p className="text-muted">Connect faculty and students to work on meaningful social good projects efficiently.</p>
                </div>
                <div className="card text-center card-hover">
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📈</div>
                    <h3>Impact Tracking</h3>
                    <p className="text-muted">Monitor the progress and impact of your projects with a comprehensive dashboard.</p>
                </div>
            </div>
        </div>
    );
}
