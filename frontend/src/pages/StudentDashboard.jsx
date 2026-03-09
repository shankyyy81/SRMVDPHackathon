import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProjectsView } from '../api/projects';

export default function StudentDashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await getMyProjectsView();
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center mt-8">Loading assigned projects...</div>;

    return (
        <div>
            <h2>My Assigned Projects</h2>

            {projects.length === 0 ? (
                <div className="text-center mt-4 text-muted">
                    <p>You have not been assigned to any projects yet. Please contact a Faculty member.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 grid-cols-2 grid-cols-3 mt-4">
                    {projects.map(project => {
                        const projectId = project.id;
                        const facultyName = project.faculty_name || project.faculty_id || 'N/A';
                        const leaderName = project.leader_name || null;
                        const memberNames = project.member_names || [];
                        return (
                        <div
                            key={projectId}
                            className="card card-hover"
                            onClick={() => navigate(`/project/${projectId}/workspace`)}
                            style={{ borderLeft: '4px solid var(--primary)' }}
                        >
                            <h3>{project.title}</h3>
                            <p><strong>Faculty:</strong> {facultyName}</p>
                            <div className="mt-2 text-muted">
                                <strong>Role:</strong> Project Member
                            </div>
                            {(leaderName || memberNames.length > 0) && (
                                <div className="mt-2">
                                    <strong>Team:</strong>{' '}
                                    {leaderName ? `Leader: ${leaderName}` : 'Leader: N/A'}
                                    {memberNames.length > 0 && (
                                        <span className="ml-2">
                                            Members: {memberNames.join(', ')}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="mt-2">
                                <strong>SDGs:</strong>
                                <span className="ml-2">{Object.values(project.sdg_mapping).join(', ')}</span>
                            </div>
                            <div className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                Click to open workspace
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}
