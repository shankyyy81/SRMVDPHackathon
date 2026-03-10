import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, analyzeSDG } from '../api/projects';

export default function CreateProject() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        problem_statement: '',
        sdg_mapping: {}
    });

    const [analysisResults, setAnalysisResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ===============================
    // ANALYZE SDG
    // ===============================
    const handleAnalyze = async () => {
        setLoading(true);
        setError('');

        try {
            const data = await analyzeSDG(formData.problem_statement);

            console.log("API Response:", data);

            // ✅ FIXED FIELD NAME
            setAnalysisResults(data.most_suitable_sdgs || []);

            setStep(2);
        } catch (err) {
            setError('Analysis failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ===============================
    // CONFIRM SDG
    // ===============================
    const handleConfirm = async (selectedSuggestion) => {
        const finalData = {
            title: formData.title,
            problem_statement: formData.problem_statement,
            sdg_mapping: {
                [selectedSuggestion.sdg]: selectedSuggestion.sdg
            },
            ml_confidence_scores: {
                [selectedSuggestion.sdg]: selectedSuggestion.confidence
            }
        };

        try {
            await createProject(finalData);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to create project');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>

                <h2 className="mb-4">Create New Project</h2>

                {error && <div className="alert alert-error">{error}</div>}

                {/* ================= STEP 1 ================= */}
                {step === 1 && (
                    <div className="flex-col gap-4">

                        <div className="form-group">
                            <label className="form-label">Project Title</label>
                            <input
                                className="form-control"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                                placeholder="E.g., Solar Powered Water Purification"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Problem Statement</label>
                            <textarea
                                className="form-control"
                                value={formData.problem_statement}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        problem_statement: e.target.value
                                    })
                                }
                                rows={6}
                                placeholder="Describe the problem you are solving..."
                            />
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!formData.title || !formData.problem_statement || loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Analyzing with SDG-BERT...' : 'Analyze for SDG Alignment'}
                        </button>

                    </div>
                )}

                {/* ================= STEP 2 ================= */}
                {step === 2 && (
                    <div>

                        <h3>AI Analysis Results</h3>
                        <p className="text-muted">
                            The system suggests the following SDGs based on your problem statement:
                        </p>

                        <div className="flex-col gap-4 mt-4">

                            {/* ✅ SAFE RENDER */}
                            {analysisResults.length === 0 && (
                                <div>No suitable SDGs found.</div>
                            )}

                            {analysisResults.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="card"
                                    style={{
                                        padding: '1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >

                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                            {suggestion.sdg}
                                        </div>

                                        {/* ✅ FIXED CONFIDENCE */}
                                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                            Confidence: {suggestion.confidence.toFixed(1)}%
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleConfirm(suggestion)}
                                        className="btn btn-success"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                    >
                                        Confirm & Create
                                    </button>

                                </div>
                            ))}

                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="btn btn-secondary mt-4"
                        >
                            Back to Edit
                        </button>

                    </div>
                )}
            </div>
        </div>
    );
}
