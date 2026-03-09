import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'STUDENT',
        department: '',
        year: '',
        skills: '',
        interests: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct payload matching backend schema
        const payload = {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
        };

        if (formData.role === 'FACULTY') {
            payload.faculty_profile = {
                department: formData.department,
                interests: formData.interests.split(',').map(s => s.trim())
            };
        } else {
            payload.student_profile = {
                department: formData.department,
                year: formData.year,
                skills: formData.skills.split(',').map(s => s.trim())
            };
        }

        try {
            const response = await fetch('http://localhost:8000/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                navigate('/login');
            } else {
                const err = await response.json();
                alert(err.detail || 'Registration failed');
            }
        } catch (error) {
            console.error(error);
            alert('Network error');
        }
    };

    return (
        <div className="container flex-center" style={{ minHeight: '90vh', padding: '2rem 0' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                <h2 className="text-center mb-4">Create Account</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input name="full_name" className="form-control" placeholder="John Doe" onChange={handleChange} required />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input name="email" type="email" className="form-control" placeholder="john@example.com" onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input name="password" type="password" className="form-control" placeholder="********" onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select name="role" className="form-control" onChange={handleChange} value={formData.role}>
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Department</label>
                        <input name="department" className="form-control" placeholder="Computer Science" onChange={handleChange} required />
                    </div>

                    {formData.role === 'FACULTY' ? (
                        <div className="form-group">
                            <label className="form-label">Interests (comma separated)</label>
                            <input name="interests" className="form-control" placeholder="AI, Data Science, Social Good" onChange={handleChange} />
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Year</label>
                                <input name="year" className="form-control" placeholder="3rd Year" onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Skills (comma separated)</label>
                                <input name="skills" className="form-control" placeholder="Python, React, ML" onChange={handleChange} />
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn btn-primary btn-block mt-4">
                        Register
                    </button>
                </form>
                <div className="text-center mt-4 text-muted">
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Login</Link>
                </div>
            </div>
        </div>
    );
}
