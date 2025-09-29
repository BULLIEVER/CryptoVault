import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioProjection } from '../../types';
import { formatCompactNumber, formatCurrency } from '../../utils/formatters';
import { InfoIcon } from '../ui/Icons';

interface PortfolioProjectionChartProps {
    projection: PortfolioProjection;
    isBalanceHidden: boolean;
    portfolioTotalValue: number;
}

type ChartData = {
    portfolioValueLabel: string;
    portfolioValue: number;
    totalCashOut: number;
    tokens: {
        symbol: string;
        value: number;
        imageUrl?: string;
    }[];
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, isBalanceHidden }) => {
    if (active && payload && payload.length) {
        const contributingTokens = payload[0].payload.tokens;

        return (
            <div className="bg-card p-3 border border-border rounded-md shadow-lg max-w-xs">
                <p className="font-bold mb-2">{`At ${label} Portfolio Value`}</p>
                <p className="text-primary text-lg font-semibold mb-2">{`Total Cash Out: ${isBalanceHidden ? '*****' : formatCurrency(payload[0].value)}`}</p>
                <div className="text-xs space-y-1 mt-2 border-t border-border pt-2">
                    <p className="font-semibold text-muted-foreground">Contributing Exits:</p>
                    {contributingTokens.slice(0, 5).map((token: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-2">
                           <div className="flex items-center gap-1.5 truncate">
                             {token.imageUrl ? <img src={token.imageUrl} alt={token.symbol} className="w-4 h-4 rounded-full"/> : <div className="w-4 h-4 rounded-full bg-muted"/>}
                             <span className="truncate">{token.symbol}</span>
                           </div>
                           <span>{isBalanceHidden ? '*****' : formatCurrency(token.value)}</span>
                        </div>
                    ))}
                    {contributingTokens.length > 5 && (
                        <p className="text-muted-foreground text-center mt-1">...and {contributingTokens.length - 5} more</p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};


export const PortfolioProjectionChart: React.FC<PortfolioProjectionChartProps> = ({ projection, isBalanceHidden, portfolioTotalValue }) => {
    const chartData = useMemo(() => {
        if (!projection || !projection.projectedExits || projection.projectedExits.length === 0) {
            return [];
        }

        const getBucketSize = (totalValue: number): number => {
            if (totalValue < 10000) return 2500;
            if (totalValue < 50000) return 5000;
            if (totalValue < 250000) return 25000;
            if (totalValue < 1000000) return 100000;
            return 500000;
        };
        const bucketSize = getBucketSize(portfolioTotalValue || 10000);

        // FIX: Use a string key for the accumulator to ensure Object.values returns a correctly typed array,
        // resolving errors where properties on `stage`, `a`, and `b` were not found.
        const aggregated = projection.projectedExits.reduce((acc, exit) => {
            const bucketFloor = Math.floor(exit.projectedPortfolioValue / bucketSize) * bucketSize;
            const key = String(bucketFloor);

            if (!acc[key]) {
                acc[key] = { 
                    portfolioValueLabel: `~${formatCompactNumber(bucketFloor)}`, 
                    portfolioValue: bucketFloor, 
                    totalCashOut: 0, 
                    tokens: [] 
                };
            }
            acc[key].totalCashOut += exit.cashOutValue;
            acc[key].tokens.push({
                symbol: exit.tokenSymbol,
                value: exit.cashOutValue,
                imageUrl: exit.tokenImageUrl,
            });
            return acc;
        }, {} as Record<string, ChartData>);
        
        Object.values(aggregated).forEach(stage => {
            stage.tokens.sort((a, b) => b.value - a.value);
        });

        return Object.values(aggregated).sort((a, b) => a.portfolioValue - b.portfolioValue);
    }, [projection, portfolioTotalValue]);

    if (chartData.length === 0) {
        return (
            <div className="h-80 flex items-center justify-center text-muted-foreground text-center">
                <div>
                    <p className="font-semibold">No Future Exits Planned</p>
                    <p className="text-sm">Set higher targets or add new tokens to see your projected cash flow.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <p className="text-xs text-center text-muted-foreground mb-4">
                <InfoIcon className="inline w-3 h-3 mr-1 relative -top-px" />
                This projection calculates each exit by isolating a token's growth to its target, assuming other asset prices remain constant.
            </p>
            <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="portfolioValueLabel"
                            stroke="var(--color-muted-foreground)"
                            fontSize={12}
                            name="Projected Portfolio Value"
                        />
                        <YAxis
                            tickFormatter={(value) => isBalanceHidden ? '*****' : formatCompactNumber(value)}
                            stroke="var(--color-muted-foreground)"
                            fontSize={12}
                            name="Cash Out Amount"
                        />
                        <Tooltip content={<CustomTooltip isBalanceHidden={isBalanceHidden} />} cursor={{ fill: 'hsla(240, 3.7%, 15.9%, 0.5)' }} />
                        <Bar dataKey="totalCashOut" name="Cash Out Value" fill="hsl(241, 78%, 61%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};