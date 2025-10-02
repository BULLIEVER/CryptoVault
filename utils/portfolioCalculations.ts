import { Token, PortfolioValues, StrategyComparison, StrategyResult, StrategyStage, ExitStrategyType, TopOpportunity, PortfolioProjection, ProjectedExit, AiRebalancePlan } from '../types';
import { formatCurrency } from './formatters';
import { GoogleGenAI, Type } from "@google/genai";

export const calculatePortfolioValues = (tokens: Token[]): PortfolioValues => {
    let total = 0;
    let target = 0;
    let highestPotentialToken: Token | null = null;
    let highestMultiplier = 0;

    tokens.forEach(token => {
        const value = (token.amount || 0) * (token.price || 0);
        total += value;

        // Use the selected strategy to determine the realistic target value for this token
        const strategyResult = compareStrategies(token).selectedStrategy;
        const tokenTargetValue = strategyResult.totalExitValue;
        target += tokenTargetValue;
        
        // The "highest potential" should still be based on the raw multiplier,
        // as it indicates which token has the most room to grow, regardless of strategy.
        const marketCap = token.marketCap || 0;
        const targetMarketCap = token.targetMarketCap || 0;
        if (marketCap > 0 && targetMarketCap > 0) {
            const multiplier = targetMarketCap / marketCap;
            if (multiplier > highestMultiplier) {
                highestMultiplier = multiplier;
                highestPotentialToken = token;
            }
        }
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
    progressive: {
        name: 'Progressive Realization',
        description: 'Sell progressively as the token nears its target (at 50%, 75%, 90%, and 100% of target MC).',
        // Stages are calculated dynamically based on the token's specific target
    },
    ladder: {
        name: 'Smart Ladder Exit',
        description: 'Dynamic ladder based on token potential. Higher potential = later exits, lower potential = earlier exits.',
        // Stages calculated dynamically based on potential
    },
    conservative: {
        name: 'Risk-Adjusted Exit',
        description: 'Conservative exits scaled to token potential. Low potential = early exits, high potential = later exits.',
        // Stages calculated dynamically based on potential
    },
    moonOrBust: {
        name: 'Potential-Based Moon',
        description: 'Secure profits early for low potential, let high potential tokens ride longer.',
        // Stages calculated dynamically based on potential
    },
    kelly: {
        name: 'Kelly Criterion Exit',
        description: 'Mathematically optimal exits based on win probability and risk-reward ratio.',
        // Stages calculated using Kelly Criterion
    }
};

// Calculate dynamic exit stages based on token potential
export const calculateDynamicStages = (token: Token, strategyType: string): { percentage: number, multiplier: number }[] => {
    const { marketCap = 0, targetMarketCap = 0, entryPrice = 0, price = 0 } = token;
    
    if (marketCap <= 0 || targetMarketCap <= 0 || entryPrice <= 0 || price <= 0) {
        return [];
    }
    
    const potentialMultiplier = targetMarketCap / marketCap;
    const currentMultiplier = price / entryPrice;
    
    // Categorize potential levels
    const isLowPotential = potentialMultiplier < 5;      // < 5x potential
    const isMediumPotential = potentialMultiplier >= 5 && potentialMultiplier < 20;  // 5x-20x potential
    const isHighPotential = potentialMultiplier >= 20;   // > 20x potential
    
    switch (strategyType) {
        case 'ladder':
            if (isLowPotential) {
                // Low potential: exit early and often
                return [
                    { percentage: 40, multiplier: Math.min(currentMultiplier * 1.5, potentialMultiplier * 0.3) },
                    { percentage: 35, multiplier: Math.min(currentMultiplier * 2, potentialMultiplier * 0.6) },
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 3, potentialMultiplier * 0.9) },
                ];
            } else if (isMediumPotential) {
                // Medium potential: balanced approach
                return [
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 2, potentialMultiplier * 0.25) },
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 4, potentialMultiplier * 0.5) },
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 8, potentialMultiplier * 0.75) },
                    { percentage: 20, multiplier: Math.min(currentMultiplier * 12, potentialMultiplier * 1.0) },
                ];
            } else {
                // High potential: let it ride longer
                return [
                    { percentage: 15, multiplier: Math.min(currentMultiplier * 3, potentialMultiplier * 0.2) },
                    { percentage: 20, multiplier: Math.min(currentMultiplier * 6, potentialMultiplier * 0.4) },
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 12, potentialMultiplier * 0.6) },
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 20, potentialMultiplier * 0.8) },
                    { percentage: 15, multiplier: Math.min(currentMultiplier * 30, potentialMultiplier * 1.0) },
                ];
            }
            
        case 'conservative':
            if (isLowPotential) {
                // Low potential: very conservative
                return [
                    { percentage: 50, multiplier: Math.min(currentMultiplier * 1.5, potentialMultiplier * 0.4) },
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 2.5, potentialMultiplier * 0.8) },
                    { percentage: 20, multiplier: Math.min(currentMultiplier * 4, potentialMultiplier * 1.0) },
                ];
            } else if (isMediumPotential) {
                // Medium potential: moderate conservative
                return [
                    { percentage: 35, multiplier: Math.min(currentMultiplier * 2, potentialMultiplier * 0.3) },
                    { percentage: 35, multiplier: Math.min(currentMultiplier * 5, potentialMultiplier * 0.6) },
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 10, potentialMultiplier * 1.0) },
                ];
            } else {
                // High potential: less conservative
                return [
                    { percentage: 25, multiplier: Math.min(currentMultiplier * 3, potentialMultiplier * 0.2) },
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 8, potentialMultiplier * 0.5) },
                    { percentage: 45, multiplier: Math.min(currentMultiplier * 15, potentialMultiplier * 1.0) },
                ];
            }
            
        case 'moonOrBust':
            if (isLowPotential) {
                // Low potential: secure profits early
                return [
                    { percentage: 60, multiplier: Math.min(currentMultiplier * 2, potentialMultiplier * 0.5) },
                    { percentage: 40, multiplier: Math.min(currentMultiplier * 4, potentialMultiplier * 1.0) },
                ];
            } else if (isMediumPotential) {
                // Medium potential: balanced moon strategy
                return [
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 3, potentialMultiplier * 0.3) },
                    { percentage: 30, multiplier: Math.min(currentMultiplier * 8, potentialMultiplier * 0.7) },
                    // 40% held for potential moon
                ];
            } else {
                // High potential: let it ride
                return [
                    { percentage: 20, multiplier: Math.min(currentMultiplier * 5, potentialMultiplier * 0.25) },
                    { percentage: 20, multiplier: Math.min(currentMultiplier * 12, potentialMultiplier * 0.5) },
                    // 60% held for potential moon
                ];
            }
            
        case 'kelly':
            // Kelly Criterion: f* = (bp - q) / b
            // where b = odds received (potential multiplier), p = win probability, q = loss probability
            const winProbability = Math.min(0.7, Math.max(0.3, 1 - (potentialMultiplier / 100))); // Higher potential = lower win probability
            const lossProbability = 1 - winProbability;
            const kellyPercentage = Math.max(0.1, Math.min(0.5, (potentialMultiplier * winProbability - lossProbability) / potentialMultiplier));
            
            if (isLowPotential) {
                // Low potential: Kelly suggests smaller position sizes
                const adjustedKelly = kellyPercentage * 0.6; // Reduce position size for low potential
                return [
                    { percentage: adjustedKelly * 100, multiplier: Math.min(currentMultiplier * 2, potentialMultiplier * 0.5) },
                    { percentage: (1 - adjustedKelly) * 100, multiplier: Math.min(currentMultiplier * 4, potentialMultiplier * 1.0) },
                ];
            } else if (isMediumPotential) {
                // Medium potential: standard Kelly
                return [
                    { percentage: kellyPercentage * 100, multiplier: Math.min(currentMultiplier * 3, potentialMultiplier * 0.4) },
                    { percentage: kellyPercentage * 100, multiplier: Math.min(currentMultiplier * 6, potentialMultiplier * 0.7) },
                    { percentage: (1 - 2 * kellyPercentage) * 100, multiplier: Math.min(currentMultiplier * 10, potentialMultiplier * 1.0) },
                ];
            } else {
                // High potential: Kelly suggests larger position sizes
                const adjustedKelly = kellyPercentage * 1.2; // Increase position size for high potential
                return [
                    { percentage: adjustedKelly * 100, multiplier: Math.min(currentMultiplier * 5, potentialMultiplier * 0.3) },
                    { percentage: adjustedKelly * 100, multiplier: Math.min(currentMultiplier * 10, potentialMultiplier * 0.6) },
                    { percentage: (1 - 2 * adjustedKelly) * 100, multiplier: Math.min(currentMultiplier * 20, potentialMultiplier * 1.0) },
                ];
            }
            
        default:
            return [];
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
    const { exitStrategy, customExitStages, price, entryPrice, marketCap, targetMarketCap } = token;
    
    // FIX: Refactored the strategy selection logic to be more explicit and type-safe.
    // This resolves a TypeScript error where it couldn't guarantee that `STRATEGY_CONFIG[exitStrategy]` had a `stages` property.
    if (exitStrategy === 'ai' && customExitStages) {
        selectedStrategy = calculateTokenStrategy(token, customExitStages);
    } else if (exitStrategy === 'progressive') {
        const progressiveConfig = [
            { sellPercent: 15, progressPercent: 50 },
            { sellPercent: 20, progressPercent: 75 },
            { sellPercent: 25, progressPercent: 90 },
            { sellPercent: 40, progressPercent: 100 },
        ];
        
        const canCalculate = price > 0 && entryPrice > 0 && marketCap > 0 && targetMarketCap > marketCap;
        const dynamicStages = canCalculate ? progressiveConfig.map(stage => {
            const targetPriceAtProgress = price * ((targetMarketCap * (stage.progressPercent / 100)) / marketCap);
            const multiplier = targetPriceAtProgress / entryPrice;
            return { percentage: stage.sellPercent, multiplier };
        }) : [];

        selectedStrategy = calculateTokenStrategy(token, dynamicStages);

    } else if (exitStrategy === 'ladder' || exitStrategy === 'conservative' || exitStrategy === 'moonOrBust' || exitStrategy === 'kelly') {
        const dynamicStages = calculateDynamicStages(token, exitStrategy);
        selectedStrategy = calculateTokenStrategy(token, dynamicStages);
    } else { 
        // Default to "All at Target" for 'targetMC' or any other unhandled strategy.
        selectedStrategy = calculateTokenStrategy(token);
    }
    
    const allAtOnce = calculateTokenStrategy(token);

    const winner = selectedStrategy.totalExitValue >= allAtOnce.totalExitValue ? 'selectedStrategy' : 'allAtOnce';
    const difference = Math.abs(selectedStrategy.totalExitValue - allAtOnce.totalExitValue);
    const differencePercentage = allAtOnce.totalExitValue > 0 ? (difference / allAtOnce.totalExitValue) * 100 : 0;
    
    return { selectedStrategy, allAtOnce, winner, difference, differencePercentage };
};

export const generateAiStrategy = async (
    token: Partial<Token>,
    desiredProfit: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): Promise<{ stages: { percentage: number, multiplier: number }[], warning?: string }> => {
    
    const { amount = 0, entryPrice = 0, marketCap = 0, targetMarketCap = 0, price = 0 } = token;
    const initialInvestment = amount * entryPrice;
    
    if (initialInvestment <= 0 || desiredProfit <= 0 || marketCap <= 0 || targetMarketCap <= 0 || price <= 0 || entryPrice <= 0) {
        return { stages: [], warning: "Missing critical token data for AI analysis." };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `You are a crypto investment strategist. Create a staged exit plan for a token.
    
    Token Data:
    - Symbol: ${token.symbol || 'N/A'}
    - Current Price: ${formatCurrency(price)}
    - Entry Price: ${formatCurrency(entryPrice)}
    - Current Market Cap: ${formatCurrency(marketCap)}
    - Target Market Cap: ${formatCurrency(targetMarketCap)}
    
    User Goals:
    - Desired Profit: ${formatCurrency(desiredProfit)}
    - Risk Tolerance: ${riskTolerance}
    
    Instructions:
    1. Create a series of exit stages. Each stage must have a "percentage" of the total tokens to sell and a profit "multiplier" based on the entry price.
    2. The sum of all "percentage" values must be exactly 100.
    3. The profit from the plan should aim to meet the desired profit without exceeding the token's maximum potential profit at its target market cap.
    4. If the desired profit is unrealistic, create a plan that maximizes profit within the token's potential and add a "warning" message explaining this.
    5. Base the number of stages and multiplier values on the risk tolerance (e.g., conservative = more stages, lower multipliers).
    
    Return ONLY a valid JSON object matching the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        stages: {
                            type: Type.ARRAY,
                            description: 'The exit stages.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    percentage: { type: Type.NUMBER, description: 'Percentage of tokens to sell.' },
                                    multiplier: { type: Type.NUMBER, description: 'Profit multiplier from entry price.' },
                                },
                                required: ['percentage', 'multiplier'],
                            },
                        },
                        warning: { type: Type.STRING, description: 'A warning if the profit goal is unachievable.' },
                    },
                },
            },
        });
        
        const result = JSON.parse(response.text);
        
        // Basic validation
        if (!result.stages || !Array.isArray(result.stages)) {
            throw new Error("Invalid AI response: 'stages' array is missing.");
        }
        
        return result;

    } catch (error) {
        console.error("Error generating AI strategy:", error);
        throw new Error("The AI failed to generate a strategy. Please try again.");
    }
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

export const getAiRebalancePlan = async (tokens: Token[], goal: 'profit' | 'risk' | 'accelerate'): Promise<AiRebalancePlan> => {
    if (tokens.length < 2) {
        return { sells: [], buy: null, rationale: "Rebalancing requires at least two assets." };
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const portfolioSummary = tokens.map(t => ({
        symbol: t.symbol,
        value_usd: (t.amount || 0) * (t.price || 0),
        pnl_percent: (t.entryPrice > 0 ? ((t.price - t.entryPrice) / t.entryPrice) * 100 : 0),
        progress_to_target_percent: (t.marketCap > 0 && t.targetMarketCap > 0 ? (t.marketCap / t.targetMarketCap) * 100 : 0),
        potential_multiplier: (t.marketCap > 0 && t.targetMarketCap > t.marketCap ? t.targetMarketCap / t.marketCap : 1),
        conviction: t.conviction
    }));
    
    const goalDescription = {
        profit: "Take Profits: Secure gains from tokens that are near their target or have performed well.",
        risk: "Reduce Risk: Trim oversized positions to diversify and protect the portfolio from a single asset's volatility.",
        accelerate: "Accelerate Growth: Move capital from underperforming assets to those with higher potential."
    };
    
    const prompt = `You are a crypto portfolio optimization expert. My portfolio is:
    ${JSON.stringify(portfolioSummary, null, 2)}
    
    My primary goal is: "${goalDescription[goal]}"
    
    Instructions:
    1. Analyze the portfolio based on my goal.
    2. Identify up to 3 tokens to SELL. For each, specify the "symbol" and the "percentage" of that holding to sell (e.g., 10, 20, 25).
    3. Identify ONE token to BUY with the proceeds. It must be from the existing portfolio. Specify its "symbol".
    4. Provide a top-level "rationale" summarizing your overall strategy in one or two sentences.
    
    Return ONLY a valid JSON object matching the provided schema.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sells: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    symbol: { type: Type.STRING },
                                    percentage: { type: Type.NUMBER },
                                },
                                required: ['symbol', 'percentage'],
                            }
                        },
                        buy: {
                            type: Type.OBJECT,
                            properties: {
                                symbol: { type: Type.STRING },
                            },
                        },
                        rationale: { type: Type.STRING }
                    },
                     required: ['sells', 'rationale'],
                }
            }
        });
        
        const plan = JSON.parse(response.text);
        
        if (!plan.sells || !plan.rationale) {
             throw new Error("Invalid AI response format.");
        }

        return plan;

    } catch (error) {
        console.error("Error generating AI rebalance plan:", error);
        throw new Error("Could not generate an AI rebalancing plan.");
    }
};

export const calculatePortfolioProjection = (tokens: Token[]): PortfolioProjection => {
    const projectedExits: ProjectedExit[] = [];
    if (!tokens || tokens.length === 0) {
        return { projectedExits: [] };
    }

    const currentPortfolioTotal = tokens.reduce((sum, token) => sum + (token.amount * token.price), 0);

    tokens.forEach(token => {
        if (!token.price || token.price <= 0 || !token.amount || token.amount <= 0) return;

        const tokenCurrentValue = token.amount * token.price;
        const strategy = compareStrategies(token).selectedStrategy;
        
        const getProjectedTotal = (exitPrice: number) => {
             const tokenNewValue = token.amount * exitPrice;
             return currentPortfolioTotal - tokenCurrentValue + tokenNewValue;
        };
        
        if (strategy.profitStages && strategy.profitStages.length > 0) {
            let totalPercentageSold = 0;
            strategy.profitStages.forEach(stage => {
                if (stage.price > token.price) { 
                    projectedExits.push({
                        projectedPortfolioValue: getProjectedTotal(stage.price),
                        cashOutValue: (token.amount * (stage.percentage / 100)) * stage.price,
                        tokenSymbol: token.symbol,
                        tokenImageUrl: token.imageUrl
                    });
                    totalPercentageSold += stage.percentage;
                }
            });
            
            if (totalPercentageSold < 99.9 && strategy.targetPrice > token.price) {
                const remainingPercentage = 100 - totalPercentageSold;
                const lastStagePrice = strategy.profitStages.length > 0 ? strategy.profitStages[strategy.profitStages.length - 1].price : 0;
                if (strategy.targetPrice > lastStagePrice) {
                    projectedExits.push({
                        projectedPortfolioValue: getProjectedTotal(strategy.targetPrice),
                        cashOutValue: (token.amount * (remainingPercentage / 100)) * strategy.targetPrice,
                        tokenSymbol: token.symbol,
                        tokenImageUrl: token.imageUrl
                    });
                }
            }
        } else if (strategy.targetPrice > token.price) {
            projectedExits.push({
                projectedPortfolioValue: getProjectedTotal(strategy.targetPrice),
                cashOutValue: token.amount * strategy.targetPrice,
                tokenSymbol: token.symbol,
                tokenImageUrl: token.imageUrl
            });
        }
    });

    return { projectedExits: projectedExits.sort((a, b) => a.projectedPortfolioValue - b.projectedPortfolioValue) };
};