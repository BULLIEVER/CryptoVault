import React from 'react';
import { Token, PortfolioValues, PortfolioHistoryEntry, TopOpportunity } from '../types';
import { formatCurrency, formatTokenPrice, formatCompactNumber } from '../utils/formatters';
import { PortfolioCompositionChart } from './charts/PortfolioCompositionChart';
import { WalletIcon, TargetIcon, TrendingUpIcon, RocketIcon, PlusIcon, SearchIcon, PencilIcon, Trash2Icon, AlertTriangleIcon, CompareHorizontalIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, CheckCircleIcon } from './ui/Icons';
import { Settings } from '../types';

interface DashboardProps {
    tokens: Token[];
    portfolioValues: PortfolioValues;
    history: PortfolioHistoryEntry[];
    sortOrder: Settings['sortTokensBy'];
    isUpdating: boolean;
    isBalanceHidden: boolean;
    onSortChange: (value: Settings['sortTokensBy']) => void;
    onAddToken: () => void;
    onViewToken: (token: Token) => void;
    onEditToken: (token: Token) => void;
    onRemoveToken: (tokenId: string) => void;
    onOpenWorkbench: () => void;
    topOpportunities: TopOpportunity[];
}

const StatsCard: React.FC<{ title: string; value: string; description: string; icon: React.ReactNode; glowClass?: string; isConfidential?: boolean; isBalanceHidden?: boolean; }> = ({ title, value, description, icon, glowClass, isConfidential, isBalanceHidden }) => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-lg transition-transform hover:-translate-y-1">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium uppercase text-[var(--color-muted-foreground)]">{title}</h3>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 ${glowClass}`}>
                {icon}
            </div>
        </div>
        <div className="text-3xl font-bold mb-1">{isConfidential && isBalanceHidden ? '*****' : value}</div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
    </div>
);

const StatsCardSkeleton: React.FC = () => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-lg">
        <div className="flex justify-between items-start mb-2">
            <div className="h-4 bg-muted rounded w-1/3 loading-shimmer"></div>
            <div className="w-8 h-8 rounded-full bg-muted loading-shimmer"></div>
        </div>
        <div className="h-8 w-1/2 bg-muted rounded mb-1 loading-shimmer"></div>
        <div className="h-4 w-3/4 bg-muted rounded loading-shimmer"></div>
    </div>
);

const TokenListItem: React.FC<{ token: Token; onView: () => void; onEdit: () => void; onRemove: () => void; isBalanceHidden: boolean; }> = ({ token, onView, onEdit, onRemove, isBalanceHidden }) => {
    const isMissingData = !token.chain || !token.pairAddress;
    const value = (token.amount || 0) * (token.price || 0);
    const entryValue = (token.amount || 0) * (token.entryPrice || 0);
    const pnl = value - entryValue;
    const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0;
    const pnlClass = pnl > 0 ? 'text-success' : pnl < 0 ? 'text-destructive' : 'text-muted-foreground';
    const progress = (token.marketCap || 0) > 0 && (token.targetMarketCap || 0) > 0 ? Math.min(((token.marketCap || 0) / (token.targetMarketCap || 0)) * 100, 100) : 0;
    const conviction = token.conviction || 'medium';

    const convictionStyles: { [key: string]: string } = {
        low: 'bg-destructive/20 text-destructive',
        medium: 'bg-warning/20 text-warning',
        high: 'bg-success/20 text-success',
    };

    const [flashClass, setFlashClass] = React.useState('');
    const prevPriceRef = React.useRef(token.price);

    React.useEffect(() => {
        const previousPrice = prevPriceRef.current;
        const currentPrice = token.price || 0;

        if (previousPrice !== 0 && currentPrice !== previousPrice) {
            if (currentPrice > previousPrice) {
                setFlashClass('flash-green');
            } else {
                setFlashClass('flash-red');
            }
            const timer = setTimeout(() => setFlashClass(''), 1500); // Must match animation duration
            return () => clearTimeout(timer);
        }
    }, [token.price]);

    React.useEffect(() => {
        prevPriceRef.current = token.price || 0;
    }, [token.price]);

    const handleItemClick = () => {
        if (isMissingData) {
            onEdit();
        } else {
            onView();
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center p-4 hover:bg-[var(--color-accent)] transition-colors cursor-pointer" onClick={handleItemClick}>
            <div className="flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10">
                    {token.imageUrl ? <img src={token.imageUrl} alt={token.name || 'Token'} className="w-full h-full object-cover" /> : <span className="font-bold text-primary">{(token.symbol || '??').substring(0, 2)}</span>}
                </div>
                <div className="truncate">
                    <div className="font-semibold truncate flex items-center gap-2">
                        {token.name || 'Unnamed Token'}
                        {isMissingData && (
                            <div className="group relative">
                                <AlertTriangleIcon className="w-4 h-4 text-warning" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs bg-muted text-muted-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    Missing market data. Click to edit and link this token.
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{token.symbol || 'N/A'}</span>
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full capitalize ${convictionStyles[conviction]}`}>
                            {conviction}
                        </span>
                        <span>· {isMissingData ? 'N/A' : (isBalanceHidden ? '*****' : formatCompactNumber(value))}</span>
                    </div>
                </div>
            </div>
            <div className={`p-1 rounded-md transition-colors text-left md:text-right ${flashClass}`}>
                <div className="font-semibold">{isMissingData ? 'N/A' : formatTokenPrice(token.price || 0)}</div>
                <div className={`text-xs flex items-center justify-start md:justify-end ${isBalanceHidden ? 'text-muted-foreground' : pnlClass}`}>
                    {!isMissingData && (
                        isBalanceHidden ? '*****' :
                        <>
                            {pnl >= 0 ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : <TrendingUpIcon className="w-3 h-3 mr-1 transform rotate-180" />}
                            {pnlPercent.toFixed(2)}%
                        </>
                    )}
                </div>
            </div>
            <div className="hidden md:block text-right">
                <div className="font-semibold">{isBalanceHidden ? '*****' : (token.amount || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Amount</div>
            </div>
            <div className="hidden md:block">
                 <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${isMissingData ? 0 : progress}%` }}></div>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">{isMissingData ? 'N/A' : `${progress.toFixed(0)}% to Target`}</div>
            </div>
            <div className="flex justify-end items-center space-x-1">
                 <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-full hover:bg-[var(--color-muted)] transition-colors" aria-label="Edit Token"><PencilIcon className="w-4 h-4" /></button>
                 <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-2 rounded-full hover:bg-[var(--color-muted)] transition-colors" aria-label="Remove Token"><Trash2Icon className="w-4 h-4 text-destructive/80" /></button>
            </div>
        </div>
    );
};

const TokenListItemSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center p-4">
        <div className="flex items-center gap-3 md:col-span-2">
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-muted loading-shimmer"></div>
            <div className="truncate w-full">
                <div className="h-5 w-3/4 bg-muted rounded loading-shimmer"></div>
                <div className="h-3 w-1/2 bg-muted rounded mt-1 loading-shimmer"></div>
            </div>
        </div>
        <div className="text-left md:text-right">
            <div className="h-5 w-full bg-muted rounded loading-shimmer"></div>
            <div className="h-3 w-1/2 bg-muted rounded mt-1 ml-auto loading-shimmer"></div>
        </div>
        <div className="hidden md:block text-right">
            <div className="h-5 w-full bg-muted rounded loading-shimmer"></div>
            <div className="h-3 w-1/2 bg-muted rounded mt-1 ml-auto loading-shimmer"></div>
        </div>
        <div className="hidden md:block">
            <div className="h-1.5 w-full bg-muted rounded-full loading-shimmer"></div>
        </div>
        <div className="flex justify-end items-center space-x-1">
            <div className="w-8 h-8 rounded-full bg-muted loading-shimmer"></div>
            <div className="w-8 h-8 rounded-full bg-muted loading-shimmer"></div>
        </div>
    </div>
);

const TopOpportunitiesCard: React.FC<{ opportunities: TopOpportunity[]; onEditToken: (token: Token) => void; isBalanceHidden: boolean; }> = ({ opportunities, onEditToken, isBalanceHidden }) => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-lg animate-fade-in h-full">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RocketIcon className="w-5 h-5 text-primary" />
            Top Potential
        </h2>
        {opportunities.length > 0 ? (
            <div className="space-y-4">
                {opportunities.map(token => (
                    <div key={token.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10">
                                {token.imageUrl ? <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover" /> : <span className="font-bold text-primary text-xs">{(token.symbol || '??').substring(0, 2)}</span>}
                            </div>
                            <div className="truncate">
                                <p className="font-semibold truncate">{token.symbol}</p>
                                <p className="text-xs text-muted-foreground">MC: {isBalanceHidden ? '*****' : formatCompactNumber(token.marketCap)}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-success">{token.potentialMultiplier.toFixed(1)}x</p>
                            <p className="text-xs text-muted-foreground">Target: {isBalanceHidden ? '*****' : formatCompactNumber(token.targetMarketCap)}</p>
                        </div>
                         <button onClick={() => onEditToken(token)} className="p-2 rounded-full hover:bg-[var(--color-muted)] transition-colors ml-2" aria-label={`Edit ${token.name}`}><PencilIcon className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-4 flex flex-col justify-center h-full">
                <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No opportunities found.</p>
                <p className="text-xs text-muted-foreground mt-1">Set market cap targets for your tokens.</p>
            </div>
        )}
    </div>
);

const PortfolioOptimizerCard: React.FC<{ tokens: Token[]; onOptimize: () => void; }> = ({ tokens, onOptimize }) => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-lg animate-fade-in h-full md:col-span-2 lg:col-span-1 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CompareHorizontalIcon className="w-5 h-5 text-primary" />
            Portfolio Optimizer
        </h2>
        {tokens.length > 1 ? (
             <div className="flex-grow flex flex-col justify-center items-center text-center">
                <p className="text-sm text-muted-foreground mb-4">
                    Analyze your portfolio to accelerate growth, reduce risk, or take profits.
                </p>
                <button 
                    onClick={onOptimize}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    Open Optimizer Workbench
                </button>
            </div>
        ) : (
            <div className="text-center py-4 h-full flex flex-col justify-center">
                <CheckCircleIcon className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Add more tokens</p>
                <p className="text-xs text-muted-foreground mt-1">Optimization requires at least two assets.</p>
            </div>
        )}
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ tokens, portfolioValues, history, sortOrder, isUpdating, isBalanceHidden, onSortChange, onAddToken, onViewToken, onEditToken, onRemoveToken, topOpportunities, onOpenWorkbench }) => {
    
    const sortedTokens = React.useMemo(() => {
        const sorted = [...tokens];
        try {
            switch(sortOrder) {
                case 'name': return sorted.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
                case 'progress': return sorted.sort((a,b) => {
                    const progressA = ((a.marketCap || 0) > 0 && (a.targetMarketCap || 0) > 0) ? (a.marketCap || 0) / (a.targetMarketCap || 0) : 0;
                    const progressB = ((b.marketCap || 0) > 0 && (b.targetMarketCap || 0) > 0) ? (b.marketCap || 0) / (b.targetMarketCap || 0) : 0;
                    return progressB - progressA;
                });
                case 'profit': return sorted.sort((a,b) => {
                    const profitA = ((a.price || 0) - (a.entryPrice || 0)) * (a.amount || 0);
                    const profitB = ((b.price || 0) - (b.entryPrice || 0)) * (a.amount || 0);
                    return profitB - profitA;
                });
                case 'value':
                default: return sorted.sort((a,b) => ((b.amount || 0) * (b.price || 0)) - ((a.amount || 0) * (a.price || 0)));
            }
        } catch (error) {
            console.error("Failed to sort tokens:", error);
            return tokens; // Return unsorted tokens on error
        }
    }, [tokens, sortOrder]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in">
                {isUpdating && tokens.length === 0 ? (
                    <>
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatsCard title="Current Value" value={formatCurrency(portfolioValues.total)} description="Total portfolio value" icon={<WalletIcon className="w-5 h-5 text-primary" />} isConfidential isBalanceHidden={isBalanceHidden} />
                        <StatsCard title="Target Value" value={formatCurrency(portfolioValues.target)} description="Potential future value" icon={<TargetIcon className="w-5 h-5 text-primary" />} isConfidential isBalanceHidden={isBalanceHidden} />
                        <StatsCard title="Growth Potential" value={`${portfolioValues.growthMultiplier.toFixed(2)}x`} description={`${portfolioValues.growthPercentage.toFixed(1)}% portfolio growth`} icon={<TrendingUpIcon className="w-5 h-5 text-success" />} glowClass="shadow-glow-success" />
                        <StatsCard title="Highest Potential" value={portfolioValues.highestPotentialToken?.symbol || 'N/A'} description="Token with highest growth" icon={<RocketIcon className="w-5 h-5 text-primary" />} glowClass="shadow-glow-primary" />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-lg">
                    <h2 className="text-lg font-semibold mb-4">Composition</h2>
                    <PortfolioCompositionChart tokens={tokens} isBalanceHidden={isBalanceHidden} />
                </div>
                <TopOpportunitiesCard opportunities={topOpportunities} onEditToken={onEditToken} isBalanceHidden={isBalanceHidden} />
                <PortfolioOptimizerCard tokens={tokens} onOptimize={onOpenWorkbench} />
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                    <h2 className="text-lg font-semibold">Your Tokens</h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={sortOrder}
                            onChange={(e) => onSortChange(e.target.value as Settings['sortTokensBy'])}
                            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="value">Sort by Value</option>
                            <option value="name">Sort by Name</option>
                            <option value="progress">Sort by Progress</option>
                            <option value="profit">Sort by Profit</option>
                        </select>
                        <button onClick={onAddToken} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors">
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Token</span>
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                    {isUpdating && tokens.length > 0 ? (
                       sortedTokens.map(token => <TokenListItemSkeleton key={token.id} />)
                    ) : tokens.length > 0 ? (
                        sortedTokens.map(token => (
                            <TokenListItem 
                                key={token.id} 
                                token={token} 
                                onView={() => onViewToken(token)} 
                                onEdit={() => onEditToken(token)} 
                                onRemove={() => onRemoveToken(token.id)}
                                isBalanceHidden={isBalanceHidden}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 px-4">
                            <div className="mx-auto h-12 w-12 text-muted-foreground mb-3 flex items-center justify-center">
                                <SearchIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No tokens added yet</h3>
                            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                                Add tokens manually to track your portfolio growth potential.
                            </p>
                            <button onClick={onAddToken} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors mx-auto">
                                <PlusIcon className="w-4 h-4" />
                                <span>Add Your First Token</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};