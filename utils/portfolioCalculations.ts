import { Token, PortfolioValues, StrategyComparison, StrategyResult, StrategyStage, ExitStrategyType, PortfolioProjection, AggregatedExitStage, TopOpportunity } from '../types';
import { formatCurrency } from './formatters';

export const calculatePortfolioValues = (tokens: Token[]): PortfolioValues => {
    let total = 0;
    let target = 0;
    let highestPotentialToken: Token | null = null;
    let highestMultiplier = 0;

    tokens.forEach(token => {
        const value = (token.amount || 0) * (token.price || 0);
        total += value;

        let tokenTargetValue = value;
        const marketCap = token.marketCap || 0;
        const targetMarketCap = token.targetMarketCap || 0;

        if (marketCap > 0 && targetMarketCap > 0) {
            const multiplier = targetMarketCap / marketCap;
            tokenTargetValue = value * multiplier;

            if (multiplier > highestMultiplier) {
                highestMultiplier = multiplier;
                highestPotentialToken = token;
            }
        }
        target += tokenTargetValue;
    });

    const growthMultiplier = total > 0 ? target / total : 0;
    const growthPercentage = (growthMultiplier - 1) * 100;

    return {
        total,
        target,
        growthMultiplier,
        growthPercentage,
        highestPotentialToken,
    };
};

export const STRATEGY_CONFIG = {
    ladder: {
        name: 'Ladder Exit',
        description: 'Sell 25% at 2x, 4x, 8x, and 16x profit multipliers.',
        stages: [
            { percentage: 25, multiplier: 2 },
            { percentage: 25, multiplier: 4 },
            { percentage: 25, multiplier: 8 },
            { percentage: 25, multiplier: 16 },
        ]
    },
    conservative: {
        name: 'Conservative Exit',
        description: 'Take profits earlier. Sell 33.3% at 3x, 6x, and 10x.',
        stages: [
            { percentage: 33.33, multiplier: 3 },
            { percentage: 33.33, multiplier: 6 },
            { percentage: 33.33, multiplier: 10 },
        ]
    },
    moonOrBust: {
        name: 'Moon or Bust',
        description: 'Secure initial investment and some profit, let the rest ride. Sell 25% at 5x and 10x, hold 50%.',
        stages: [
            { percentage: 25, multiplier: 5 },
            { percentage: 25, multiplier: 10 },
        ]
    }
};

export const calculateTokenStrategy = (token: Token, stages?: { percentage: number, multiplier: number }[]): StrategyResult => {
    const { 
        amount = 0, 
        price = 0, 
        entryPrice = 0, 
        marketCap = 0, 
        targetMarketCap = 0 
    } = token || {};

    const currentValue = amount * price;
    const initialInvestment = amount * entryPrice;

    if (marketCap <= 0 || targetMarketCap <= 0 || entryPrice <= 0) {
        const profit = currentValue - initialInvestment;
        const profitPercentage = initialInvestment > 0 ? (profit / initialInvestment) * 100 : 0;
        return { currentValue, targetPrice: price, growthMultiplier: 1, totalExitValue: currentValue, profit, profitPercentage };
    }
    
    const growthMultiplier = targetMarketCap / marketCap;
    const targetPrice = price * growthMultiplier;
    
    if (!stages || stages.length === 0) { // This is for "All at Target"
        const totalExitValue = amount * targetPrice;
        const profit = totalExitValue - initialInvestment;
        const profitPercentage = initialInvestment > 0 ? (profit / initialInvestment) * 100 : 0;
        return { currentValue, targetPrice, growthMultiplier, totalExitValue, profit, profitPercentage };
    }
    
    let totalExitValue = 0;
    const profitStages: StrategyStage[] = [];
    let remainingAmount = amount;

    stages.forEach(stage => {
        let stagePrice = entryPrice * stage.multiplier;
        if (stagePrice > targetPrice) { // Cap exit price at target price
            stagePrice = targetPrice;
            stage.multiplier = targetPrice / entryPrice;
        }

        const amountToSell = amount * (stage.percentage / 100);
        if (remainingAmount - amountToSell < -0.00001) { // Floating point precision
           return;
        }
        remainingAmount -= amountToSell;
        const value = amountToSell * stagePrice;
        totalExitValue += value;
        
        profitStages.push({
            percentage: stage.percentage,
            amount: amountToSell,
            multiplier: stage.multiplier,
            price: stagePrice,
            value: value,
        });
    });

    if (remainingAmount > 0.00001) {
        totalExitValue += remainingAmount * targetPrice;
    }

    const profit = totalExitValue - initialInvestment;
    const profitPercentage = initialInvestment > 0 ? (profit / initialInvestment) * 100 : 0;

    return {
        currentValue,
        targetPrice,
        growthMultiplier,
        totalExitValue,
        profit,
        profitPercentage,
        profitStages,
    };
};

/**
 * Compares a token's selected exit strategy against the default 'All at Target' strategy.
 * This function is now hardened to prevent crashes if an invalid token object is passed.
 * @param token The token object to analyze.
 * @returns A comparison object with results for both strategies.
 */
export const compareStrategies = (token: Token): StrategyComparison => {
    // Defensive check to prevent crashes on invalid data.
    if (!token) {
        const emptyResult: StrategyResult = { currentValue: 0, targetPrice: 0, growthMultiplier: 0, totalExitValue: 0, profit: 0, profitPercentage: 0 };
        return { selectedStrategy: emptyResult, allAtOnce: emptyResult, winner: 'allAtOnce', difference: 0, differencePercentage: 0 };
    }

    let selectedStrategy: StrategyResult;
    const { exitStrategy, customExitStages } = token;
    
    const isValidPrebuiltStrategy = exitStrategy && exitStrategy !== 'targetMC' && exitStrategy !== 'ai' && STRATEGY_CONFIG.hasOwnProperty(exitStrategy);

    if (exitStrategy === 'ai' && customExitStages) {
        selectedStrategy = calculateTokenStrategy(token, customExitStages);
    } else if (isValidPrebuiltStrategy) {
        selectedStrategy = calculateTokenStrategy(token, STRATEGY_CONFIG[exitStrategy as keyof typeof STRATEGY_CONFIG].stages);
    } else { 
        selectedStrategy = calculateTokenStrategy(token);
    }
    
    const allAtOnce = calculateTokenStrategy(token);

    const winner = selectedStrategy.totalExitValue >= allAtOnce.totalExitValue ? 'selectedStrategy' : 'allAtOnce';
    const difference = Math.abs(selectedStrategy.totalExitValue - allAtOnce.totalExitValue);
    const differencePercentage = allAtOnce.totalExitValue > 0 ? (difference / allAtOnce.totalExitValue) * 100 : 0;
    
    return { selectedStrategy, allAtOnce, winner, difference, differencePercentage };
};

export const generateAiStrategy = (
    token: Partial<Token>,
    desiredProfit: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): { stages: { percentage: number, multiplier: number }[], warning?: string } => {
    
    const { amount = 0, entryPrice = 0, price = 0, marketCap = 0, targetMarketCap = 0 } = token;
    const initialInvestment = amount * entryPrice;
    
    if (initialInvestment <= 0 || desiredProfit <= 0 || marketCap <= 0 || targetMarketCap <= 0 || price <= 0 || entryPrice <= 0) {
        return { stages: [] };
    }

    const targetPrice = price * (targetMarketCap / marketCap);
    const maxProfit = (amount * targetPrice) - initialInvestment;
    let warning: string | undefined;
    
    if (desiredProfit > maxProfit) {
        warning = `Profit goal exceeds max potential of ${formatCurrency(maxProfit)}. Strategy adjusted to target max.`;
        desiredProfit = maxProfit;
    }
        
    const riskFactors = {
        conservative: { stages: 4, startMultiplier: 2, multiplierStep: 2 },
        moderate: { stages: 3, startMultiplier: 3, multiplierStep: 3 },
        aggressive: { stages: 2, startMultiplier: 5, multiplierStep: 5 }
    };

    const config = riskFactors[riskTolerance];
    const stages: { percentage: number, multiplier: number }[] = [];
    
    const percentages = {
        conservative: [40, 30, 20, 10],
        moderate: [33.3, 33.3, 33.4],
        aggressive: [50, 50],
    }[riskTolerance];

    for (let i = 0; i < config.stages; i++) {
        const multiplier = config.startMultiplier + (i * config.multiplierStep);
        stages.push({
            percentage: percentages[i],
            multiplier: multiplier,
        });
    }

    const simulatedResult = calculateTokenStrategy(token as Token, stages);
    if (simulatedResult.profit < desiredProfit * 0.9) {
       stages.length = 0;
       const firstMultiplier = 2;
       const firstSellPercentage = Math.min(100, (initialInvestment / (amount * entryPrice * firstMultiplier)) * 100);
       
       stages.push({ percentage: firstSellPercentage, multiplier: firstMultiplier });
       
       const remainingAmount = amount * (1 - (firstSellPercentage / 100));
       const profitNeeded = desiredProfit - ( (amount * firstSellPercentage/100 * entryPrice * firstMultiplier) - (amount * firstSellPercentage/100 * entryPrice));
       const valueNeeded = profitNeeded + (remainingAmount * entryPrice);
       const priceNeeded = remainingAmount > 0 ? valueNeeded / remainingAmount : 0;
       const secondMultiplier = entryPrice > 0 ? priceNeeded / entryPrice : 0;

       if (remainingAmount > 0.0001 && secondMultiplier > firstMultiplier) {
         stages.push({ percentage: 100 - firstSellPercentage, multiplier: secondMultiplier });
       }
    }
    
    const totalPercent = stages.reduce((acc, s) => acc + s.percentage, 0);
    if(totalPercent > 0 && Math.abs(100 - totalPercent) > 0.1) {
       const factor = 100 / totalPercent;
       stages.forEach(s => s.percentage *= factor);
    }

    return { stages, warning };
};

export const findTopOpportunities = (tokens: Token[]): TopOpportunity[] => {
    if (!tokens || tokens.length === 0) {
        return [];
    }

    const opportunities = tokens
        .filter(token => (token.marketCap || 0) > 0 && (token.targetMarketCap || 0) > 0)
        .map(token => {
            const potentialMultiplier = (token.targetMarketCap || 1) / (token.marketCap || 1);
            return { ...token, potentialMultiplier };
        });

    // Sort by the largest multiplier first and take the top 5
    return opportunities.sort((a, b) => b.potentialMultiplier - a.potentialMultiplier).slice(0, 5);
};


export const calculatePortfolioProjection = (tokens: Token[]): PortfolioProjection => {
    let totalInvestment = 0;
    let totalPotentialProfit = 0;
    let totalCashedOutValue = 0;
    const allExitStages: AggregatedExitStage[] = [];
    const profitContribution: { name: string; profit: number }[] = [];

    tokens.forEach(token => {
        const investment = (token.amount || 0) * (token.entryPrice || 0);
        totalInvestment += investment;
        
        const strategy = compareStrategies(token).selectedStrategy;
        const tokenProfit = strategy.profit;
        totalPotentialProfit += tokenProfit;
        totalCashedOutValue += strategy.totalExitValue;
        
        profitContribution.push({ name: token.symbol, profit: tokenProfit });

        if (strategy.profitStages && strategy.profitStages.length > 0) {
            strategy.profitStages.forEach(stage => {
                allExitStages.push({
                    multiplier: stage.multiplier,
                    cashOutValue: stage.value,
                    tokenSymbol: token.symbol,
                    tokenName: token.name,
                    tokenImageUrl: token.imageUrl
                });
            });
        } else {
            const { allAtOnce } = compareStrategies(token);
            const targetPrice = allAtOnce.targetPrice;
            const entryPrice = token.entryPrice || 0;
            const targetMC_Multiplier = entryPrice > 0 ? targetPrice / entryPrice : 0;
            
            allExitStages.push({
                multiplier: targetMC_Multiplier,
                cashOutValue: allAtOnce.totalExitValue,
                tokenSymbol: token.symbol,
                tokenName: token.name,
                tokenImageUrl: token.imageUrl
            });
        }
    });

    const overallProfitPercentage = totalInvestment > 0 ? (totalPotentialProfit / totalInvestment) * 100 : 0;
    
    allExitStages.sort((a, b) => a.multiplier - b.multiplier);
    profitContribution.sort((a, b) => b.profit - a.profit);
    
    return {
        totalInvestment,
        totalPotentialProfit,
        totalCashedOutValue,
        overallProfitPercentage,
        exitStages: allExitStages,
        profitContribution
    };
};