/**
 * DataSourceToggle Component
 * 
 * Toggles between Real data, Demo data, or Mixed mode.
 * Displays clear badge showing current data source.
 */

import { type FC } from 'react';
import { useAppStore } from '../store/appStore';
import type { DataSource } from '../store/appStore';
import './DataSourceToggle.css';

const DataSourceToggle: FC = () => {
    const { dataSource, setDataSource } = useAppStore();

    const options: Array<{ value: DataSource; label: string; description: string }> = [
        { value: 'real', label: 'Real Data', description: 'Live data from backend' },
        { value: 'demo', label: 'Demo Data', description: 'Synthetic demonstration data' },
        { value: 'mixed', label: 'Mixed', description: 'Both real and demo data' },
    ];

    return (
        <div className="data-source-toggle">
            <label className="data-source-label">Data Source:</label>
            <div className="data-source-buttons">
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={`data-source-btn ${dataSource === option.value ? 'active' : ''}`}
                        onClick={() => setDataSource(option.value)}
                        title={option.description}
                    >
                        {option.label}
                        {dataSource === option.value && option.value === 'demo' && (
                            <span className="demo-badge" title="Currently viewing demonstration data">
                                🎲
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DataSourceToggle;
