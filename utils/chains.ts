// A centralized place to manage chain information
// This helps standardize the chain IDs used for API calls and for display in the UI.

interface ChainInfo {
    displayName: string;
    apiUrlId: string;
}

// DexScreener uses specific IDs for its API endpoints.
// We map the chainId received from the API to our internal standard.
export const CHAIN_INFO: Record<string, ChainInfo> = {
    ethereum: { displayName: 'Ethereum', apiUrlId: 'ethereum' },
    solana: { displayName: 'Solana', apiUrlId: 'solana' },
    base: { displayName: 'Base', apiUrlId: 'base' },
    arbitrum: { displayName: 'Arbitrum', apiUrlId: 'arbitrum' },
    polygon: { displayName: 'Polygon', apiUrlId: 'polygon' },
    bsc: { displayName: 'BNB Chain', apiUrlId: 'bsc' },
    avalanche: { displayName: 'Avalanche', apiUrlId: 'avalanche' },
    optimism: { displayName: 'Optimism', apiUrlId: 'optimism' },
    // A common variant for ethereum
    eth: { displayName: 'Ethereum', apiUrlId: 'ethereum' },
};

/**
 * Gets the standardized chain information for a given chain ID.
 * Falls back to a default representation if the chain is not in our known map.
 * @param chainId The chain ID from the API (e.g., "base", "eth").
 * @returns A ChainInfo object with a clean display name and the correct ID for API calls.
 */
export const getChainInfo = (chainId: string): ChainInfo => {
    if (!chainId) {
        return { displayName: 'Unknown', apiUrlId: 'unknown' };
    }
    const lowerChainId = chainId.toLowerCase();
    return CHAIN_INFO[lowerChainId] || { 
        displayName: lowerChainId.charAt(0).toUpperCase() + lowerChainId.slice(1), 
        apiUrlId: lowerChainId 
    };
};
