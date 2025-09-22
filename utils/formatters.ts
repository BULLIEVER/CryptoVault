
const parseNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(String(value).replace(/[$,\s]/g, ''));
    return isNaN(num) || !isFinite(num) ? 0 : num;
};

export const formatCurrency = (value: number | string): string => {
    const num = parseNumber(value);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

export const formatTokenPrice = (price: number | string): string => {
    const num = parseNumber(price);
    if (num === 0) return "$0.00";
    if (num < 0.000001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    return formatCurrency(num);
};

export const formatCompactNumber = (value: number | string): string => {
    const num = parseNumber(value);
     return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

export const parseShorthandNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || !value) return 0;

    const str = value.trim().toLowerCase().replace(/,/g, '');
    const multipliers: { [key: string]: number } = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    
    const lastChar = str.slice(-1);
    if (multipliers[lastChar]) {
        const numPart = parseFloat(str.slice(0, -1));
        return isNaN(numPart) ? 0 : numPart * multipliers[lastChar];
    }
    
    const numericValue = parseFloat(str);
    return isNaN(numericValue) ? 0 : numericValue;
};

export const formatShorthandNumber = (value: number | string): string => {
    const num = parseNumber(value);
    if (num === 0) return '0';
    
    const tiers = [
        { value: 1e12, symbol: 'T' },
        { value: 1e9, symbol: 'B' },
        { value: 1e6, symbol: 'M' },
        { value: 1e3, symbol: 'K' },
    ];
    
    const tier = tiers.find(t => Math.abs(num) >= t.value);

    if (tier) {
        const val = num / tier.value;
        return parseFloat(val.toFixed(2)).toString() + tier.symbol;
    }

    return num.toString();
};

export const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'never';

    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) {
        return 'just now';
    }
    if (seconds < 60) {
        return `${seconds} seconds ago`;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
};
