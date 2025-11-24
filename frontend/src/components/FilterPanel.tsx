import React, { useState } from 'react';

interface FilterPanelProps {
    onApplyFilters: (filters: any) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApplyFilters }) => {
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    const handleApply = () => {
        onApplyFilters({
            date_start: dateStart || undefined,
            date_end: dateEnd || undefined,
            min_amount: minAmount ? parseFloat(minAmount) : undefined,
            max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
        });
    };

    const handleClear = () => {
        setDateStart('');
        setDateEnd('');
        setMinAmount('');
        setMaxAmount('');
        onApplyFilters({});
    };

    return (
        <div className="filter-panel">
            <h3>Filters</h3>
            <div className="filter-group">
                <label>Date Range</label>
                <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    placeholder="Start Date"
                />
                <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    placeholder="End Date"
                />
            </div>
            <div className="filter-group">
                <label>Amount Range ($)</label>
                <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="Min"
                />
                <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Max"
                />
            </div>
            <div className="filter-actions">
                <button onClick={handleApply} className="btn-apply">Apply</button>
                <button onClick={handleClear} className="btn-clear">Clear</button>
            </div>
        </div>
    );
};

export default FilterPanel;
