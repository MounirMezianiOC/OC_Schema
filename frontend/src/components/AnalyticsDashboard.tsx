import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AnalyticsDashboard.css';

const AnalyticsDashboard: React.FC = () => {
    const { nodes, edges } = useAppStore();

    // Vendor Spend Analysis
    const vendorSpendData = useMemo(() => {
        const vendorSpend: Record<string, number> = {};

        // Get vendor names
        const vendorMap: Record<string, string> = {};
        nodes.filter(n => n.type === 'Vendor').forEach(v => {
            vendorMap[v.id] = v.attributes?.name || v.label || v.id;
        });

        // Aggregate spend per vendor
        edges.forEach(e => {
            if (e.type === 'Invoice' || e.type === 'Payment') {
                const amount = e.attributes?.amount || e.metadata?.amount || 0;
                const vendorId = e.source || e.from_node;

                if (vendorMap[vendorId]) {
                    const vendorName = vendorMap[vendorId];
                    vendorSpend[vendorName] = (vendorSpend[vendorName] || 0) + amount;
                }
            }
        });

        return Object.entries(vendorSpend)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10); // Top 10
    }, [nodes, edges]);

    // Job Budget Variance
    const jobBudgetData = useMemo(() => {
        const jobs = nodes.filter(n => n.type === 'Job');

        return jobs.map(job => {
            const originalBudget = job.attributes?.original_budget || job.attributes?.current_budget || 0;
            const currentBudget = job.attributes?.current_budget || originalBudget;
            const variance = currentBudget - originalBudget;
            const variancePercent = originalBudget > 0 ? (variance / originalBudget) * 100 : 0;

            return {
                name: job.attributes?.name || job.label || job.id,
                original: originalBudget / 1000000, // Convert to millions
                current: currentBudget / 1000000,
                variance: variancePercent
            };
        }).filter(j => j.original > 0);
    }, [nodes]);

    // Transaction Type Distribution
    const transactionTypeData = useMemo(() => {
        const types: Record<string, number> = {};

        edges.forEach(e => {
            const amount = e.attributes?.amount || e.metadata?.amount || 0;
            types[e.type] = (types[e.type] || 0) + amount;
        });

        return Object.entries(types)
            .filter(([_, amount]) => amount > 0)
            .map(([type, amount]) => ({ name: type, value: amount }));
    }, [edges]);

    // Monthly Cash Flow Trend
    const monthlyTrendData = useMemo(() => {
        const monthlyData: Record<string, { inflow: number; outflow: number }> = {};

        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyData[key] = { inflow: 0, outflow: 0 };
        }

        edges.forEach(e => {
            const dateStr = e.attributes?.date || e.metadata?.date;
            const amount = e.attributes?.amount || e.metadata?.amount || 0;

            if (dateStr) {
                const date = new Date(dateStr);
                const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });

                if (monthlyData[key]) {
                    if (e.type === 'Payment') {
                        monthlyData[key].outflow += amount;
                    } else if (e.type === 'Invoice') {
                        monthlyData[key].inflow += amount;
                    }
                }
            }
        });

        return Object.entries(monthlyData).map(([month, data]) => ({
            month,
            inflow: data.inflow / 1000000, // Millions
            outflow: data.outflow / 1000000
        }));
    }, [edges]);

    const formatCurrency = (val: number) => `$${val.toFixed(1)}M`;

    const COLORS = ['#3498DB', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h2>📊 Analytics Dashboard</h2>
                <p className="analytics-subtitle">Comprehensive insights into your construction projects</p>
            </div>

            <div className="analytics-grid">
                {/* Vendor Spend Analysis */}
                <div className="analytics-card">
                    <h3>Top Vendors by Spend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={vendorSpendData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#34495E" />
                            <XAxis type="number" tickFormatter={(v) => formatCurrency(v / 1000000)} tick={{ fill: '#95A5A6', fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#E8EAED', fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value / 1000000)}
                                contentStyle={{ background: '#2C3E50', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Bar dataKey="amount" fill="#3498DB" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Cash Flow Trend */}
                <div className="analytics-card">
                    <h3>Monthly Cash Flow Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#34495E" />
                            <XAxis dataKey="month" tick={{ fill: '#95A5A6', fontSize: 11 }} />
                            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#95A5A6', fontSize: 11 }} />
                            <Tooltip
                                formatter={formatCurrency}
                                contentStyle={{ background: '#2C3E50', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ color: '#E8EAED' }} />
                            <Line type="monotone" dataKey="inflow" stroke="#27AE60" strokeWidth={2} name="Invoices" />
                            <Line type="monotone" dataKey="outflow" stroke="#E74C3C" strokeWidth={2} name="Payments" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Job Budget Variance */}
                <div className="analytics-card">
                    <h3>Job Budget Analysis</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={jobBudgetData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#34495E" />
                            <XAxis dataKey="name" tick={{ fill: '#95A5A6', fontSize: 10 }} angle={-15} textAnchor="end" height={80} />
                            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#95A5A6', fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'variance') return `${value.toFixed(1)}%`;
                                    return formatCurrency(value);
                                }}
                                contentStyle={{ background: '#2C3E50', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ color: '#E8EAED' }} />
                            <Bar dataKey="original" fill="#34495E" name="Original Budget" />
                            <Bar dataKey="current" fill="#3498DB" name="Current Budget" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Transaction Type Distribution */}
                <div className="analytics-card">
                    <h3>Transaction Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={transactionTypeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {transactionTypeData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value / 1000000)}
                                contentStyle={{ background: '#2C3E50', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="stat-box">
                    <div className="stat-label">Total Vendors</div>
                    <div className="stat-value">{nodes.filter(n => n.type === 'Vendor').length}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Active Jobs</div>
                    <div className="stat-value">{nodes.filter(n => n.type === 'Job').length}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Total Transactions</div>
                    <div className="stat-value">{edges.length}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Avg Transaction</div>
                    <div className="stat-value">
                        {formatCurrency(
                            edges.reduce((sum, e) => sum + (e.attributes?.amount || e.metadata?.amount || 0), 0) /
                            Math.max(edges.length, 1) / 1000000
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
