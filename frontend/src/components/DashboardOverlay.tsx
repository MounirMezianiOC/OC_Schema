import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './DashboardOverlay.css';

const DashboardOverlay: React.FC = () => {
    const { nodes, edges, filters, setFilters } = useAppStore();

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalSpend = edges
            .filter(e => e.type === 'Invoice' || e.type === 'Payment')
            .reduce((sum, e) => {
                // Check both attributes and metadata for amount
                const amount = e.attributes?.amount || e.metadata?.amount || 0;
                return sum + amount;
            }, 0);

        const activeVendors = nodes.filter(n => n.type === 'Vendor').length;
        const activeJobs = nodes.filter(n => n.type === 'Job').length;
        const pendingInvoices = edges.filter(e => {
            const status = e.attributes?.status || e.metadata?.status;
            return e.type === 'Invoice' && status === 'pending';
        }).length;

        return { totalSpend, activeVendors, activeJobs, pendingInvoices };
    }, [nodes, edges]);

    // Calculate Chart Data (Spend by Month)
    const chartData = useMemo(() => {
        const months: Record<string, { amount: number; startDate: string; endDate: string }> = {};

        // Create array of last 12 months
        const last12Months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (11 - i));
            const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });

            // Get first and last day of month
            const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

            months[monthKey] = { amount: 0, startDate, endDate };
            return monthKey;
        });

        // Populate with edge data
        edges.forEach(e => {
            if (e.type === 'Invoice' || e.type === 'Payment') {
                const date = e.attributes?.date || e.metadata?.date;
                const amount = e.attributes?.amount || e.metadata?.amount || 0;

                if (date) {
                    const parsedDate = new Date(date);
                    const key = parsedDate.toLocaleString('default', { month: 'short', year: '2-digit' });
                    if (months[key]) {
                        months[key].amount += amount;
                    }
                }
            }
        });

        return last12Months.map(m => ({
            name: m,
            amount: months[m].amount,
            startDate: months[m].startDate,
            endDate: months[m].endDate
        }));
    }, [edges]);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
        return `$${val.toFixed(0)}`;
    };

    // Handle clicking on chart bar to filter by month
    const handleBarClick = (data: any) => {
        if (data && data.startDate && data.endDate) {
            // Toggle filter: if already filtered to this month, clear filter
            if (filters.dateFrom === data.startDate && filters.dateTo === data.endDate) {
                setFilters({ dateFrom: undefined, dateTo: undefined });
            } else {
                setFilters({ dateFrom: data.startDate, dateTo: data.endDate });
            }
        }
    };

    // Check if a month is currently filtered
    const isMonthFiltered = (data: any) => {
        return filters.dateFrom === data.startDate && filters.dateTo === data.endDate;
    };

    return (
        <div className="dashboard-overlay">
            <div className="kpi-row">
                <div className="kpi-card">
                    <div className="kpi-label">Total Spend</div>
                    <div className="kpi-value">{formatCurrency(kpis.totalSpend)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Active Vendors</div>
                    <div className="kpi-value">{kpis.activeVendors}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Open Jobs</div>
                    <div className="kpi-value">{kpis.activeJobs}</div>
                </div>
                <div className="kpi-card warning">
                    <div className="kpi-label">Pending Invoices</div>
                    <div className="kpi-value">{kpis.pendingInvoices}</div>
                </div>
            </div>

            <div className="chart-container">
                <div className="chart-title">
                    Capital Flow (Last 12 Months)
                    {filters.dateFrom && (
                        <span style={{ marginLeft: '8px', fontSize: '10px', color: '#F39C12' }}>
                            ● Filtered
                        </span>
                    )}
                </div>
                <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData} onClick={(e) => e && e.activePayload && handleBarClick(e.activePayload[0].payload)}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#95A5A6' }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#2C3E50', border: 'none', borderRadius: '4px', color: '#fff' }}
                            itemStyle={{ color: '#3498DB' }}
                            formatter={(value: number) => formatCurrency(value)}
                            cursor={{ fill: 'rgba(52, 152, 219, 0.1)' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
                            {chartData.map((data, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={isMonthFiltered(data) ? '#F39C12' : (index === chartData.length - 1 ? '#3498DB' : '#2C3E50')}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: '9px', color: '#7F8C8D', marginTop: '4px', textAlign: 'center' }}>
                    Click a month to filter graph
                </div>
            </div>
        </div>
    );
};

export default DashboardOverlay;
