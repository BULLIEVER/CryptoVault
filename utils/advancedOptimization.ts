import { Token, RiskMetrics, OptimizationGoal, AdvancedRebalancePlan, PortfolioHeatmap, PerformanceAnalytics } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// Advanced Portfolio Optimization Engine
export class AdvancedPortfolioOptimizer {
    private tokens: Token[];
    private riskFreeRate: number = 0.02; // 2% annual risk-free rate

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    // Calculate comprehensive risk metrics
    calculateRiskMetrics(): RiskMetrics {
        const returns = this.calculateReturns();
        const portfolioReturn = this.calculatePortfolioReturn();
        const volatility = this.calculateVolatility(returns);
        const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
        
        return {
            sharpeRatio: sharpeRatio || 0,
            sortinoRatio: this.calculateSortinoRatio(returns),
            maxDrawdown: this.calculateMaxDrawdown(returns),
            volatility: volatility,
            var95: this.calculateVaR(returns, 0.95),
            beta: this.calculateBeta(),
            alpha: this.calculateAlpha(portfolioReturn),
            correlation: this.calculateAverageCorrelation()
        };
    }

    // Modern Portfolio Theory - Mean Variance Optimization
    optimizeMeanVariance(goal: OptimizationGoal): AdvancedRebalancePlan {
        const currentMetrics = this.calculateRiskMetrics();
        const weights = this.calculateOptimalWeights(goal);
        
        return {
            goal,
            currentMetrics,
            targetMetrics: this.projectTargetMetrics(weights, goal),
            rebalanceActions: this.generateRebalanceActions(weights),
            expectedImprovement: this.calculateExpectedImprovement(currentMetrics, weights, goal),
            confidence: this.calculateConfidence(goal),
            marketConditions: this.analyzeMarketConditions()
        };
    }

    // Black-Litterman Model for better expected returns
    async optimizeBlackLitterman(goal: OptimizationGoal, views?: any[]): Promise<AdvancedRebalancePlan> {
        const marketCapWeights = this.calculateMarketCapWeights();
        const impliedReturns = this.calculateImpliedReturns(marketCapWeights);
        const adjustedReturns = views ? this.adjustReturnsWithViews(impliedReturns, views) : impliedReturns;
        
        const optimalWeights = this.optimizeWithReturns(adjustedReturns, goal);
        
        return {
            goal,
            currentMetrics: this.calculateRiskMetrics(),
            targetMetrics: this.projectTargetMetrics(optimalWeights, goal),
            rebalanceActions: this.generateRebalanceActions(optimalWeights),
            expectedImprovement: this.calculateExpectedImprovement(this.calculateRiskMetrics(), optimalWeights, goal),
            confidence: this.calculateConfidence(goal),
            marketConditions: this.analyzeMarketConditions()
        };
    }

    // Risk Parity Optimization
    optimizeRiskParity(): AdvancedRebalancePlan {
        const goal: OptimizationGoal = {
            type: 'minimize_risk',
            timeHorizon: 'medium'
        };

        const riskContributions = this.calculateRiskContributions();
        const targetRiskContribution = 1 / this.tokens.length; // Equal risk contribution
        const weights = this.optimizeForEqualRiskContribution(targetRiskContribution);

        return {
            goal,
            currentMetrics: this.calculateRiskMetrics(),
            targetMetrics: this.projectTargetMetrics(weights, goal),
            rebalanceActions: this.generateRebalanceActions(weights),
            expectedImprovement: this.calculateExpectedImprovement(this.calculateRiskMetrics(), weights, goal),
            confidence: 0.85, // Risk parity is generally reliable
            marketConditions: this.analyzeMarketConditions()
        };
    }

    // Momentum-based optimization
    optimizeMomentum(lookbackPeriod: number = 30): AdvancedRebalancePlan {
        const goal: OptimizationGoal = {
            type: 'momentum',
            timeHorizon: 'short'
        };

        const momentumScores = this.calculateMomentumScores(lookbackPeriod);
        const weights = this.allocateBasedOnMomentum(momentumScores);

        return {
            goal,
            currentMetrics: this.calculateRiskMetrics(),
            targetMetrics: this.projectTargetMetrics(weights, goal),
            rebalanceActions: this.generateRebalanceActions(weights),
            expectedImprovement: this.calculateExpectedImprovement(this.calculateRiskMetrics(), weights, goal),
            confidence: this.calculateMomentumConfidence(momentumScores),
            marketConditions: this.analyzeMarketConditions()
        };
    }

    // AI-Enhanced Optimization with market sentiment
    async optimizeWithAI(goal: OptimizationGoal): Promise<AdvancedRebalancePlan> {
        // Check if API key is available (in browser environment, this will be undefined)
        const apiKey = typeof window !== 'undefined' ? 
            (window as any).GOOGLE_AI_API_KEY || 
            (typeof process !== 'undefined' ? process.env.API_KEY : undefined) : 
            undefined;
        
        if (!apiKey) {
            // Fallback to mean-variance optimization if no API key
            return this.optimizeMeanVariance(goal);
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const portfolioData = this.tokens.map(token => ({
            symbol: token.symbol,
            currentWeight: (token.amount * token.price) / this.getTotalPortfolioValue(),
            expectedReturn: this.calculateExpectedReturn(token),
            risk: this.calculateTokenRisk(token),
            momentum: this.calculateMomentumScore(token),
            conviction: token.conviction,
            marketCap: token.marketCap,
            targetMarketCap: token.targetMarketCap
        }));

        const prompt = `You are an advanced portfolio optimization AI. Analyze this crypto portfolio and provide optimal allocation weights.

Portfolio Data: ${JSON.stringify(portfolioData, null, 2)}

Optimization Goal: ${goal.type} (${goal.timeHorizon} term)
${goal.targetReturn ? `Target Return: ${goal.targetReturn}%` : ''}
${goal.maxRisk ? `Max Risk: ${goal.maxRisk}%` : ''}

Consider:
1. Risk-adjusted returns (Sharpe ratio optimization)
2. Correlation analysis between assets
3. Market momentum and sentiment
4. Concentration risk
5. Liquidity and market cap considerations
6. User conviction levels

Return optimal weights as percentages that sum to 100.`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            weights: {
                                type: Type.OBJECT,
                                description: 'Optimal allocation weights for each token',
                                additionalProperties: { type: Type.NUMBER }
                            },
                            rationale: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                            riskAssessment: { type: Type.STRING }
                        },
                        required: ['weights', 'rationale', 'confidence']
                    }
                }
            });

            const result = JSON.parse(response.text);
            const weights = this.normalizeWeights(result.weights);

            return {
                goal,
                currentMetrics: this.calculateRiskMetrics(),
                targetMetrics: this.projectTargetMetrics(weights, goal),
                rebalanceActions: this.generateRebalanceActions(weights),
                expectedImprovement: this.calculateExpectedImprovement(this.calculateRiskMetrics(), weights, goal),
                confidence: result.confidence,
                marketConditions: this.analyzeMarketConditions()
            };
        } catch (error) {
            console.error('AI optimization failed:', error);
            // Fallback to mean-variance optimization
            return this.optimizeMeanVariance(goal);
        }
    }

    // Generate portfolio heatmap for risk analysis
    generatePortfolioHeatmap(): PortfolioHeatmap {
        const correlations = this.calculateCorrelationMatrix();
        const riskContributions = this.calculateRiskContributions();
        const returnContributions = this.calculateReturnContributions();
        const concentrationRisk = this.calculateConcentrationRisk();

        return {
            correlations,
            riskContribution: riskContributions,
            returnContribution: returnContributions,
            concentrationRisk
        };
    }

    // Calculate comprehensive performance analytics
    calculatePerformanceAnalytics(): PerformanceAnalytics {
        const returns = this.calculateReturns();
        const totalReturn = this.calculateTotalReturn();
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const volatility = this.calculateVolatility(returns);
        const sharpeRatio = (annualizedReturn - this.riskFreeRate) / volatility;
        const sortinoRatio = this.calculateSortinoRatio(returns);
        const maxDrawdown = this.calculateMaxDrawdown(returns);
        const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);

        return {
            totalReturn,
            annualizedReturn,
            volatility,
            sharpeRatio: sharpeRatio || 0,
            sortinoRatio,
            maxDrawdown,
            calmarRatio: calmarRatio || 0,
            winRate: this.calculateWinRate(returns),
            profitFactor: this.calculateProfitFactor(returns),
            alpha: this.calculateAlpha(annualizedReturn),
            beta: this.calculateBeta(),
            trackingError: this.calculateTrackingError(),
            informationRatio: this.calculateInformationRatio()
        };
    }

    // Private helper methods
    private calculateReturns(): number[] {
        // Simplified returns calculation - in real implementation, use historical data
        return this.tokens.map(token => {
            const currentValue = token.amount * token.price;
            const entryValue = token.amount * token.entryPrice;
            return entryValue > 0 ? (currentValue - entryValue) / entryValue : 0;
        });
    }

    private calculatePortfolioReturn(): number {
        const totalValue = this.getTotalPortfolioValue();
        const totalEntryValue = this.tokens.reduce((sum, token) => sum + (token.amount * token.entryPrice), 0);
        return totalEntryValue > 0 ? (totalValue - totalEntryValue) / totalEntryValue : 0;
    }

    private calculateVolatility(returns: number[]): number {
        if (returns.length === 0) return 0;
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    private calculateSortinoRatio(returns: number[]): number {
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const downsideReturns = returns.filter(r => r < 0);
        const downsideDeviation = this.calculateVolatility(downsideReturns);
        return downsideDeviation > 0 ? (meanReturn - this.riskFreeRate) / downsideDeviation : 0;
    }

    private calculateMaxDrawdown(returns: number[]): number {
        let maxDrawdown = 0;
        let peak = 0;
        let cumulative = 1;

        for (const ret of returns) {
            cumulative *= (1 + ret);
            if (cumulative > peak) {
                peak = cumulative;
            }
            const drawdown = (peak - cumulative) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        return maxDrawdown;
    }

    private calculateVaR(returns: number[], confidence: number): number {
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sortedReturns.length);
        return sortedReturns[index] || 0;
    }

    private calculateBeta(): number {
        // Simplified beta calculation - in real implementation, use market index
        return 1.0; // Default to market beta
    }

    private calculateAlpha(portfolioReturn: number): number {
        const beta = this.calculateBeta();
        const marketReturn = 0.1; // Simplified market return
        return portfolioReturn - (this.riskFreeRate + beta * (marketReturn - this.riskFreeRate));
    }

    private calculateAverageCorrelation(): number {
        const correlations = this.calculateCorrelationMatrix();
        const symbols = Object.keys(correlations);
        let totalCorrelation = 0;
        let count = 0;

        for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                totalCorrelation += correlations[symbols[i]][symbols[j]] || 0;
                count++;
            }
        }

        return count > 0 ? totalCorrelation / count : 0;
    }

    private calculateOptimalWeights(goal: OptimizationGoal): { [tokenId: string]: number } {
        // Simplified optimization - in real implementation, use quadratic programming
        const totalValue = this.getTotalPortfolioValue();
        const weights: { [tokenId: string]: number } = {};

        switch (goal.type) {
            case 'maximize_return':
                // Allocate more to highest expected return tokens
                const returns = this.calculateExpectedReturns();
                const totalReturn = Object.values(returns).reduce((sum, r) => sum + r, 0);
                this.tokens.forEach(token => {
                    weights[token.id] = (returns[token.id] / totalReturn) * 100;
                });
                break;
            case 'minimize_risk':
                // Equal weight for risk minimization
                const equalWeight = 100 / this.tokens.length;
                this.tokens.forEach(token => {
                    weights[token.id] = equalWeight;
                });
                break;
            case 'maximize_sharpe':
                // Allocate based on risk-adjusted returns
                const riskAdjustedReturns = this.calculateRiskAdjustedReturns();
                const totalRiskAdjusted = Object.values(riskAdjustedReturns).reduce((sum, r) => sum + r, 0);
                this.tokens.forEach(token => {
                    weights[token.id] = (riskAdjustedReturns[token.id] / totalRiskAdjusted) * 100;
                });
                break;
            default:
                // Equal weight as default
                const defaultWeight = 100 / this.tokens.length;
                this.tokens.forEach(token => {
                    weights[token.id] = defaultWeight;
                });
        }

        return this.normalizeWeights(weights);
    }

    private calculateExpectedReturns(): { [tokenId: string]: number } {
        const returns: { [tokenId: string]: number } = {};
        this.tokens.forEach(token => {
            const currentValue = token.amount * token.price;
            const entryValue = token.amount * token.entryPrice;
            returns[token.id] = entryValue > 0 ? (currentValue - entryValue) / entryValue : 0;
        });
        return returns;
    }

    private calculateRiskAdjustedReturns(): { [tokenId: string]: number } {
        const returns = this.calculateExpectedReturns();
        const risks = this.calculateTokenRisks();
        const riskAdjusted: { [tokenId: string]: number } = {};

        this.tokens.forEach(token => {
            const return_ = returns[token.id] || 0;
            const risk = risks[token.id] || 0.1;
            riskAdjusted[token.id] = risk > 0 ? return_ / risk : 0;
        });

        return riskAdjusted;
    }

    private calculateTokenRisks(): { [tokenId: string]: number } {
        const risks: { [tokenId: string]: number } = {};
        this.tokens.forEach(token => {
            // Simplified risk calculation based on volatility and market cap
            const marketCapRisk = token.marketCap > 0 ? Math.min(1, 1000000000 / token.marketCap) : 1;
            const convictionRisk = token.conviction === 'high' ? 0.1 : token.conviction === 'medium' ? 0.2 : 0.3;
            risks[token.id] = marketCapRisk * convictionRisk;
        });
        return risks;
    }

    private normalizeWeights(weights: { [tokenId: string]: number }): { [tokenId: string]: number } {
        const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
        if (total === 0) return weights;

        const normalized: { [tokenId: string]: number } = {};
        Object.keys(weights).forEach(tokenId => {
            normalized[tokenId] = (weights[tokenId] / total) * 100;
        });

        return normalized;
    }

    private getTotalPortfolioValue(): number {
        return this.tokens.reduce((sum, token) => sum + (token.amount * token.price), 0);
    }

    private calculateMarketCapWeights(): { [tokenId: string]: number } {
        const totalMarketCap = this.tokens.reduce((sum, token) => sum + token.marketCap, 0);
        const weights: { [tokenId: string]: number } = {};

        this.tokens.forEach(token => {
            weights[token.id] = totalMarketCap > 0 ? (token.marketCap / totalMarketCap) * 100 : 0;
        });

        return weights;
    }

    private calculateImpliedReturns(weights: { [tokenId: string]: number }): { [tokenId: string]: number } {
        // Simplified implied returns calculation
        const returns: { [tokenId: string]: number } = {};
        this.tokens.forEach(token => {
            const currentValue = token.amount * token.price;
            const entryValue = token.amount * token.entryPrice;
            returns[token.id] = entryValue > 0 ? (currentValue - entryValue) / entryValue : 0;
        });
        return returns;
    }

    private adjustReturnsWithViews(impliedReturns: { [tokenId: string]: number }, views: any[]): { [tokenId: string]: number } {
        // Simplified view adjustment - in real implementation, use Black-Litterman formula
        return impliedReturns;
    }

    private optimizeWithReturns(returns: { [tokenId: string]: number }, goal: OptimizationGoal): { [tokenId: string]: number } {
        // Simplified optimization with given returns
        return this.calculateOptimalWeights(goal);
    }

    private projectTargetMetrics(weights: { [tokenId: string]: number }, goal: OptimizationGoal): RiskMetrics {
        // Project what the risk metrics would be with new weights
        const currentMetrics = this.calculateRiskMetrics();
        return {
            ...currentMetrics,
            sharpeRatio: currentMetrics.sharpeRatio * 1.1, // Simplified improvement projection
            volatility: currentMetrics.volatility * 0.95
        };
    }

    private generateRebalanceActions(weights: { [tokenId: string]: number }): {
        sells: { token: Token; percentage: number; reason: string; impact: number }[];
        buys: { token: Token; amount: number; reason: string; impact: number }[];
    } {
        const currentWeights = this.calculateCurrentWeights();
        const sells: { token: Token; percentage: number; reason: string; impact: number }[] = [];
        const buys: { token: Token; amount: number; reason: string; impact: number }[] = [];

        this.tokens.forEach(token => {
            const currentWeight = currentWeights[token.id] || 0;
            const targetWeight = weights[token.id] || 0;
            const difference = targetWeight - currentWeight;

            if (difference < -1) { // Sell if difference is significant
                sells.push({
                    token,
                    percentage: Math.abs(difference),
                    reason: `Reduce allocation from ${currentWeight.toFixed(1)}% to ${targetWeight.toFixed(1)}%`,
                    impact: Math.abs(difference) * 0.1 // Simplified impact calculation
                });
            } else if (difference > 1) { // Buy if difference is significant
                const totalValue = this.getTotalPortfolioValue();
                const amount = (difference / 100) * totalValue / token.price;
                buys.push({
                    token,
                    amount,
                    reason: `Increase allocation from ${currentWeight.toFixed(1)}% to ${targetWeight.toFixed(1)}%`,
                    impact: difference * 0.1
                });
            }
        });

        return { sells, buys };
    }

    private calculateCurrentWeights(): { [tokenId: string]: number } {
        const totalValue = this.getTotalPortfolioValue();
        const weights: { [tokenId: string]: number } = {};

        this.tokens.forEach(token => {
            const tokenValue = token.amount * token.price;
            weights[token.id] = totalValue > 0 ? (tokenValue / totalValue) * 100 : 0;
        });

        return weights;
    }

    private calculateExpectedImprovement(currentMetrics: RiskMetrics, weights: { [tokenId: string]: number }, goal: OptimizationGoal): {
        returnIncrease: number;
        riskReduction: number;
        sharpeImprovement: number;
    } {
        // Simplified improvement calculation
        return {
            returnIncrease: goal.type === 'maximize_return' ? 0.15 : 0.05,
            riskReduction: goal.type === 'minimize_risk' ? 0.20 : 0.10,
            sharpeImprovement: goal.type === 'maximize_sharpe' ? 0.25 : 0.15
        };
    }

    private calculateConfidence(goal: OptimizationGoal): number {
        // Simplified confidence calculation based on goal type and market conditions
        const baseConfidence = {
            'maximize_return': 0.7,
            'minimize_risk': 0.85,
            'maximize_sharpe': 0.8,
            'equal_weight': 0.9,
            'momentum': 0.6,
            'mean_reversion': 0.65
        };

        return baseConfidence[goal.type] || 0.7;
    }

    private analyzeMarketConditions(): {
        volatility: 'low' | 'medium' | 'high';
        trend: 'bullish' | 'bearish' | 'sideways';
        sentiment: 'fear' | 'greed' | 'neutral';
    } {
        // Simplified market analysis - in real implementation, use market data
        const avgVolatility = this.calculateVolatility(this.calculateReturns());
        
        return {
            volatility: avgVolatility < 0.1 ? 'low' : avgVolatility < 0.3 ? 'medium' : 'high',
            trend: 'sideways', // Simplified
            sentiment: 'neutral' // Simplified
        };
    }

    private calculateRiskContributions(): { [token: string]: number } {
        const contributions: { [token: string]: number } = {};
        const totalRisk = this.calculateTotalRisk();
        
        this.tokens.forEach(token => {
            const tokenRisk = this.calculateTokenRisk(token);
            contributions[token.symbol] = totalRisk > 0 ? (tokenRisk / totalRisk) * 100 : 0;
        });

        return contributions;
    }

    private calculateReturnContributions(): { [token: string]: number } {
        const contributions: { [token: string]: number } = {};
        const totalReturn = this.calculatePortfolioReturn();
        
        this.tokens.forEach(token => {
            const tokenReturn = this.calculateExpectedReturn(token);
            contributions[token.symbol] = totalReturn > 0 ? (tokenReturn / totalReturn) * 100 : 0;
        });

        return contributions;
    }

    private calculateConcentrationRisk(): number {
        const weights = this.calculateCurrentWeights();
        const weightValues = Object.values(weights);
        const maxWeight = Math.max(...weightValues);
        const hhi = weightValues.reduce((sum, w) => sum + Math.pow(w / 100, 2), 0);
        
        return Math.max(maxWeight, hhi * 100);
    }

    private calculateCorrelationMatrix(): { [token1: string]: { [token2: string]: number } } {
        const matrix: { [token1: string]: { [token2: string]: number } } = {};
        
        this.tokens.forEach(token1 => {
            matrix[token1.symbol] = {};
            this.tokens.forEach(token2 => {
                if (token1.symbol === token2.symbol) {
                    matrix[token1.symbol][token2.symbol] = 1;
                } else {
                    // Simplified correlation - in real implementation, use historical price data
                    matrix[token1.symbol][token2.symbol] = Math.random() * 0.8 - 0.4; // Random correlation between -0.4 and 0.4
                }
            });
        });

        return matrix;
    }

    private calculateTotalRisk(): number {
        return this.tokens.reduce((sum, token) => sum + this.calculateTokenRisk(token), 0);
    }

    private calculateTokenRisk(token: Token): number {
        // Simplified risk calculation
        const marketCapRisk = token.marketCap > 0 ? Math.min(1, 1000000000 / token.marketCap) : 1;
        const convictionRisk = token.conviction === 'high' ? 0.1 : token.conviction === 'medium' ? 0.2 : 0.3;
        return marketCapRisk * convictionRisk;
    }

    private calculateExpectedReturn(token: Token): number {
        const currentValue = token.amount * token.price;
        const entryValue = token.amount * token.entryPrice;
        return entryValue > 0 ? (currentValue - entryValue) / entryValue : 0;
    }

    private calculateMomentumScores(lookbackPeriod: number): { [tokenId: string]: number } {
        const scores: { [tokenId: string]: number } = {};
        this.tokens.forEach(token => {
            // Simplified momentum calculation
            const currentValue = token.amount * token.price;
            const entryValue = token.amount * token.entryPrice;
            scores[token.id] = entryValue > 0 ? (currentValue - entryValue) / entryValue : 0;
        });
        return scores;
    }

    private allocateBasedOnMomentum(momentumScores: { [tokenId: string]: number }): { [tokenId: string]: number } {
        const totalMomentum = Object.values(momentumScores).reduce((sum, score) => sum + Math.max(0, score), 0);
        const weights: { [tokenId: string]: number } = {};

        this.tokens.forEach(token => {
            const momentum = Math.max(0, momentumScores[token.id] || 0);
            weights[token.id] = totalMomentum > 0 ? (momentum / totalMomentum) * 100 : 100 / this.tokens.length;
        });

        return this.normalizeWeights(weights);
    }

    private calculateMomentumConfidence(momentumScores: { [tokenId: string]: number }): number {
        const scores = Object.values(momentumScores);
        const avgMomentum = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const momentumVolatility = this.calculateVolatility(scores);
        
        // Higher confidence when momentum is strong and consistent
        return Math.min(0.9, Math.max(0.3, avgMomentum * 2 - momentumVolatility));
    }

    private optimizeForEqualRiskContribution(targetRiskContribution: number): { [tokenId: string]: number } {
        // Simplified equal risk contribution optimization
        const equalWeight = 100 / this.tokens.length;
        const weights: { [tokenId: string]: number } = {};
        
        this.tokens.forEach(token => {
            weights[token.id] = equalWeight;
        });

        return weights;
    }

    private calculateTotalReturn(): number {
        return this.calculatePortfolioReturn();
    }

    private calculateAnnualizedReturn(returns: number[]): number {
        if (returns.length === 0) return 0;
        const totalReturn = returns.reduce((sum, r) => sum + r, 0);
        return totalReturn / returns.length * 252; // Annualized (assuming daily returns)
    }

    private calculateWinRate(returns: number[]): number {
        if (returns.length === 0) return 0;
        const positiveReturns = returns.filter(r => r > 0).length;
        return positiveReturns / returns.length;
    }

    private calculateProfitFactor(returns: number[]): number {
        const positiveReturns = returns.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
        const negativeReturns = Math.abs(returns.filter(r => r < 0).reduce((sum, r) => sum + r, 0));
        return negativeReturns > 0 ? positiveReturns / negativeReturns : 0;
    }

    private calculateTrackingError(): number {
        // Simplified tracking error calculation
        return 0.15; // 15% tracking error
    }

    private calculateInformationRatio(): number {
        const alpha = this.calculateAlpha(this.calculatePortfolioReturn());
        const trackingError = this.calculateTrackingError();
        return trackingError > 0 ? alpha / trackingError : 0;
    }
}

// Export utility functions
export const createAdvancedOptimizer = (tokens: Token[]) => new AdvancedPortfolioOptimizer(tokens);

export const getOptimizationRecommendations = async (tokens: Token[]): Promise<{
    conservative: AdvancedRebalancePlan;
    balanced: AdvancedRebalancePlan;
    aggressive: AdvancedRebalancePlan;
    riskParity: AdvancedRebalancePlan;
}> => {
    if (!tokens || tokens.length === 0) {
        throw new Error('No tokens provided for optimization');
    }

    const optimizer = new AdvancedPortfolioOptimizer(tokens);

    // Use Promise.allSettled to handle potential failures gracefully
    const [conservativeResult, balancedResult, aggressiveResult, riskParityResult] = await Promise.allSettled([
        optimizer.optimizeWithAI({
            type: 'minimize_risk',
            timeHorizon: 'long',
            maxRisk: 0.15
        }),
        optimizer.optimizeWithAI({
            type: 'maximize_sharpe',
            timeHorizon: 'medium'
        }),
        optimizer.optimizeWithAI({
            type: 'maximize_return',
            timeHorizon: 'short',
            targetReturn: 0.3
        }),
        optimizer.optimizeRiskParity()
    ]);

    // Handle results and provide fallbacks
    const conservative = conservativeResult.status === 'fulfilled' ? 
        conservativeResult.value : 
        optimizer.optimizeMeanVariance({ type: 'minimize_risk', timeHorizon: 'long' });
    
    const balanced = balancedResult.status === 'fulfilled' ? 
        balancedResult.value : 
        optimizer.optimizeMeanVariance({ type: 'maximize_sharpe', timeHorizon: 'medium' });
    
    const aggressive = aggressiveResult.status === 'fulfilled' ? 
        aggressiveResult.value : 
        optimizer.optimizeMeanVariance({ type: 'maximize_return', timeHorizon: 'short' });
    
    const riskParity = riskParityResult.status === 'fulfilled' ? 
        riskParityResult.value : 
        optimizer.optimizeMeanVariance({ type: 'minimize_risk', timeHorizon: 'medium' });

    return { conservative, balanced, aggressive, riskParity };
};
