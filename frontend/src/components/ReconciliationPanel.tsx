import React, { useEffect, useState } from 'react';
import { fetchReconciliationQueue, resolveTask } from '../services/api';
import type { ReconciliationTask } from '../services/api';
import './ReconciliationPanel.css';

const ReconciliationPanel: React.FC = () => {
    const [tasks, setTasks] = useState<ReconciliationTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<number | null>(null);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const t = await fetchReconciliationQueue();
            setTasks(t);
        } catch (error) {
            console.error('Failed to load reconciliation tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
        const interval = setInterval(loadTasks, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleResolve = async (taskId: number, action: 'merge' | 'create_new') => {
        try {
            await resolveTask(taskId, action);
            setSelectedTask(null);
            await loadTasks(); // Refresh
        } catch (error) {
            console.error('Failed to resolve task:', error);
        }
    };

    const getMatchColor = (score: number) => {
        if (score >= 90) return '#27AE60'; // Green - High confidence
        if (score >= 75) return '#F39C12'; // Orange - Medium confidence
        return '#E74C3C'; // Red - Low confidence
    };

    const getMatchLabel = (score: number) => {
        if (score >= 90) return 'High Confidence';
        if (score >= 75) return 'Medium Confidence';
        return 'Low Confidence';
    };

    if (loading && tasks.length === 0) {
        return (
            <div className="recon-panel">
                <div className="recon-loading">
                    <div className="spinner"></div>
                    <p>Loading reconciliation tasks...</p>
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="recon-panel">
                <div className="recon-empty">
                    <div className="empty-icon">✓</div>
                    <h3>All Clear!</h3>
                    <p>No pending reconciliation tasks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="recon-panel">
            <div className="recon-header">
                <h2>Reconciliation Queue</h2>
                <div className="recon-badge">{tasks.length} Task{tasks.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="task-list">
                {tasks.map(task => {
                    const isExpanded = selectedTask === task.task_id;
                    const matchScore = task.task_data.score;
                    const matchColor = getMatchColor(matchScore);

                    return (
                        <div
                            key={task.task_id}
                            className={`task-card ${isExpanded ? 'expanded' : ''}`}
                        >
                            {/* Task Header */}
                            <div
                                className="task-header"
                                onClick={() => setSelectedTask(isExpanded ? null : task.task_id)}
                            >
                                <div className="task-info">
                                    <div className="vendor-name">
                                        <span className="label">Incoming:</span>
                                        <strong>{task.task_data.source_record.vendor_name}</strong>
                                    </div>
                                    <div className="match-info">
                                        <span className="match-label">Potential Match:</span>
                                        <span className="match-id">{task.task_data.candidate_id}</span>
                                    </div>
                                </div>

                                <div className="task-score">
                                    <div
                                        className="score-circle"
                                        style={{
                                            background: `conic-gradient(${matchColor} ${matchScore}%, #2C3E50 0)`
                                        }}
                                    >
                                        <div className="score-inner">
                                            <span className="score-value">{Math.round(matchScore)}</span>
                                            <span className="score-percent">%</span>
                                        </div>
                                    </div>
                                    <div className="confidence-label" style={{ color: matchColor }}>
                                        {getMatchLabel(matchScore)}
                                    </div>
                                </div>

                                <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="task-details">
                                    <div className="comparison-grid">
                                        <div className="comparison-col">
                                            <h4>Incoming Record</h4>
                                            <div className="detail-item">
                                                <span className="detail-label">Vendor Name:</span>
                                                <span className="detail-value">{task.task_data.source_record.vendor_name}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Amount:</span>
                                                <span className="detail-value amount">
                                                    ${(task.task_data.source_record.amount || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Invoice ID:</span>
                                                <span className="detail-value">{task.task_data.source_record.invoice_id}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Source:</span>
                                                <span className="detail-value source-badge">
                                                    {task.task_data.source_record.source || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="comparison-divider">
                                            <div className="arrow">⟷</div>
                                            <div className="score-tag" style={{ backgroundColor: matchColor }}>
                                                {Math.round(matchScore)}% Match
                                            </div>
                                        </div>

                                        <div className="comparison-col">
                                            <h4>Existing Vendor</h4>
                                            <div className="detail-item">
                                                <span className="detail-label">Vendor ID:</span>
                                                <span className="detail-value">{task.task_data.candidate_id}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Type:</span>
                                                <span className="detail-value">Vendor</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Historical Invoices:</span>
                                                <span className="detail-value">~</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="task-actions">
                                        <button
                                            onClick={() => handleResolve(task.task_id, 'merge')}
                                            className="btn-action btn-merge"
                                        >
                                            <span className="btn-icon">✓</span>
                                            Accept Match & Merge
                                        </button>
                                        <button
                                            onClick={() => handleResolve(task.task_id, 'create_new')}
                                            className="btn-action btn-new"
                                        >
                                            <span className="btn-icon">+</span>
                                            Create New Vendor
                                        </button>
                                    </div>

                                    <div className="task-footer">
                                        <span className="task-timestamp">
                                            Task ID: {task.task_id} • Created: {new Date(task.created_at || Date.now()).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReconciliationPanel;
