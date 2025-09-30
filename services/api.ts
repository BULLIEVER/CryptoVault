import { Token, ApiToken } from '../types';
import { getChainInfo } from '../utils/chains';

// Lightweight reliability wrapper for fetch with timeout and retries
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok && retries > 0 && res.status >= 500) {
            return fetchWithRetry(url, options, retries - 1, timeoutMs);
        }
        return res;
    } catch (err) {
        if (retries > 0) {
            return fetchWithRetry(url, options, retries - 1, timeoutMs);
        }
        throw err;
    } finally {
        clearTimeout(id);
    }
}

export async function searchTokens(query: string): Promise<ApiToken[]> {
    if (query.trim().length < 2) {
        return [];
    }
    const response = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch from DexScreener API');
    }
    const data: { pairs?: any[] } = await response.json();
    if (!data.pairs) {
        return [];
    }
    return data.pairs.slice(0, 20).map((pair: any): ApiToken => {
        const chainInfo = getChainInfo(pair.chainId);
        return {
            id: pair.baseToken.address.toLowerCase(),
            pairAddress: pair.pairAddress.toLowerCase(),
            chainId: chainInfo.apiUrlId,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            price: parseFloat(pair.priceUsd || '0'),
            marketCap: parseFloat(pair.fdv || '0'),
            percentChange24h: parseFloat(pair.priceChange?.h24 || '0'),
            imageUrl: pair.info?.imageUrl || '',
            chainName: chainInfo.displayName,
            pairSymbol: pair.quoteToken.symbol,
        };
    });
}

export async function batchFetchMarketData(tokens: Token[]): Promise<Map<string, Partial<Token>>> {
    const groupedByChain = tokens.reduce((acc, token) => {
        if (token.chain && token.pairAddress) {
            const chainId = getChainInfo(token.chain).apiUrlId;
            if (!acc[chainId]) {
                acc[chainId] = [];
            }
            acc[chainId].push(token.pairAddress.toLowerCase());
        }
        return acc;
    }, {} as Record<string, string[]>);

    const promises = Object.entries(groupedByChain).map(async ([chain, pairAddresses]) => {
        const chainMap = new Map<string, Partial<Token>>();
        for (let i = 0; i < pairAddresses.length; i += 30) {
            const batch = pairAddresses.slice(i, i + 30);
            const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${batch.join(',')}`;
            try {
                const response = await fetchWithRetry(url);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Batch update failed for ${chain} with status ${response.status}.`, errorText);
                    throw new Error(`API error for ${chain}: ${response.statusText}`);
                }
                const data: { pairs?: any[] } = await response.json();
                if (data.pairs) {
                    data.pairs.forEach((pair: any) => {
                        chainMap.set(pair.pairAddress.toLowerCase(), {
                            price: parseFloat(pair.priceUsd || '0'),
                            marketCap: parseFloat(pair.fdv || '0'),
                            percentChange24h: parseFloat(pair.priceChange?.h24 || '0'),
                            imageUrl: pair.info?.imageUrl || undefined
                        });
                    });
                }
            } catch (e) {
                console.error(`An error occurred during a batch update for chain ${chain}:`, e);
                if (e instanceof Error) {
                    throw new Error(`Network error during batch update: ${e.message}`);
                }
                throw new Error('An unknown network error occurred.');
            }
        }
        return chainMap;
    });

    const results = await Promise.all(promises);
    const finalMap = new Map<string, Partial<Token>>();
    results.forEach(chainMap => {
        for (const [key, value] of chainMap.entries()) {
            finalMap.set(key, value);
        }
    });
    
    return finalMap;
}