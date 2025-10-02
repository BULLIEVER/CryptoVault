

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Token } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PortfolioCompositionChartProps {
    tokens: Token[];
    isBalanceHidden: boolean;
}

const COLORS = [
    '#8B5CF6', '#06B6D4', '#A855F7', '#3B82F6', '#10B981', '#F59E0B',
    '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#14B8A6',
    '#0EA5E9', '#EC4899', '#F43F5E', '#DC2626', '#8B5CF6', '#F97316'
];

export const PortfolioCompositionChart: React.FC<PortfolioCompositionChartProps> = ({ tokens, isBalanceHidden }) => {
    const data = useMemo(() => {
        if (!tokens || tokens.length === 0) return [];
        
        // Sort tokens by value (amount * price)
        const sortedTokens = [...tokens].sort((a, b) => (b.amount * b.price) - (a.amount * a.price));
        
        // Take top 5 tokens
        const top5Tokens = sortedTokens.slice(0, 5);
        
        // Calculate total value of remaining tokens
        const remainingTokens = sortedTokens.slice(5);
        const othersValue = remainingTokens.reduce((sum, token) => sum + (token.amount * token.price), 0);
        
        // Create chart data
        const chartData = top5Tokens.map(token => ({
            name: token.symbol,
            value: token.amount * token.price,
        }));
        
        // Add "Others" if there are remaining tokens
        if (othersValue > 0) {
            chartData.push({
                name: 'Others',
                value: othersValue,
            });
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
         <div className="flex flex-col h-full">
            <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={60}
                            innerRadius={28}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={1}
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
            <div className="flex-1 flex items-start justify-center pt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 place-items-start w-full max-w-xs">
                    {data.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center text-sm min-w-0" title={entry.name}>
                            <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="truncate text-foreground font-medium">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};