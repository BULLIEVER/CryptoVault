import { Token } from '../types';

// Simple, effective rebalancing interfaces
export interface RebalanceAction {
    token: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    amount: number;
    reason: string;
}

export interface RebalanceResult {
    strategy: string;
    actions: RebalanceAction[];
    totalValue: number;
    isBalanced: boolean;
    summary: string;
}

// Smart rotation algorithm - rotate from underperforming to high potential tokens
export function rebalancePortfolio(tokens: Token[], strategy: string): RebalanceResult {
    if (tokens.length < 2) {
        return {
            strategy,
            actions: [],
            totalValue: 0,
            isBalanced: true,
            summary: 'Need at least 2 tokens to rebalance'
        };
    }

    const totalValue = tokens.reduce((sum, t) => sum + (t.amount * t.price), 0);
    if (totalValue === 0) {
            return {
            strategy,
            actions: [],
            totalValue: 0,
            isBalanced: true,
            summary: 'Portfolio has no value'
        };
    }

    // Smart rotation strategy
    const actions: RebalanceAction[] = [];
    
    // Find tokens that are down significantly (if entry price is available)
    const underperformingTokens = tokens.filter(token => {
        if (!token.entryPrice || token.entryPrice <= 0 || !token.price || token.price <= 0) return false;
        const lossPercent = ((token.entryPrice - token.price) / token.entryPrice) * 100;
        return lossPercent >= 25; // Down 25% or more
    });

    // Find tokens with high potential (if market cap data is available)
    const highPotentialTokens = tokens.filter(token => {
        if (!token.marketCap || !token.targetMarketCap || token.marketCap <= 0 || token.targetMarketCap <= 0) return false;
        const potentialMultiplier = token.targetMarketCap / token.marketCap;
        return potentialMultiplier >= 3; // 3x+ potential
    });

    // If no tokens have entry prices or market cap data, create a simple equal weight recommendation
    if (underperformingTokens.length === 0 && highPotentialTokens.length === 0 && tokens.length >= 2) {
        // Find the token with the highest value (most over-weighted)
        const totalValue = tokens.reduce((sum, t) => sum + (t.amount * t.price), 0);
        const targetWeight = 100 / tokens.length;
        
        const overWeightedTokens = tokens.filter(token => {
            const currentValue = token.amount * token.price;
            const currentWeight = (currentValue / totalValue) * 100;
            return currentWeight > targetWeight * 1.5; // 50% more than target
        });

        const underWeightedTokens = tokens.filter(token => {
            const currentValue = token.amount * token.price;
            const currentWeight = (currentValue / totalValue) * 100;
            return currentWeight < targetWeight * 0.5; // 50% less than target
        });

        if (overWeightedTokens.length > 0 && underWeightedTokens.length > 0) {
            const worstToken = overWeightedTokens.reduce((worst, current) => {
                const worstValue = worst.amount * worst.price;
                const currentValue = current.amount * current.price;
                return currentValue > worstValue ? current : worst;
            });

            const bestToken = underWeightedTokens.reduce((best, current) => {
                const bestValue = best.amount * best.price;
                const currentValue = current.amount * current.price;
                return currentValue < bestValue ? current : best;
            });

            const worstTokenValue = worstToken.amount * worstToken.price;
            const rotationAmount = worstTokenValue * 0.3; // Sell 30% of over-weighted token

            actions.push({
                token: worstToken.name || 'Unknown',
                symbol: worstToken.symbol || 'UNK',
                action: 'SELL',
                amount: rotationAmount,
                reason: `Rebalance from over-weighted position`
            });

            actions.push({
                token: bestToken.name || 'Unknown',
                symbol: bestToken.symbol || 'UNK',
                action: 'BUY',
                amount: rotationAmount,
                reason: `Rebalance to under-weighted position`
            });
        }
    }

    // If we have underperforming tokens and high potential tokens, suggest rotation
    if (underperformingTokens.length > 0 && highPotentialTokens.length > 0) {
        // Find the worst performer
        const worstToken = underperformingTokens.reduce((worst, current) => {
            if (!worst.entryPrice || !worst.price || !current.entryPrice || !current.price) return current;
            const worstLoss = ((worst.entryPrice - worst.price) / worst.entryPrice) * 100;
            const currentLoss = ((current.entryPrice - current.price) / current.entryPrice) * 100;
            return currentLoss > worstLoss ? current : worst;
        });

        // Find the highest potential token
        const bestToken = highPotentialTokens.reduce((best, current) => {
            if (!best.targetMarketCap || !best.marketCap || !current.targetMarketCap || !current.marketCap) return current;
            const bestPotential = best.targetMarketCap / best.marketCap;
            const currentPotential = current.targetMarketCap / current.marketCap;
            return currentPotential > bestPotential ? current : best;
        });

        // Calculate rotation amount (sell 50% of worst performer)
        if (worstToken.amount && worstToken.price && bestToken.name && bestToken.symbol) {
            const worstTokenValue = worstToken.amount * worstToken.price;
            const rotationAmount = worstTokenValue * 0.5;

            // Add sell action for worst performer
            actions.push({
                token: worstToken.name || 'Unknown',
                symbol: worstToken.symbol || 'UNK',
                action: 'SELL',
                amount: rotationAmount,
                reason: `Rotate from underperformer (down ${worstToken.entryPrice && worstToken.price ? ((worstToken.entryPrice - worstToken.price) / worstToken.entryPrice * 100).toFixed(1) : 'N/A'}%)`
            });

            // Add buy action for best potential token
            actions.push({
                token: bestToken.name || 'Unknown',
                symbol: bestToken.symbol || 'UNK',
                action: 'BUY',
                amount: rotationAmount,
                reason: `Rotate to high potential (${bestToken.targetMarketCap && bestToken.marketCap ? (bestToken.targetMarketCap / bestToken.marketCap).toFixed(1) : 'N/A'}x potential)`
            });
        }
    }

    return {
        strategy: 'smart_rotation',
        actions,
        totalValue,
        isBalanced: actions.length === 0,
        summary: getSummary(actions, 'smart_rotation')
    };
}

// Smart rotation strategy definition
export const QUICK_STRATEGIES = {
    smart_rotation: {
        name: 'Smart Rotation',
        description: 'Rotate from underperforming to high potential tokens',
        icon: '🔄'
    }
};

// Helper function to get summary
function getSummary(actions: RebalanceAction[], strategy: string): string {
    if (actions.length === 0) {
        return 'Portfolio is balanced - no actions needed';
    }
    
    const buys = actions.filter(a => a.action === 'BUY').length;
    const sells = actions.filter(a => a.action === 'SELL').length;
    
    return `${buys} buys, ${sells} sells recommended`;
}

// Simple portfolio health check
export function getPortfolioHealth(tokens: Token[]): {
    score: number;
    issues: string[];
    suggestions: string[];
} {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    if (tokens.length === 0) {
        return { score: 0, issues: ['No tokens'], suggestions: ['Add tokens'] };
    }

    if (tokens.length === 1) {
        issues.push('Only 1 token');
        suggestions.push('Add more tokens');
        score -= 30;
    }

    // Check for missing entry prices
    const missingEntryPrices = tokens.filter(t => !t.entryPrice || t.entryPrice <= 0).length;
    if (missingEntryPrices > 0) {
        issues.push(`${missingEntryPrices} tokens missing entry prices`);
        suggestions.push('Add entry prices for better rebalancing');
        score -= 20;
    }

    // Check for over-concentration
    const totalValue = tokens.reduce((sum, t) => sum + (t.amount * t.price), 0);
    if (totalValue > 0) {
        const maxWeight = Math.max(...tokens.map(t => (t.amount * t.price / totalValue) * 100));
        if (maxWeight > 60) {
            issues.push('Over-concentrated');
            suggestions.push('Diversify more');
            score -= 15;
        }
    }

    return { score: Math.max(0, score), issues, suggestions };
}
