import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyProjects, assignStudents, deleteProject } from '../api/projects';
import { getStudents } from '../api/users';

export default function FacultyDashboard() {
    const [projects, setProjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [assignments, setAssignments] = useState({});
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [projectsData, studentsData] = await Promise.all([
                getMyProjects(),
                getStudents()
            ]);
            setProjects(projectsData);
            setStudents(studentsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const activeProjectsCount = projects.filter(p => p.status !== 'Completed').length;

    if (loading) return <div className="text-center mt-8">Loading projects...</div>;

    const getAssignmentState = (projectId) => {
        if (assignments[projectId]) return assignments[projectId];
        return { team_name: '', leader_id: '', member_ids: [] };
    };

    const updateAssignmentState = (projectId, nextState) => {
        setAssignments((prev) => ({
            ...prev,
            [projectId]: { ...getAssignmentState(projectId), ...nextState }
        }));
    };

    const handleMembersChange = (projectId, event) => {
        const selected = Array.from(event.target.selectedOptions).map((o) => o.value);
        updateAssignmentState(projectId, { member_ids: selected });
    };

    const getProjectId = (project) => project.id || project._id;

    const handleAssign = async (projectId) => {
        setAssigning(true);
        setAssignError('');
        const state = getAssignmentState(projectId);

        try {
            const payload = {
                team_name: state.team_name || undefined,
                leader_id: state.leader_id || undefined,
                member_ids: state.member_ids || []
            };
            const updated = await assignStudents(projectId, payload);
            setProjects((prev) =>
                prev.map((p) => (getProjectId(p) === projectId ? updated : p))
            );
            setExpandedProjectId(null);
        } catch (err) {
            setAssignError(err.message || 'Failed to assign students');
        } finally {
            setAssigning(false);
        }
    };

    const handleDelete = async (projectId) => {
        const confirmed = window.confirm('Delete this project? This cannot be undone.');
        if (!confirmed) return;

        setDeletingId(projectId);
        setAssignError('');
        try {
            await deleteProject(projectId);
            setProjects((prev) => prev.filter((p) => getProjectId(p) !== projectId));
            if (expandedProjectId === projectId) setExpandedProjectId(null);
        } catch (err) {
            setAssignError(err.message || 'Failed to delete project');
        } finally {
            setDeletingId(null);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div>
            <div className="flex-center justify-between mb-4">
                <h2>My Projects ({activeProjectsCount}/5 Active)</h2>
                {activeProjectsCount < 5 ? (
                    <Link to="/project/new" className="btn btn-primary">
                        Create New Project
                    </Link>
                ) : (
                    <span className="text-muted">Max projects reached</span>
                )}
            </div>

            <motion.div
                className="grid grid-cols-1 grid-cols-2 grid-cols-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <AnimatePresence>
                    {projects.map(project => {
                        const projectId = getProjectId(project);
                        return (
                            <motion.div
                                variants={itemVariants}
                                layout
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                key={projectId}
                                className="card card-hover"
                                onClick={() => navigate(`/project/${projectId}/workspace`)}
                                style={{
                                    borderLeft: `4px solid ${project.status === 'Completed' ? 'var(--success)' : 'var(--primary)'}`
                                }}>
                                <h3>{project.title}</h3>
                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Status: {project.status}</p>
                                <div className="mt-2">
                                    <strong>SDGs:</strong>
                                    <div className="d-flex gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
                                        {Object.values(project.sdg_mapping).map((sdg, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '0.8rem',
                                                backgroundColor: 'var(--primary-light)',
                                                color: 'var(--primary-hover)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '12px'
                                            }}>
                                                {sdg}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/project/${projectId}/workspace`);
                                            }}
                                        >
                                            Open Workspace
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedProjectId(expandedProjectId === projectId ? null : projectId)
                                            }}
                                        >
                                            Assign Students
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(projectId);
                                            }}
                                            disabled={deletingId === projectId}
                                        >
                                            {deletingId === projectId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>

                                {expandedProjectId === projectId && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                        {assignError && (
                                            <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
                                                {assignError}
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label className="form-label">Team Name</label>
                                            <input
                                                className="form-control"
                                                value={getAssignmentState(projectId).team_name}
                                                onChange={(e) =>
                                                    updateAssignmentState(projectId, { team_name: e.target.value })
                                                }
                                                placeholder="E.g., Team Phoenix"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Team Leader</label>
                                            <select
                                                className="form-control"
                                                value={getAssignmentState(projectId).leader_id}
                                                onChange={(e) =>
                                                    updateAssignmentState(projectId, { leader_id: e.target.value })
                                                }
                                            >
                                                <option value="">Select a student</option>
                                                {students
                                                    .filter(s => !s.is_assigned || String(s.assigned_project_id) === String(projectId))
                                                    .map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.full_name} ({s.email})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Team Members</label>
                                            <select
                                                className="form-control"
                                                multiple
                                                value={getAssignmentState(projectId).member_ids}
                                                onChange={(e) => handleMembersChange(projectId, e)}
                                                style={{ minHeight: '120px' }}
                                            >
                                                {students
                                                    .filter(s => !s.is_assigned || String(s.assigned_project_id) === String(projectId))
                                                    .map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.full_name} ({s.email})
                                                        </option>
                                                    ))}
                                            </select>
                                            <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                                                Hold Ctrl (Windows) or Command (Mac) to select multiple students.
                                            </div>
                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            disabled={assigning || !getAssignmentState(projectId).leader_id}
                                            onClick={() => handleAssign(projectId)}
                                        >
                                            {assigning ? 'Assigning...' : 'Save Assignment'}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </motion.div>

            {projects.length === 0 && (
                <div className="text-center mt-8 text-muted">
                    <p>No projects found. Start by creating one!</p>
                </div>
            )}
        </div>
    );
}
