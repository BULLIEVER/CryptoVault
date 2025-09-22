
import { Token, Settings, PortfolioHistoryEntry } from '../types';

function triggerDownload(content: string, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export const exportToJSON = (data: { tokens: Token[], settings: Settings, history: PortfolioHistoryEntry[] }) => {
    const jsonString = JSON.stringify(data, null, 2);
    triggerDownload(jsonString, `cryptovault-portfolio-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
};

export const exportToCSV = (tokens: Token[]) => {
    const header = [
        'Symbol', 'Name', 'Amount', 'Current Price', 'Entry Price', 'Current Value', 'P/L', 'P/L %', 'Market Cap', 'Target Market Cap', 'Progress %'
    ];
    
    const rows = tokens.map(token => {
        const currentValue = token.amount * token.price;
        const entryValue = token.amount * token.entryPrice;
        const pnl = currentValue - entryValue;
        const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0;
        const progress = token.marketCap > 0 && token.targetMarketCap > 0 ? (token.marketCap / token.targetMarketCap) * 100 : 0;
        
        return [
            token.symbol,
            `"${token.name.replace(/"/g, '""')}"`,
            token.amount,
            token.price,
            token.entryPrice,
            currentValue,
            pnl,
            pnlPercent.toFixed(2),
            token.marketCap,
            token.targetMarketCap,
            progress.toFixed(2),
        ].join(',');
    });
    
    const csvContent = [header.join(','), ...rows].join('\n');
    triggerDownload(csvContent, `cryptovault-portfolio-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
};
