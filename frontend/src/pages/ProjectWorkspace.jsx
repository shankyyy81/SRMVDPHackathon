import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    createProjectTask,
    getProjectWorkspace,
    updateProjectTask,
    getProjectChat,
    postProjectChat,
    queryRagAnswer,
    listLiteratureDocuments,
    uploadLiteratureDocument,
    deleteLiteratureDocument,
    downloadLiteratureDocument,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
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
    const [ragQuery, setRagQuery] = useState('');
    const [ragAnswer, setRagAnswer] = useState('');
    const [ragLoading, setRagLoading] = useState(false);
    const [ragDocs, setRagDocs] = useState([]);
    const [ragUploadLoading, setRagUploadLoading] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'TODO'
    });
    // attachment upload state: { [taskId]: { uploading: bool, error: string } }
    const [attachState, setAttachState] = useState({});
    const fileInputRefs = useRef({});

    // Drag and Drop state
    const [dragOverCol, setDragOverCol] = useState(null);

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };
    const handleDragOver = (e, colKey) => {
        e.preventDefault();
        setDragOverCol(colKey);
    };
    const handleDragLeave = () => {
        setDragOverCol(null);
    };
    const handleDrop = (e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) {
            handleMoveTask(taskId, colKey);
        }
    };

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

    useEffect(() => {
        const loadLiteratureDocs = async () => {
            try {
                const docs = await listLiteratureDocuments(projectId);
                setRagDocs(docs);
            } catch {
                setRagDocs([]);
            }
        };
        loadLiteratureDocs();
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

    const handleUpload = async (taskId, file) => {
        if (!file) return;
        setAttachState((prev) => ({ ...prev, [taskId]: { uploading: true, error: '' } }));
        try {
            const newAtt = await uploadAttachment(projectId, taskId, file);
            setWorkspace((prev) => ({
                ...prev,
                tasks: prev.tasks.map((t) =>
                    t.id === taskId
                        ? { ...t, attachments: [...(t.attachments || []), newAtt] }
                        : t
                ),
            }));
            setAttachState((prev) => ({ ...prev, [taskId]: { uploading: false, error: '' } }));
        } catch (err) {
            setAttachState((prev) => ({ ...prev, [taskId]: { uploading: false, error: err.message } }));
        }
    };

    const handleDeleteAttachment = async (taskId, attachmentId) => {
        try {
            await deleteAttachment(projectId, taskId, attachmentId);
            setWorkspace((prev) => ({
                ...prev,
                tasks: prev.tasks.map((t) =>
                    t.id === taskId
                        ? { ...t, attachments: (t.attachments || []).filter((a) => a.id !== attachmentId) }
                        : t
                ),
            }));
        } catch (err) {
            setError(err.message || 'Failed to delete attachment');
        }
    };

    const formatBytes = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    const handleAskRag = async (e) => {
        e.preventDefault();
        const question = ragQuery.trim();
        if (!question) return;

        setRagLoading(true);
        setRagAnswer('');
        setError('');
        try {
            const answer = await queryRagAnswer(projectId, question, 4);
            setRagAnswer(answer);
        } catch (err) {
            setError(err.message || 'Failed to get AI answer');
        } finally {
            setRagLoading(false);
        }
    };

    const handleLiteratureUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setRagUploadLoading(true);
        setError('');
        try {
            await uploadLiteratureDocument(projectId, file);
            const docs = await listLiteratureDocuments(projectId);
            setRagDocs(docs);
        } catch (err) {
            setError(err.message || 'Failed to upload literature document');
        } finally {
            setRagUploadLoading(false);
        }
    };

    const handleDeleteLiteratureDoc = async (documentId) => {
        try {
            await deleteLiteratureDocument(projectId, documentId);
            setRagDocs((prev) => prev.filter((d) => d.id !== documentId));
        } catch (err) {
            setError(err.message || 'Failed to delete literature document');
        }
    };

    if (loading) return <div className="text-center mt-8">Loading workspace...</div>;
    if (!workspace) return <div className="text-center mt-8">Workspace unavailable.</div>;

    return (
        <motion.div
            className="container workspace-shell"
            style={{ paddingBottom: '2rem' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
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
                <h3 style={{ fontSize: '1.2rem' }}>AI Assistant</h3>
                <div className="mb-3">
                    <label className="form-label">Upload literature file (PDF/TXT/MD)</label>
                    <input
                        type="file"
                        className="form-control"
                        accept=".pdf,.txt,.md"
                        onChange={handleLiteratureUpload}
                        disabled={ragUploadLoading}
                    />
                    <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        {ragUploadLoading ? 'Indexing document...' : `Indexed documents: ${ragDocs.length}`}
                    </div>
                    {ragDocs.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                            {ragDocs.map((d) => (
                                <div key={d.id} className="d-flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{d.filename}</span>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                        onClick={() => downloadLiteratureDocument(projectId, d.id, d.filename)}
                                    >
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#dc3545', color: '#fff', border: 'none' }}
                                        onClick={() => handleDeleteLiteratureDoc(d.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <form onSubmit={handleAskRag} className="mt-2">
                    <div className="form-group">
                        <label className="form-label">Ask for literature survey insights</label>
                        <input
                            className="form-control"
                            value={ragQuery}
                            onChange={(e) => setRagQuery(e.target.value)}
                            placeholder="What methods are commonly used for this problem?"
                        />
                    </div>
                    <button className="btn btn-primary" disabled={ragLoading || !ragQuery.trim() || ragDocs.length === 0}>
                        {ragLoading ? 'Generating...' : 'Get Answer'}
                    </button>
                </form>
                {ragAnswer && (
                    <div className="mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                        {ragAnswer}
                    </div>
                )}
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
                    <div
                        className={`workspace-col ${dragOverCol === column.key ? 'drag-over' : ''}`}
                        key={column.key}
                        onDragOver={(e) => handleDragOver(e, column.key)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.key)}
                    >
                        <h4>{column.label}</h4>
                        {groupedTasks[column.key].length === 0 ? (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>No tasks</div>
                        ) : (
                            <AnimatePresence>
                                {groupedTasks[column.key].map((task) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        key={task.id}
                                        className="workspace-task"
                                        draggable="true"
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                    >
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

                                        {/* ── Attachments ── */}
                                        <div className="task-attachments">
                                            {(task.attachments || []).length > 0 && (
                                                <ul className="attachment-list">
                                                    {(task.attachments || []).map((att) => (
                                                        <li key={att.id} className="attachment-item">
                                                            <span className="attachment-icon">📄</span>
                                                            <span
                                                                className="attachment-name"
                                                                title={att.original_name}
                                                            >
                                                                {att.original_name.length > 24
                                                                    ? att.original_name.slice(0, 22) + '…'
                                                                    : att.original_name}
                                                            </span>
                                                            <span className="attachment-size">
                                                                {formatBytes(att.size_bytes)}
                                                            </span>
                                                            <button
                                                                className="attachment-btn download"
                                                                title="Download"
                                                                onClick={() =>
                                                                    downloadAttachment(
                                                                        projectId, task.id,
                                                                        att.id, att.original_name
                                                                    )
                                                                }
                                                            >⬇</button>
                                                            <button
                                                                className="attachment-btn delete"
                                                                title="Delete"
                                                                onClick={() =>
                                                                    handleDeleteAttachment(task.id, att.id)
                                                                }
                                                            >🗑</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {/* Hidden file input */}
                                            <input
                                                type="file"
                                                style={{ display: 'none' }}
                                                ref={(el) => { fileInputRefs.current[task.id] = el; }}
                                                onChange={(e) => {
                                                    handleUpload(task.id, e.target.files[0]);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <button
                                                className="attachment-upload-btn"
                                                type="button"
                                                disabled={attachState[task.id]?.uploading}
                                                onClick={() => fileInputRefs.current[task.id]?.click()}
                                            >
                                                {attachState[task.id]?.uploading ? '⏳ Uploading…' : '📎 Attach file'}
                                            </button>
                                            {attachState[task.id]?.error && (
                                                <div style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px' }}>
                                                    {attachState[task.id].error}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
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
        </motion.div>
    );
}
