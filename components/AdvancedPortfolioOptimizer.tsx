import React, { useState, useEffect, useMemo } from 'react';
import { Token, AdvancedRebalancePlan, RiskMetrics, PortfolioHeatmap, PerformanceAnalytics, OptimizationGoal } from '../types';
import { formatCurrency, formatTokenPrice } from '../utils/formatters';
import { createAdvancedOptimizer, getOptimizationRecommendations } from '../utils/advancedOptimization';
import { 
    TrendingUpIcon, 
    ShieldIcon, 
    RocketIcon, 
    BarChartIcon, 
    TargetIcon, 
    AlertTriangleIcon,
    CheckCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    InfoIcon,
    RefreshIcon,
    SettingsIcon,
    DownloadIcon
} from './ui/Icons';

interface AdvancedPortfolioOptimizerProps {
    tokens: Token[];
    isBalanceHidden: boolean;
    onClose: () => void;
}

type OptimizerView = 'overview' | 'strategies' | 'risk-analysis' | 'performance' | 'heatmap';

export const AdvancedPortfolioOptimizer: React.FC<AdvancedPortfolioOptimizerProps> = ({
    tokens,
    isBalanceHidden,
    onClose
}) => {
    const [currentView, setCurrentView] = useState<OptimizerView>('overview');
    const [selectedStrategy, setSelectedStrategy] = useState<AdvancedRebalancePlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<{
        conservative: AdvancedRebalancePlan;
        balanced: AdvancedRebalancePlan;
        aggressive: AdvancedRebalancePlan;
        riskParity: AdvancedRebalancePlan;
    } | null>(null);
    const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
    const [heatmap, setHeatmap] = useState<PortfolioHeatmap | null>(null);
    const [performance, setPerformance] = useState<PerformanceAnalytics | null>(null);

    const optimizer = useMemo(() => createAdvancedOptimizer(tokens), [tokens]);

    useEffect(() => {
        loadOptimizationData();
    }, [tokens]);

    const loadOptimizationData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Validate tokens before processing
            if (!tokens || tokens.length === 0) {
                throw new Error('No tokens available for optimization');
            }

            if (tokens.length < 2) {
                throw new Error('At least 2 tokens are required for portfolio optimization');
            }

            const [recs, metrics, heatmapData, perfData] = await Promise.allSettled([
                getOptimizationRecommendations(tokens),
                Promise.resolve(optimizer.calculateRiskMetrics()),
                Promise.resolve(optimizer.generatePortfolioHeatmap()),
                Promise.resolve(optimizer.calculatePerformanceAnalytics())
            ]);

            // Handle results with fallbacks
            setRecommendations(recs.status === 'fulfilled' ? recs.value : null);
            setRiskMetrics(metrics.status === 'fulfilled' ? metrics.value : null);
            setHeatmap(heatmapData.status === 'fulfilled' ? heatmapData.value : null);
            setPerformance(perfData.status === 'fulfilled' ? perfData.value : null);

            // Check if any critical operations failed
            if (recs.status === 'rejected') {
                console.warn('Optimization recommendations failed:', recs.reason);
            }
            if (metrics.status === 'rejected') {
                console.warn('Risk metrics calculation failed:', metrics.reason);
            }
        } catch (err) {
            console.error('Optimization data loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load optimization data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStrategySelect = (strategy: AdvancedRebalancePlan) => {
        setSelectedStrategy(strategy);
        setCurrentView('strategies');
    };

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Advanced Portfolio Optimizer</h2>
                <p className="text-muted-foreground">AI-powered portfolio optimization with advanced risk management</p>
            </div>

            {/* Key Metrics Dashboard */}
            {riskMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Sharpe Ratio"
                        value={riskMetrics.sharpeRatio.toFixed(2)}
                        description="Risk-adjusted returns"
                        icon={<TrendingUpIcon className="w-5 h-5" />}
                        color={riskMetrics.sharpeRatio > 1 ? 'text-success' : riskMetrics.sharpeRatio > 0.5 ? 'text-warning' : 'text-destructive'}
                    />
                    <MetricCard
                        title="Max Drawdown"
                        value={`${(riskMetrics.maxDrawdown * 100).toFixed(1)}%`}
                        description="Worst peak-to-trough decline"
                        icon={<ArrowDownIcon className="w-5 h-5" />}
                        color={riskMetrics.maxDrawdown < 0.1 ? 'text-success' : riskMetrics.maxDrawdown < 0.2 ? 'text-warning' : 'text-destructive'}
                    />
                    <MetricCard
                        title="Volatility"
                        value={`${(riskMetrics.volatility * 100).toFixed(1)}%`}
                        description="Price fluctuation risk"
                        icon={<BarChartIcon className="w-5 h-5" />}
                        color={riskMetrics.volatility < 0.2 ? 'text-success' : riskMetrics.volatility < 0.4 ? 'text-warning' : 'text-destructive'}
                    />
                    <MetricCard
                        title="VaR (95%)"
                        value={`${(riskMetrics.var95 * 100).toFixed(1)}%`}
                        description="Potential daily loss"
                        icon={<AlertTriangleIcon className="w-5 h-5" />}
                        color={riskMetrics.var95 < 0.05 ? 'text-success' : riskMetrics.var95 < 0.1 ? 'text-warning' : 'text-destructive'}
                    />
                </div>
            )}

            {/* Strategy Recommendations */}
            {recommendations && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">Optimization Strategies</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StrategyCard
                            title="Conservative"
                            description="Minimize risk with stable allocation"
                            plan={recommendations.conservative}
                            icon={<ShieldIcon className="w-6 h-6" />}
                            color="bg-blue-500"
                            onClick={() => handleStrategySelect(recommendations.conservative)}
                        />
                        <StrategyCard
                            title="Balanced"
                            description="Optimize risk-adjusted returns"
                            plan={recommendations.balanced}
                            icon={<TargetIcon className="w-6 h-6" />}
                            color="bg-green-500"
                            onClick={() => handleStrategySelect(recommendations.balanced)}
                        />
                        <StrategyCard
                            title="Aggressive"
                            description="Maximize potential returns"
                            plan={recommendations.aggressive}
                            icon={<RocketIcon className="w-6 h-6" />}
                            color="bg-orange-500"
                            onClick={() => handleStrategySelect(recommendations.aggressive)}
                        />
                        <StrategyCard
                            title="Risk Parity"
                            description="Equal risk contribution"
                            plan={recommendations.riskParity}
                            icon={<BarChartIcon className="w-6 h-6" />}
                            color="bg-purple-500"
                            onClick={() => handleStrategySelect(recommendations.riskParity)}
                        />
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setCurrentView('risk-analysis')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <ShieldIcon className="w-4 h-4" />
                    Risk Analysis
                </button>
                <button
                    onClick={() => setCurrentView('performance')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <TrendingUpIcon className="w-4 h-4" />
                    Performance
                </button>
                <button
                    onClick={() => setCurrentView('heatmap')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <BarChartIcon className="w-4 h-4" />
                    Correlation Heatmap
                </button>
            </div>
        </div>
    );

    const renderStrategies = () => {
        if (!selectedStrategy) return null;

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentView('overview')}
                        className="p-2 rounded-full hover:bg-accent"
                    >
                        <ArrowUpIcon className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold">Strategy Details</h2>
                </div>

                {/* Strategy Overview */}
                <div className="p-6 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Strategy Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Goal</p>
                            <p className="font-semibold capitalize">{selectedStrategy.goal.type.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Time Horizon</p>
                            <p className="font-semibold capitalize">{selectedStrategy.goal.timeHorizon}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <p className="font-semibold">{(selectedStrategy.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>

                {/* Expected Improvements */}
                <div className="p-6 bg-success/10 border border-success/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-success">Expected Improvements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-success">
                                +{(selectedStrategy.expectedImprovement.returnIncrease * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Return Increase</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-success">
                                -{(selectedStrategy.expectedImprovement.riskReduction * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Risk Reduction</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-success">
                                +{(selectedStrategy.expectedImprovement.sharpeImprovement * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Sharpe Improvement</p>
                        </div>
                    </div>
                </div>

                {/* Rebalancing Actions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Rebalancing Actions</h3>
                    
                    {selectedStrategy.rebalanceActions.sells.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-destructive mb-2">Sell Orders</h4>
                            <div className="space-y-2">
                                {selectedStrategy.rebalanceActions.sells.map((action, index) => (
                                    <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{action.token.symbol}</p>
                                                <p className="text-sm text-muted-foreground">{action.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-destructive">{action.percentage.toFixed(1)}%</p>
                                                <p className="text-xs text-muted-foreground">Impact: {action.impact.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedStrategy.rebalanceActions.buys.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-success mb-2">Buy Orders</h4>
                            <div className="space-y-2">
                                {selectedStrategy.rebalanceActions.buys.map((action, index) => (
                                    <div key={index} className="p-3 bg-success/10 border border-success/20 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{action.token.symbol}</p>
                                                <p className="text-sm text-muted-foreground">{action.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-success">
                                                    {isBalanceHidden ? '*****' : formatCurrency(action.amount * action.token.price)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Impact: {action.impact.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Market Conditions */}
                <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Market Conditions</h4>
                    <div className="flex gap-4 text-sm">
                        <span className="capitalize">Volatility: {selectedStrategy.marketConditions.volatility}</span>
                        <span className="capitalize">Trend: {selectedStrategy.marketConditions.trend}</span>
                        <span className="capitalize">Sentiment: {selectedStrategy.marketConditions.sentiment}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderRiskAnalysis = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setCurrentView('overview')}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ArrowUpIcon className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold">Risk Analysis</h2>
            </div>

            {riskMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-muted/50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Risk Metrics</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Sharpe Ratio</span>
                                <span className="font-semibold">{riskMetrics.sharpeRatio.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sortino Ratio</span>
                                <span className="font-semibold">{riskMetrics.sortinoRatio.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Maximum Drawdown</span>
                                <span className="font-semibold">{(riskMetrics.maxDrawdown * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Volatility</span>
                                <span className="font-semibold">{(riskMetrics.volatility * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Value at Risk (95%)</span>
                                <span className="font-semibold">{(riskMetrics.var95 * 100).toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-muted/50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    riskMetrics.sharpeRatio > 1 ? 'bg-success' : 
                                    riskMetrics.sharpeRatio > 0.5 ? 'bg-warning' : 'bg-destructive'
                                }`} />
                                <span>Risk-Adjusted Returns: {
                                    riskMetrics.sharpeRatio > 1 ? 'Excellent' : 
                                    riskMetrics.sharpeRatio > 0.5 ? 'Good' : 'Poor'
                                }</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    riskMetrics.maxDrawdown < 0.1 ? 'bg-success' : 
                                    riskMetrics.maxDrawdown < 0.2 ? 'bg-warning' : 'bg-destructive'
                                }`} />
                                <span>Drawdown Risk: {
                                    riskMetrics.maxDrawdown < 0.1 ? 'Low' : 
                                    riskMetrics.maxDrawdown < 0.2 ? 'Medium' : 'High'
                                }</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    riskMetrics.volatility < 0.2 ? 'bg-success' : 
                                    riskMetrics.volatility < 0.4 ? 'bg-warning' : 'bg-destructive'
                                }`} />
                                <span>Volatility: {
                                    riskMetrics.volatility < 0.2 ? 'Low' : 
                                    riskMetrics.volatility < 0.4 ? 'Medium' : 'High'
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {heatmap && (
                <div className="p-6 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Risk Contribution</h3>
                    <div className="space-y-2">
                        {Object.entries(heatmap.riskContribution).map(([token, contribution]) => (
                            <div key={token} className="flex justify-between items-center">
                                <span>{token}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${contribution}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-12 text-right">{contribution.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPerformance = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setCurrentView('overview')}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ArrowUpIcon className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold">Performance Analytics</h2>
            </div>

            {performance && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                        title="Total Return"
                        value={`${(performance.totalReturn * 100).toFixed(2)}%`}
                        description="Overall portfolio return"
                        icon={<TrendingUpIcon className="w-5 h-5" />}
                        color={performance.totalReturn > 0 ? 'text-success' : 'text-destructive'}
                    />
                    <MetricCard
                        title="Annualized Return"
                        value={`${(performance.annualizedReturn * 100).toFixed(2)}%`}
                        description="Yearly return rate"
                        icon={<ArrowUpIcon className="w-5 h-5" />}
                        color={performance.annualizedReturn > 0.1 ? 'text-success' : 'text-warning'}
                    />
                    <MetricCard
                        title="Sharpe Ratio"
                        value={performance.sharpeRatio.toFixed(3)}
                        description="Risk-adjusted returns"
                        icon={<TargetIcon className="w-5 h-5" />}
                        color={performance.sharpeRatio > 1 ? 'text-success' : 'text-warning'}
                    />
                    <MetricCard
                        title="Sortino Ratio"
                        value={performance.sortinoRatio.toFixed(3)}
                        description="Downside risk-adjusted"
                        icon={<ShieldIcon className="w-5 h-5" />}
                        color={performance.sortinoRatio > 1 ? 'text-success' : 'text-warning'}
                    />
                    <MetricCard
                        title="Max Drawdown"
                        value={`${(performance.maxDrawdown * 100).toFixed(2)}%`}
                        description="Worst decline"
                        icon={<ArrowDownIcon className="w-5 h-5" />}
                        color={performance.maxDrawdown < 0.1 ? 'text-success' : 'text-destructive'}
                    />
                    <MetricCard
                        title="Calmar Ratio"
                        value={performance.calmarRatio.toFixed(3)}
                        description="Return vs max drawdown"
                        icon={<BarChartIcon className="w-5 h-5" />}
                        color={performance.calmarRatio > 1 ? 'text-success' : 'text-warning'}
                    />
                </div>
            )}
        </div>
    );

    const renderHeatmap = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setCurrentView('overview')}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ArrowUpIcon className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold">Correlation Heatmap</h2>
            </div>

            {heatmap && (
                <div className="p-6 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Asset Correlations</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left p-2"></th>
                                    {Object.keys(heatmap.correlations).map(token => (
                                        <th key={token} className="text-center p-2 font-semibold">{token}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(heatmap.correlations).map(([token1, correlations]) => (
                                    <tr key={token1}>
                                        <td className="p-2 font-semibold">{token1}</td>
                                        {Object.entries(correlations).map(([token2, correlation]) => (
                                            <td key={token2} className="text-center p-2">
                                                <div 
                                                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold ${
                                                        correlation > 0.7 ? 'bg-red-500 text-white' :
                                                        correlation > 0.3 ? 'bg-orange-500 text-white' :
                                                        correlation > -0.3 ? 'bg-yellow-500 text-black' :
                                                        correlation > -0.7 ? 'bg-blue-500 text-white' :
                                                        'bg-green-500 text-white'
                                                    }`}
                                                >
                                                    {correlation.toFixed(2)}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span>High Correlation (&gt;0.7)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                            <span>Medium Correlation (0.3-0.7)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                            <span>Low Correlation (-0.3-0.3)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span>Negative Correlation (-0.7--0.3)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span>Strong Negative (&lt;-0.7)</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Analyzing portfolio...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <AlertTriangleIcon className="w-12 h-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analysis Failed</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                    onClick={loadOptimizationData}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    Retry Analysis
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-accent"
                    >
                        <ArrowUpIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Advanced Portfolio Optimizer</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadOptimizationData}
                        className="p-2 rounded-full hover:bg-accent"
                        title="Refresh Analysis"
                    >
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                    <button
                        className="p-2 rounded-full hover:bg-accent"
                        title="Export Report"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-border">
                {[
                    { id: 'overview', label: 'Overview', icon: <BarChartIcon className="w-4 h-4" /> },
                    { id: 'strategies', label: 'Strategies', icon: <TargetIcon className="w-4 h-4" /> },
                    { id: 'risk-analysis', label: 'Risk Analysis', icon: <ShieldIcon className="w-4 h-4" /> },
                    { id: 'performance', label: 'Performance', icon: <TrendingUpIcon className="w-4 h-4" /> },
                    { id: 'heatmap', label: 'Heatmap', icon: <BarChartIcon className="w-4 h-4" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCurrentView(tab.id as OptimizerView)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                            currentView === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {currentView === 'overview' && renderOverview()}
                {currentView === 'strategies' && renderStrategies()}
                {currentView === 'risk-analysis' && renderRiskAnalysis()}
                {currentView === 'performance' && renderPerformance()}
                {currentView === 'heatmap' && renderHeatmap()}
            </div>
        </div>
    );
};

// Helper Components
const MetricCard: React.FC<{
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    color?: string;
}> = ({ title, value, description, icon, color = 'text-foreground' }) => (
    <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                {icon}
            </div>
            <h4 className="font-semibold">{title}</h4>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

const StrategyCard: React.FC<{
    title: string;
    description: string;
    plan: AdvancedRebalancePlan;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}> = ({ title, description, plan, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="p-6 bg-muted/50 rounded-lg text-left hover:bg-muted transition-colors"
    >
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white`}>
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="font-semibold">{(plan.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
                <span>Expected Return:</span>
                <span className="font-semibold text-success">
                    +{(plan.expectedImprovement.returnIncrease * 100).toFixed(1)}%
                </span>
            </div>
            <div className="flex justify-between">
                <span>Risk Reduction:</span>
                <span className="font-semibold text-success">
                    -{(plan.expectedImprovement.riskReduction * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    </button>
);
