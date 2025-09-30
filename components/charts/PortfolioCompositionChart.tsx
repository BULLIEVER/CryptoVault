

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Token } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PortfolioCompositionChartProps {
    tokens: Token[];
    isBalanceHidden: boolean;
}

const COLORS = ['#5D5CDE', '#4C1D95', '#2563EB', '#0891B2', '#059669', '#CA8A04'];

export const PortfolioCompositionChart: React.FC<PortfolioCompositionChartProps> = ({ tokens, isBalanceHidden }) => {
    const data = useMemo(() => {
        if (!tokens || tokens.length === 0) return [];
        
        const sortedTokens = [...tokens].sort((a, b) => (b.amount * b.price) - (a.amount * a.price));
        const top5 = sortedTokens.slice(0, 5);
        const otherValue = sortedTokens.slice(5).reduce((acc, token) => acc + (token.amount * token.price), 0);
        
        const chartData = top5.map(token => ({
            name: token.symbol,
            value: token.amount * token.price,
        }));
        
        if (otherValue > 0) {
            chartData.push({ name: 'Others', value: otherValue });
        }
        
        return chartData;
    }, [tokens]);

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Add tokens to see portfolio composition.</p>
            </div>
        );
    }

    return (
         <div className="flex flex-col" style={{ width: '100%', height: 260 }}>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={58}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={3}
                            stroke="var(--color-card)"
                            strokeWidth={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [isBalanceHidden ? '*****' : formatCurrency(value), "Value"]} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 max-h-20 overflow-auto px-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 place-items-start">
                    {data.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center text-sm min-w-0" title={entry.name}>
                            <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="truncate">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};