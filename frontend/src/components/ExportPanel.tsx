import React from 'react';
import { useAppStore } from '../store/appStore';
import type { Node, Edge } from '../services/api';
import './ExportPanel.css';

const ExportPanel: React.FC = () => {
    const { nodes, edges, filters } = useAppStore();

    const exportToCSV = (data: any[], filename: string) => {
        if (data.length === 0) {
            alert('No data to export');
            return;
        }

        // Get all unique keys from all objects
        const allKeys = new Set<string>();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);
        const csvRows = [headers.join(',')];

        data.forEach(item => {
            const values = headers.map(header => {
                const value = item[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
                return String(value).replace(/"/g, '""');
            });
            csvRows.push(values.map(v => `"${v}"`).join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportNodes = () => {
        const nodeData = nodes.map(n => ({
            id: n.id,
            type: n.type,
            label: n.label || n.attributes?.name || '',
            ...n.attributes
        }));
        exportToCSV(nodeData, 'nodes');
    };

    const exportEdges = () => {
        const edgeData = edges.map(e => ({
            id: e.id,
            type: e.type,
            source: e.source || e.from_node,
            target: e.target || e.to_node,
            amount: e.attributes?.amount || e.metadata?.amount || '',
            date: e.attributes?.date || e.metadata?.date || '',
            status: e.attributes?.status || e.metadata?.status || '',
            ...e.attributes,
            ...e.metadata
        }));
        exportToCSV(edgeData, 'edges');
    };

    const exportVendorSpend = () => {
        const vendorMap: Record<string, { name: string; spend: number; invoiceCount: number }> = {};

        nodes.filter(n => n.type === 'Vendor').forEach(v => {
            vendorMap[v.id] = {
                name: v.attributes?.name || v.label || v.id,
                spend: 0,
                invoiceCount: 0
            };
        });

        edges.forEach(e => {
            if (e.type === 'Invoice' || e.type === 'Payment') {
                const amount = e.attributes?.amount || e.metadata?.amount || 0;
                const vendorId = e.source || e.from_node;

                if (vendorMap[vendorId]) {
                    vendorMap[vendorId].spend += amount;
                    vendorMap[vendorId].invoiceCount += 1;
                }
            }
        });

        const reportData = Object.entries(vendorMap)
            .map(([id, data]) => ({
                vendor_id: id,
                vendor_name: data.name,
                total_spend: data.spend,
                invoice_count: data.invoiceCount,
                average_invoice: data.invoiceCount > 0 ? data.spend / data.invoiceCount : 0
            }))
            .sort((a, b) => b.total_spend - a.total_spend);

        exportToCSV(reportData, 'vendor_spend_report');
    };

    const exportJobBudgets = () => {
        const jobData = nodes
            .filter(n => n.type === 'Job')
            .map(job => ({
                job_id: job.id,
                job_name: job.attributes?.name || job.label || job.id,
                job_type: job.attributes?.job_type || '',
                status: job.attributes?.status || '',
                original_budget: job.attributes?.original_budget || 0,
                current_budget: job.attributes?.current_budget || 0,
                budget_variance: (job.attributes?.current_budget || 0) - (job.attributes?.original_budget || 0),
                change_orders: job.attributes?.change_orders || 0,
                completion_percent: job.attributes?.completion || 0
            }));

        exportToCSV(jobData, 'job_budgets_report');
    };

    const exportFilteredData = () => {
        const hasFilters = filters.dateFrom || filters.dateTo;
        if (!hasFilters) {
            alert('No active filters. Apply filters first to export filtered data.');
            return;
        }

        const filteredEdges = edges.filter(e => {
            const edgeDate = e.attributes?.date || e.metadata?.date;
            if (!edgeDate) return false;

            const edgeTime = new Date(edgeDate).getTime();
            const fromTime = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
            const toTime = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;

            return edgeTime >= fromTime && edgeTime <= toTime;
        });

        const filteredData = filteredEdges.map(e => ({
            id: e.id,
            type: e.type,
            source: e.source || e.from_node,
            target: e.target || e.to_node,
            amount: e.attributes?.amount || e.metadata?.amount || '',
            date: e.attributes?.date || e.metadata?.date || '',
            status: e.attributes?.status || e.metadata?.status || ''
        }));

        exportToCSV(filteredData, 'filtered_data');
    };

    return (
        <div className="export-panel">
            <div className="export-header">
                <h2>📥 Export & Reports</h2>
                <p className="export-subtitle">Generate CSV exports and analytical reports</p>
            </div>

            <div className="export-sections">
                {/* Raw Data Exports */}
                <div className="export-section">
                    <h3>Raw Data</h3>
                    <p className="section-description">Export complete datasets in CSV format</p>

                    <div className="export-buttons">
                        <button className="export-btn" onClick={exportNodes}>
                            <span className="btn-icon">📦</span>
                            <div className="btn-content">
                                <div className="btn-title">Export Nodes</div>
                                <div className="btn-subtitle">{nodes.length} records</div>
                            </div>
                        </button>

                        <button className="export-btn" onClick={exportEdges}>
                            <span className="btn-icon">🔗</span>
                            <div className="btn-content">
                                <div className="btn-title">Export Edges</div>
                                <div className="btn-subtitle">{edges.length} transactions</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Analytical Reports */}
                <div className="export-section">
                    <h3>Analytical Reports</h3>
                    <p className="section-description">Pre-built reports with calculated metrics</p>

                    <div className="export-buttons">
                        <button className="export-btn" onClick={exportVendorSpend}>
                            <span className="btn-icon">💰</span>
                            <div className="btn-content">
                                <div className="btn-title">Vendor Spend Report</div>
                                <div className="btn-subtitle">Aggregated vendor analytics</div>
                            </div>
                        </button>

                        <button className="export-btn" onClick={exportJobBudgets}>
                            <span className="btn-icon">📊</span>
                            <div className="btn-content">
                                <div className="btn-title">Job Budget Report</div>
                                <div className="btn-subtitle">Budget vs. actuals analysis</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Filtered Data */}
                <div className="export-section">
                    <h3>Filtered Data</h3>
                    <p className="section-description">Export currently filtered view</p>

                    <div className="export-buttons">
                        <button
                            className={`export-btn ${!filters.dateFrom ? 'disabled' : ''}`}
                            onClick={exportFilteredData}
                            disabled={!filters.dateFrom}
                        >
                            <span className="btn-icon">🔍</span>
                            <div className="btn-content">
                                <div className="btn-title">Export Filtered Data</div>
                                <div className="btn-subtitle">
                                    {filters.dateFrom ? `${filters.dateFrom} to ${filters.dateTo}` : 'No filters active'}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Export Tips */}
                <div className="export-tips">
                    <h4>💡 Export Tips</h4>
                    <ul>
                        <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet app</li>
                        <li>Use filtered exports to generate month-specific reports</li>
                        <li>Vendor spend reports include average invoice amounts for benchmarking</li>
                        <li>Job budget reports show variance for change order analysis</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ExportPanel;
