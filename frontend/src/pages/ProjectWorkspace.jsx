import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    createProjectTask,
    getProjectWorkspace,
    updateProjectTask,
    getProjectChat,
    postProjectChat
} from '../api/projects';
import { useAuth } from '../context/AuthContext';

const BOARD_COLUMNS = [
    { key: 'TODO', label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'DONE', label: 'Done' }
];

export default function ProjectWorkspace() {
    const { projectId } = useParams();
    const { user } = useAuth();
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatText, setChatText] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'TODO'
    });

    useEffect(() => {
        loadWorkspace();
    }, [projectId]);

    useEffect(() => {
        let intervalId;
        const loadChat = async () => {
            try {
                const data = await getProjectChat(projectId);
                setChatMessages(data);
            } catch {
                // Keep workspace usable even if chat polling fails transiently.
            }
        };
        loadChat();
        intervalId = setInterval(loadChat, 5000);
        return () => clearInterval(intervalId);
    }, [projectId]);

    const loadWorkspace = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getProjectWorkspace(projectId);
            setWorkspace(data);
        } catch (err) {
            setError(err.message || 'Failed to load project workspace');
        } finally {
            setLoading(false);
        }
    };

    const groupedTasks = useMemo(() => {
        const groups = { TODO: [], IN_PROGRESS: [], DONE: [] };
        (workspace?.tasks || []).forEach((task) => {
            if (groups[task.status]) groups[task.status].push(task);
        });
        return groups;
    }, [workspace]);

    const progress = useMemo(() => {
        const total = (workspace?.tasks || []).length;
        if (total === 0) return { done: 0, inProgress: 0 };
        const done = workspace.tasks.filter((t) => t.status === 'DONE').length;
        const inProgress = workspace.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
        return {
            done: Math.round((done / total) * 100),
            inProgress: Math.round((inProgress / total) * 100),
        };
    }, [workspace]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;
        setSaving(true);
        setError('');
        try {
            await createProjectTask(projectId, {
                title: newTask.title.trim(),
                description: newTask.description.trim(),
                status: newTask.status
            });
            setNewTask({ title: '', description: '', status: 'TODO' });
            await loadWorkspace();
        } catch (err) {
            setError(err.message || 'Failed to create task');
        } finally {
            setSaving(false);
        }
    };

    const handleMoveTask = async (taskId, status) => {
        setError('');
        try {
            const updatedTask = await updateProjectTask(projectId, taskId, { status });
            setWorkspace((prev) => ({
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            }));
        } catch (err) {
            setError(err.message || 'Failed to update task');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const message = chatText.trim();
        if (!message) return;
        setChatSending(true);
        try {
            const saved = await postProjectChat(projectId, { message });
            setChatMessages((prev) => [...prev, saved]);
            setChatText('');
        } catch (err) {
            setError(err.message || 'Failed to send message');
        } finally {
            setChatSending(false);
        }
    };

    if (loading) return <div className="text-center mt-8">Loading workspace...</div>;
    if (!workspace) return <div className="text-center mt-8">Workspace unavailable.</div>;

    return (
        <div className="container workspace-shell" style={{ paddingBottom: '2rem' }}>

            <div className="workspace-header card mb-4">
                <h2 style={{ marginBottom: '0.5rem' }}>{workspace.title}</h2>
                <p className="text-muted"><strong>Problem Statement:</strong> {workspace.problem_statement}</p>
                <div className="d-flex gap-4 mt-2" style={{ flexWrap: 'wrap' }}>
                    <span><strong>Faculty:</strong> {workspace.faculty_name || 'N/A'}</span>
                    <span><strong>Team:</strong> {workspace.team_name || 'Not assigned'}</span>
                    <span><strong>Project Status:</strong> {workspace.status}</span>
                </div>
                <div className="mt-2">
                    <strong>Team Members:</strong>{' '}
                    {workspace.member_names && workspace.member_names.length > 0
                        ? workspace.member_names.join(', ')
                        : 'No members yet'}
                </div>
            </div>

            <div className="card mb-4">
                <h3 style={{ fontSize: '1.2rem' }}>Project Progress</h3>
                <div className="progress-track mt-2">
                    <div className="progress-done" style={{ width: `${progress.done}%` }} />
                </div>
                <div className="d-flex gap-4 mt-2 text-muted">
                    <span>Done: {progress.done}%</span>
                    <span>In Progress: {progress.inProgress}%</span>
                    <span>Total Tasks: {(workspace.tasks || []).length}</span>
                </div>
            </div>

            <div className="card mb-4">
                <h3 style={{ fontSize: '1.2rem' }}>
                    {user?.role === 'FACULTY' ? 'Faculty Task Board (Jira-style)' : 'Team Task Board'}
                </h3>
                <form onSubmit={handleCreateTask} className="mt-2">
                    <div className="grid grid-cols-1 grid-cols-2 gap-2">
                        <div className="form-group">
                            <label className="form-label">Task Title</label>
                            <input
                                className="form-control"
                                value={newTask.title}
                                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="E.g., API integration"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Initial Status</label>
                            <select
                                className="form-control"
                                value={newTask.status}
                                onChange={(e) => setNewTask((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                {BOARD_COLUMNS.map((col) => (
                                    <option key={col.key} value={col.key}>{col.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            value={newTask.description}
                            onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Add acceptance criteria or notes"
                        />
                    </div>
                    <button className="btn btn-primary" disabled={saving}>
                        {saving ? 'Adding...' : 'Add To Do'}
                    </button>
                </form>
                {error && <div className="alert alert-error mt-2">{error}</div>}
            </div>

            <div className="workspace-board">
                {BOARD_COLUMNS.map((column) => (
                    <div className="workspace-col" key={column.key}>
                        <h4>{column.label}</h4>
                        {groupedTasks[column.key].length === 0 ? (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>No tasks</div>
                        ) : (
                            groupedTasks[column.key].map((task) => (
                                <div key={task.id} className="workspace-task">
                                    <div className="d-flex justify-between items-center">
                                        <strong>{task.title}</strong>
                                    </div>
                                    {task.description && (
                                        <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                            {task.description}
                                        </p>
                                    )}
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        Added by: {task.created_by || 'Unknown'}
                                    </div>
                                    <div className="mt-2">
                                        <select
                                            className="form-control"
                                            value={task.status}
                                            onChange={(e) => handleMoveTask(task.id, e.target.value)}
                                        >
                                            {BOARD_COLUMNS.map((col) => (
                                                <option key={col.key} value={col.key}>{col.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ))}
            </div>

            <button
                className="smart-chat-launcher"
                type="button"
                onClick={() => setIsChatOpen((prev) => !prev)}
                aria-label="Open team chat"
                style={{ position: 'fixed', top: '12px', right: '18px', left: 'auto', bottom: 'auto', zIndex: 1200 }}
            >
                Team Chat
            </button>

            <div
                className={`smart-chat-panel ${isChatOpen ? 'open' : ''}`}
                style={{ position: 'fixed', top: '78px', right: '18px', left: 'auto', bottom: 'auto', zIndex: 1190 }}
            >
                <div className="smart-chat-header">
                    <div className="smart-chat-avatar">
                        {(workspace.team_name || 'T').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <div className="smart-chat-title">{workspace.team_name || 'Team Chat'}</div>
                        <div className="smart-chat-subtitle">
                            <span className="smart-chat-dot" />
                            We reply immediately
                        </div>
                    </div>
                    <button
                        className="smart-chat-close"
                        type="button"
                        onClick={() => setIsChatOpen(false)}
                        aria-label="Close chat"
                    >
                        x
                    </button>
                </div>

                <div className="smart-chat-messages thin-scrollbar">
                    {chatMessages.length === 0 ? (
                        <div className="smart-chat-empty">No messages yet. Start the conversation.</div>
                    ) : (
                        chatMessages.map((m) => {
                            const isMine = String(m.sender_id || '') === String(user?.id || '');
                            return (
                                <div key={m.id} className={`smart-chat-row ${isMine ? 'mine' : ''}`}>
                                    <div className={`smart-chat-bubble ${isMine ? 'mine' : ''}`}>
                                        <div className="smart-chat-meta">
                                            <strong>{m.sender_name || 'Unknown'}</strong>{' '}
                                            <span className="text-muted">({m.sender_role || 'MEMBER'})</span>
                                        </div>
                                        <div>{m.message}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <form onSubmit={handleSendMessage} className="smart-chat-input-wrap">
                    <input
                        className="smart-chat-input"
                        placeholder="Type your message here..."
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                    />
                    <button className="smart-chat-send" disabled={chatSending || !chatText.trim()}>
                        {chatSending ? '...' : '>'}
                    </button>
                </form>
            </div>
        </div>
    );
}
