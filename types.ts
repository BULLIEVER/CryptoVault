import React from 'react';

export type ExitStrategyType = 'targetMC' | 'ladder' | 'conservative' | 'moonOrBust' | 'ai' | 'progressive';
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
    sortTokensBy: 'value' | 'name' | 'progress' | 'profit';
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

export interface AggregatedExitStage {
    multiplier: number;
    cashOutValue: number;
    tokenSymbol: string;
    tokenName: string;
    tokenImageUrl?: string;
}

export interface PortfolioProjection {
    totalInvestment: number;
    totalPotentialProfit: number;
    totalCashedOutValue: number;
    overallProfitPercentage: number;
    exitStages: AggregatedExitStage[];
    profitContribution: { name: string; profit: number }[];
}

export interface TopOpportunity extends Token {
    potentialMultiplier: number;
}