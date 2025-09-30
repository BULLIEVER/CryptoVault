// To run these tests, you would typically install a test runner like Vitest:
// `npm install -D vitest`
// And then run `npx vitest` in your terminal.

// Note: For this environment, we'll define dummy test functions 
// to avoid breaking the application, as 'vitest' is not available.
const describe = (name: string, fn: () => void) => fn();
const it = (name: string, fn: () => void) => fn();
const expect = (value: any) => ({
    toBe: (expected: any) => { if (value !== expected) console.error(`Assertion failed: ${value} is not ${expected}`) },
    toEqual: (expected: any) => { if (JSON.stringify(value) !== JSON.stringify(expected)) console.error(`Assertion failed on deep equal for value: ${JSON.stringify(value)} and expected: ${JSON.stringify(expected)}`) },
    toHaveLength: (expected: number) => { if (!value || value.length !== expected) console.error(`Assertion failed: length ${value ? value.length : 'undefined'} is not ${expected}`) },
    toBeCloseTo: (expected: number, precision = 2) => {
        const pass = Math.abs(expected - value) < (Math.pow(10, -precision) / 2);
        if (!pass) console.error(`Assertion failed: ${value} is not close to ${expected} with precision ${precision}`);
    },
    toBeDefined: () => { if (value === undefined || value === null) console.error(`Assertion failed: value is not defined`) },
    toBeUndefined: () => { if (value !== undefined) console.error(`Assertion failed: value is not undefined`) },
});


// FIX: Removed getRebalanceCandidates as it's no longer exported.
import { calculateTokenStrategy, compareStrategies, STRATEGY_CONFIG } from './portfolioCalculations';
import { Token } from '../types';

// Mock base token data to avoid repetition
const createMockToken = (overrides: Partial<Token>): Token => ({
    id: overrides.symbol || Math.random().toString(),
    chain: 'solana',
    pairAddress: '0x' + Math.random().toString(16).slice(2, 10),
    name: 'Mock Token',
    symbol: 'MOCK',
    amount: 100,
    price: 1,
    entryPrice: 1,
    marketCap: 1_000_000,
    targetMarketCap: 10_000_000,
    exitStrategy: 'targetMC',
    // FIX: Add default conviction to satisfy the Token type, as it's a required property.
    conviction: 'medium',
    customExitStages: [],
    imageUrl: '',
    percentChange24h: 0,
    ...overrides,
});

describe('calculateTokenStrategy', () => {
    const baseToken = createMockToken({
        amount: 100,
        price: 2,
        entryPrice: 1,
        marketCap: 2_000_000,
        targetMarketCap: 40_000_000, // 20x potential from current MC, so targetPrice = $40
    });

    it('should correctly calculate for "All at Target" (targetMC) strategy', () => {
        const result = calculateTokenStrategy(baseToken);
        const initialInvestment = 100 * 1; // 100
        const expectedExitValue = 100 * 40; // 4000
        
        expect(result.totalExitValue).toBeCloseTo(expectedExitValue);
        expect(result.profit).toBeCloseTo(expectedExitValue - initialInvestment);
        expect(result.profitStages).toBeUndefined();
    });

    it('should correctly calculate for the "Ladder Exit" strategy', () => {
        // Stages: 25% @ 2x, 4x, 8x, 16x. Entry Price: $1. Exit prices: $2, $4, $8, $16. All < $40 target.
        const result = calculateTokenStrategy(baseToken, STRATEGY_CONFIG.ladder.stages);
        const expectedExitValue = (25 * 2) + (25 * 4) + (25 * 8) + (25 * 16); // 50 + 100 + 200 + 400 = 750
        
        expect(result.totalExitValue).toBeCloseTo(750);
        expect(result.profitStages).toBeDefined();
        expect(result.profitStages).toHaveLength(4);
        expect(result.profitStages![3].price).toBeCloseTo(16);
    });

    it('should cap exit prices at the target price if multipliers exceed it', () => {
        const lowTargetToken = { ...baseToken, targetMarketCap: 6_000_000 }; // 3x potential from current MC, so targetPrice = $6
        // Stages: 25% @ 2x, 4x, 8x(capped at $6), $16(capped at $6). Entry Price: $1. Exit prices: $2, $4, $6, $6.
        const result = calculateTokenStrategy(lowTargetToken, STRATEGY_CONFIG.ladder.stages);
        const expectedExitValue = (25 * 2) + (25 * 4) + (25 * 6) + (25 * 6); // 50 + 100 + 150 + 150 = 450

        expect(result.totalExitValue).toBeCloseTo(450);
        expect(result.profitStages).toBeDefined();
        expect(result.profitStages).toHaveLength(4);
        expect(result.profitStages![1].price).toBeCloseTo(4); // 4x stage, price $4
        expect(result.profitStages![2].price).toBeCloseTo(6); // 8x stage, capped at price $6
        expect(result.profitStages![3].price).toBeCloseTo(6); // 16x stage, capped at price $6
    });

    it('should correctly calculate for the "Moon or Bust" strategy (holding remainder)', () => {
        // Stages: 25% @ 5x, 25% @ 10x. Hold 50%. Entry Price: $1. Target Price: $40.
        // The remaining 50% should be sold at the final target price of $40.
        const result = calculateTokenStrategy(baseToken, STRATEGY_CONFIG.moonOrBust.stages);
        const expectedExitValue = (25 * 5) + (25 * 10) + (50 * 40); // 125 + 250 + 2000 = 2375
        
        expect(result.totalExitValue).toBeCloseTo(2375);
        expect(result.profitStages).toBeDefined();
        expect(result.profitStages).toHaveLength(2);
    });

    it('should handle zero or invalid initial investment gracefully', () => {
        const zeroInvestmentToken = { ...baseToken, entryPrice: 0, amount: 0 };
        const result = calculateTokenStrategy(zeroInvestmentToken, STRATEGY_CONFIG.ladder.stages);
        
        expect(result.totalExitValue).toBe(0);
        expect(result.profit).toBe(0);
        expect(result.profitPercentage).toBe(0);
    });

    it('should correctly calculate for the "Progressive Realization" strategy', () => {
        const progressiveToken = createMockToken({
            amount: 100,
            price: 1,
            entryPrice: 0.5,
            marketCap: 1_000_000,
            targetMarketCap: 10_000_000, // 10x from current MC
            exitStrategy: 'progressive'
        });

        const { selectedStrategy } = compareStrategies(progressiveToken);
        
        // Price at 50% progress (5M MC): $1 * (5M/1M) = $5. Sell 15 tokens. Value = 15 * 5 = 75
        // Price at 75% progress (7.5M MC): $1 * (7.5M/1M) = $7.5. Sell 20 tokens. Value = 20 * 7.5 = 150
        // Price at 90% progress (9M MC): $1 * (9M/1M) = $9. Sell 25 tokens. Value = 25 * 9 = 225
        // Price at 100% progress (10M MC): $1 * (10M/1M) = $10. Sell 40 tokens. Value = 40 * 10 = 400
        const expectedTotalExitValue = 75 + 150 + 225 + 400; // 850

        expect(selectedStrategy.totalExitValue).toBeCloseTo(expectedTotalExitValue);
        expect(selectedStrategy.profitStages).toBeDefined();
        expect(selectedStrategy.profitStages).toHaveLength(4);
        expect(selectedStrategy.profitStages![0].price).toBeCloseTo(5);
        expect(selectedStrategy.profitStages![3].price).toBeCloseTo(10);
    });

});

// FIX: Removed obsolete test suite for getRebalanceCandidates.
