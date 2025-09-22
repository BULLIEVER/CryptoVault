
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioHistoryEntry } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';

interface PortfolioHistoryChartProps {
    history: PortfolioHistoryEntry[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card p-2 border border-border rounded-md shadow-lg">
                <p className="label">{`${new Date(label).toLocaleDateString()}`}</p>
                <p className="intro text-primary">{`Value: ${formatCompactNumber(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

export const PortfolioHistoryChart: React.FC<PortfolioHistoryChartProps> = ({ history }) => {
    if (!history || history.length < 2) {
        return (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Not enough data to display chart.</p>
            </div>
        );
    }

    const data = history.map(entry => ({
        date: entry.timestamp,
        value: entry.totalValue,
    }));

    return (
        <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(241, 78%, 61%)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(241, 78%, 61%)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(timeStr) => new Date(timeStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                    />
                    <YAxis 
                        tickFormatter={(value) => formatCompactNumber(value)}
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="hsl(241, 78%, 61%)" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
