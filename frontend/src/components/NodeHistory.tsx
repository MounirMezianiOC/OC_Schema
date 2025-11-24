import React, { useEffect, useState } from 'react';
import { fetchNodeHistory } from '../services/api';

interface NodeHistoryProps {
    nodeId: string;
}

const NodeHistory: React.FC<NodeHistoryProps> = ({ nodeId }) => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        fetchNodeHistory(nodeId).then(setLogs);
    }, [nodeId]);

    return (
        <div className="history-list">
            {logs.length === 0 && <div className="text-gray-500">No history available.</div>}
            {logs.map((log, idx) => (
                <div key={idx} className="history-item">
                    <div className="history-header">
                        <span className="action">{log.action}</span>
                        <span className="date">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="actor">By: {log.actor}</div>
                    <pre className="details-json">{JSON.stringify(JSON.parse(log.details), null, 2)}</pre>
                </div>
            ))}
        </div>
    );
};

export default NodeHistory;
