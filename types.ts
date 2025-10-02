import React from 'react';

export type ExitStrategyType = 'targetMC' | 'ladder' | 'conservative' | 'moonOrBust' | 'ai' | 'progressive' | 'kelly';
export type Conviction = 'low' | 'medium' | 'high';

export interface Token {
    id: string;
    chain: string;
    pairAddress: string;
    name: string;
    symbol: string;
    amount: number;
    price: number;
    entryPrice: number;
    marketCap: number;
    targetMarketCap: number;
    exitStrategy: ExitStrategyType;
    conviction: Conviction;
    customExitStages?: { percentage: number; multiplier: number }[];
    imageUrl?: string;
    percentChange24h?: number;
}

export interface ApiToken {
    id: string;
    pairAddress: string;
    chainId: string;
    name: string;
    symbol: string;
    price: number;
    marketCap: number;
    percentChange24h: number;
    imageUrl: string;
    chainName: string;
    pairSymbol: string;
}

export interface Settings {
    updateInterval: number;
    notificationsEnabled: boolean;
    sortTokensBy: 'value' | 'name' | 'progress';
}

export interface ModalState {
    addToken: boolean;
    tokenDetails: Token | null;
    settings: boolean;
    rebalanceWorkbench: boolean;
    confirm: {
        title: string;
        description: string;
        onConfirm: () => void;
    } | null;
}

export interface ToastMessage {
    id: number;
    title: string;
    description: string;
    variant: 'success' | 'error' | 'warning' | 'info';
}

export interface PortfolioHistoryEntry {
    timestamp: string;
    totalValue: number;
}

export interface PortfolioValues {
    total: number;
    target: number;
    growthMultiplier: number;
    growthPercentage: number;
    highestPotentialToken: Token | null;
}

export interface StrategyStage {
    percentage: number;
    amount: number;
    multiplier: number;
    price: number;
    value: number;
}

export interface StrategyResult {
    currentValue: number;
    targetPrice: number;
    growthMultiplier: number;
    totalExitValue: number;
    profit: number;
    profitPercentage: number;
    profitStages?: StrategyStage[];
}

export interface StrategyComparison {
    selectedStrategy: StrategyResult;
    allAtOnce: StrategyResult;
    winner: 'selectedStrategy' | 'allAtOnce';
    difference: number;
    differencePercentage: number;
}

// FIX: Add missing PortfolioProjection and ProjectedExit types for the projection chart.
export interface ProjectedExit {
    projectedPortfolioValue: number;
    cashOutValue: number;
    tokenSymbol: string;
    tokenImageUrl?: string;
}

export interface PortfolioProjection {
    projectedExits: ProjectedExit[];
}

export interface TopOpportunity extends Token {
    potentialMultiplier: number;
}

export interface AiRebalancePlan {
    sells: { symbol: string; percentage: number; rationale?: string }[];
    buy: { symbol: string; rationale?: string } | null;
    rationale: string;
}

// Advanced Portfolio Optimization Types
export interface RiskMetrics {
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    var95: number; // Value at Risk 95%
    beta: number;
    alpha: number;
    correlation: number;
}

export interface OptimizationGoal {
    type: 'maximize_return' | 'minimize_risk' | 'maximize_sharpe' | 'equal_weight' | 'momentum' | 'mean_reversion';
    targetReturn?: number;
    maxRisk?: number;
    rebalanceThreshold?: number;
    timeHorizon: 'short' | 'medium' | 'long';
}

export interface AdvancedRebalancePlan {
    goal: OptimizationGoal;
    currentMetrics: RiskMetrics;
    targetMetrics: RiskMetrics;
    rebalanceActions: {
        sells: { token: Token; percentage: number; reason: string; impact: number }[];
        buys: { token: Token; amount: number; reason: string; impact: number }[];
    };
    expectedImprovement: {
        returnIncrease: number;
        riskReduction: number;
        sharpeImprovement: number;
    };
    confidence: number;
    marketConditions: {
        volatility: 'low' | 'medium' | 'high';
        trend: 'bullish' | 'bearish' | 'sideways';
        sentiment: 'fear' | 'greed' | 'neutral';
    };
}

export interface PortfolioHeatmap {
    correlations: { [token1: string]: { [token2: string]: number } };
    riskContribution: { [token: string]: number };
    returnContribution: { [token: string]: number };
    concentrationRisk: number;
}

export interface PerformanceAnalytics {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    winRate: number;
    profitFactor: number;
    alpha: number;
    beta: number;
    trackingError: number;
    informationRatio: number;
}