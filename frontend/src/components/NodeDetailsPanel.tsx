import React from 'react';
import './NodeDetailsPanel.css';

interface NodeDetailsPanelProps {
    selectedItem: any; // Can be Node or Edge
    onClose?: () => void;
    onFocus?: (id: string) => void;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ selectedItem, onClose, onFocus }) => {
    if (!selectedItem) return null;

    const type = selectedItem.type;
    const label = selectedItem.label || selectedItem.name || selectedItem.id;
    const id = selectedItem.id;

    // Format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    // Render Metadata
    const renderMetadata = () => {
        const metadata = selectedItem.metadata || selectedItem.attributes || {};
        if (Object.keys(metadata).length === 0) return <div className="prop-value">No additional details</div>;

        return (
            <div className="property-grid">
                {Object.entries(metadata).map(([key, value]) => (
                    <React.Fragment key={key}>
                        <div className="prop-key">{key.replace(/_/g, ' ')}:</div>
                        <div className="prop-value">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="node-details-panel">
            <div className="details-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h2 className="details-title">{label}</h2>
                        <span className="details-type">{type}</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#95A5A6', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#7F8C8D', marginTop: '4px' }}>ID: {id}</div>
            </div>

            {/* Stats Section (if available) */}
            {selectedItem.stats && (
                <div className="details-stats">
                    <div className="stat-card">
                        <div className="stat-label">Total Inflow</div>
                        <div className="stat-value inflow">{formatCurrency(selectedItem.stats.total_inflow || 0)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Outflow</div>
                        <div className="stat-value outflow">{formatCurrency(selectedItem.stats.total_outflow || 0)}</div>
                    </div>
                </div>
            )}

            {/* Edge Specific Stats */}
            {selectedItem.amount && (
                <div className="details-stats">
                    <div className="stat-card">
                        <div className="stat-label">Amount</div>
                        <div className="stat-value">{formatCurrency(selectedItem.amount)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Status</div>
                        <div className="stat-value" style={{ color: '#F1C40F' }}>{selectedItem.metadata?.status || 'Pending'}</div>
                    </div>
                </div>
            )}

            {/* Properties Section */}
            <div className="details-section">
                <h3 className="section-title">PROPERTIES</h3>
                {renderMetadata()}
            </div>

            {/* Actions */}
            <div className="details-actions">
                {onFocus && (
                    <button className="action-btn primary" onClick={() => onFocus(id)}>
                        🔍 Focus on Graph
                    </button>
                )}
                <button className="action-btn">
                    📜 View History
                </button>
            </div>
        </div>
    );
};

export default NodeDetailsPanel;
