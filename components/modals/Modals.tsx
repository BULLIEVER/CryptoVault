import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import { Token, Settings, StrategyComparison, ApiToken, ExitStrategyType } from '../../types';
import { formatCurrency, formatTokenPrice, parseShorthandNumber, formatShorthandNumber } from '../../utils/formatters';
// FIX: Removed unused icon imports (CheckIcon, ScaleIcon, DollarSignIcon, InfoIcon, RocketIcon) to resolve export errors.
import { XIcon, SearchIcon, AlertTriangleIcon, DownloadIcon, UploadIcon, Trash2Icon, PencilIcon, TrophyIcon, CompareHorizontalIcon, ScissorsIcon, TargetIcon, LightbulbIcon, ArrowLeftIcon } from '../ui/Icons';
import { compareStrategies, STRATEGY_CONFIG, generateAiStrategy } from '../../utils/portfolioCalculations';
import { useDebounce } from '../../hooks/useDebounce';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl' }> = ({ isOpen, onClose, children, size = 'md' }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            lastActiveElement.current = document.activeElement as HTMLElement;
            const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            focusableElements?.[0]?.focus();
        } else {
            lastActiveElement.current?.focus();
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements || focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }
    };
    
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose} onKeyDown={handleKeyDown}>
            <div ref={modalRef} className={`bg-[var(--color-card)] rounded-xl w-full ${sizeClasses[size]} shadow-xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in`} onClick={e => e.stopPropagation()}>
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors" aria-label="Close modal">
                        <XIcon className="w-5 h-5" />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// ADD TOKEN MODAL
interface AddTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (token: Token) => void;
    existingToken: Token | null;
    searchTokensFunction: (query: string) => Promise<ApiToken[]>;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose, onSave, existingToken, searchTokensFunction }) => {
    const [step, setStep] = useState(1);
    const [token, setToken] = useState<Partial<Token>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<ApiToken[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [marketCapInput, setMarketCapInput] = useState('');
    const [targetMarketCapInput, setTargetMarketCapInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // AI Strategy State
    const [desiredProfitInput, setDesiredProfitInput] = useState('');
    const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
    const [generatedStrategy, setGeneratedStrategy] = useState<{ stages: { percentage: number, multiplier: number }[], warning?: string } | null>(null);


    useEffect(() => {
        const isEditing = !!existingToken;
        const initialToken = existingToken || {
            name: '', symbol: '', amount: 0, price: 0, entryPrice: 0, marketCap: 0, targetMarketCap: 0, exitStrategy: 'targetMC', chain: '', pairAddress: ''
        };
        setToken(initialToken);
        setMarketCapInput(initialToken.marketCap > 0 ? formatShorthandNumber(initialToken.marketCap) : '');
        setTargetMarketCapInput(initialToken.targetMarketCap > 0 ? formatShorthandNumber(initialToken.targetMarketCap) : '');
        setSearchResults([]);
        setDesiredProfitInput('');
        setGeneratedStrategy(null);
        
        const hasRequiredData = existingToken && existingToken.chain && existingToken.pairAddress;
        setStep(isEditing && hasRequiredData ? 2 : 1);

        if (isEditing && !hasRequiredData) {
            setSearchTerm(existingToken.name || existingToken.symbol || '');
        } else {
            setSearchTerm('');
        }
    }, [existingToken, isOpen]);

    useEffect(() => {
        if (debouncedSearchTerm.length > 1) {
            setIsLoading(true);
            searchTokensFunction(debouncedSearchTerm)
                .then(setSearchResults)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchTerm, searchTokensFunction]);
    
    const handleAddManually = () => {
        setToken({ exitStrategy: 'targetMC' });
        setStep(2);
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newPartialToken = { ...token, [name]: name === 'name' || name === 'symbol' || name === 'exitStrategy' ? value : parseFloat(value) || 0 };
        setToken(newPartialToken);
        if (name === 'exitStrategy' && value !== 'ai') {
            setGeneratedStrategy(null);
            setToken(prev => ({...prev, customExitStages: undefined}));
        }
    };

    const handleMarketCapChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'marketCap') {
            setMarketCapInput(value);
        } else if (name === 'targetMarketCap') {
            setTargetMarketCapInput(value);
        }
    };
    
    const handleMarketCapBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = parseShorthandNumber(value);
        
        setToken(prev => ({ ...prev, [name]: numericValue }));

        if (name === 'marketCap') {
            setMarketCapInput(numericValue > 0 ? formatShorthandNumber(numericValue) : '');
        } else if (name === 'targetMarketCap') {
            setTargetMarketCapInput(numericValue > 0 ? formatShorthandNumber(numericValue) : '');
        }
    };

    const handleSelectToken = (apiToken: ApiToken) => {
        const newMarketCap = apiToken.marketCap;
        const newTargetMarketCap = token.targetMarketCap || apiToken.marketCap * 10;
        
        setToken(prev => ({
            ...prev,
            id: apiToken.id,
            chain: apiToken.chainId,
            pairAddress: apiToken.pairAddress,
            name: apiToken.name,
            symbol: apiToken.symbol,
            price: apiToken.price,
            entryPrice: prev.entryPrice || apiToken.price,
            marketCap: newMarketCap,
            targetMarketCap: newTargetMarketCap,
            imageUrl: apiToken.imageUrl
        }));
        
        setMarketCapInput(newMarketCap > 0 ? formatShorthandNumber(newMarketCap) : '');
        setTargetMarketCapInput(newTargetMarketCap > 0 ? formatShorthandNumber(newTargetMarketCap) : '');
        
        setSearchTerm('');
        setSearchResults([]);
        setStep(2);
    };

    const handleGenerateStrategy = () => {
        const desiredProfit = parseShorthandNumber(desiredProfitInput);
        const result = generateAiStrategy(token, desiredProfit, riskTolerance);
        setGeneratedStrategy(result);
    };

    const handleApplyStrategy = () => {
        if (generatedStrategy && generatedStrategy.stages.length > 0) {
            setToken(prev => ({
                ...prev,
                exitStrategy: 'ai',
                customExitStages: generatedStrategy.stages,
            }));
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: token.id || existingToken?.id || Date.now().toString(),
            chain: token.chain || '',
            pairAddress: token.pairAddress || '',
            name: token.name || '',
            symbol: token.symbol || '',
            amount: token.amount || 0,
            price: token.price || 0,
            entryPrice: token.entryPrice || token.price || 0,
            marketCap: token.marketCap || 0,
            targetMarketCap: token.targetMarketCap || 0,
            exitStrategy: token.exitStrategy || 'targetMC',
            customExitStages: token.customExitStages,
            imageUrl: token.imageUrl
        });
    };

    const renderStepIndicator = () => (
      <div className="flex justify-center items-center mb-6">
          {(existingToken && step > 1 && !(existingToken.chain && existingToken.pairAddress)) && (
             <button onClick={() => setStep(1)} className="p-2 rounded-full hover:bg-accent absolute left-4 top-4" aria-label="Go back to search">
                <ArrowLeftIcon className="w-5 h-5"/>
            </button>
          )}
          <ol className="flex items-center space-x-2 text-sm font-medium text-center text-muted-foreground">
              <li className={`flex items-center ${step >= 1 ? 'text-primary' : ''}`}>
                  1. Find <span className="hidden sm:inline-flex sm:ml-2">Token</span>
                  <svg className="w-3 h-3 ml-2 sm:ml-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 10"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 9 4-4-4-4M1 9l4-4-4-4"/></svg>
              </li>
              <li className={`flex items-center ${step >= 2 ? 'text-primary' : ''}`}>
                  2. Details
                  <svg className="w-3 h-3 ml-2 sm:ml-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 10"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 9 4-4-4-4M1 9l4-4-4-4"/></svg>
              </li>
              <li className={`flex items-center ${step === 3 ? 'text-primary' : ''}`}>
                  3. Strategy
              </li>
          </ol>
      </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            {renderStepIndicator()}
            
            {step === 1 && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-1 text-center">Find a Token</h2>
                    <p className="text-muted-foreground text-center mb-4">Search by name, symbol, or pair address.</p>
                     <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="e.g., 'WIF' or 'Solana'"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        {isLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner/></div>}
                    </div>
                    
                    {searchResults.length > 0 && (
                        <div className="mt-2 border border-border rounded-md shadow-lg max-h-60 overflow-y-auto divide-y divide-border">
                            {searchResults.map(res => (
                                <div key={res.pairAddress} onClick={() => handleSelectToken(res)} className="flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer">
                                    {res.imageUrl ? 
                                        <img src={res.imageUrl} alt={res.name} className="w-8 h-8 rounded-full bg-muted object-cover" /> : 
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">{res.symbol.substring(0,3).toUpperCase()}</div>
                                    }
                                    <div className="truncate">
                                        <div className="font-semibold truncate">{res.name} ({res.symbol})</div>
                                        <div className="text-xs text-muted-foreground capitalize">Chain: {res.chainName} &bull; Paired with {res.pairSymbol}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-center my-4">
                        <span className="text-sm text-muted-foreground">or</span>
                    </div>
                    
                    <button onClick={handleAddManually} className="w-full py-2 rounded-md border border-border hover:bg-accent font-semibold">Add Token Manually</button>
                </div>
            )}
            
            {step === 2 && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">{existingToken ? 'Edit Token Details' : 'Add Details'}</h2>
                     <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h3 className="font-semibold mb-2 text-muted-foreground">Token Info</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <input name="name" value={token.name || ''} onChange={handleChange} placeholder="Token Name" className="w-full p-2 bg-muted border border-border rounded-md" required />
                               <input name="symbol" value={token.symbol || ''} onChange={handleChange} placeholder="Symbol" className="w-full p-2 bg-muted border border-border rounded-md" required />
                            </div>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h3 className="font-semibold mb-2 text-muted-foreground">Your Investment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="amount" value={token.amount || ''} onChange={handleChange} type="number" step="any" placeholder="Amount" className="w-full p-2 bg-muted border border-border rounded-md" required/>
                                <input name="entryPrice" value={token.entryPrice || ''} onChange={handleChange} type="number" step="any" placeholder="Entry Price" className="w-full p-2 bg-muted border border-border rounded-md" required/>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg">
                             <h3 className="font-semibold mb-2 text-muted-foreground">Market Data</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="price" value={token.price || ''} onChange={handleChange} type="number" step="any" placeholder="Current Price" className="w-full p-2 bg-muted border border-border rounded-md" required/>
                                <input name="marketCap" value={marketCapInput} onChange={handleMarketCapChange} onBlur={handleMarketCapBlur} type="text" placeholder="Market Cap (e.g., 10M)" className="w-full p-2 bg-muted border border-border rounded-md" required/>
                             </div>
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-6">
                        <button type="button" onClick={() => setStep(3)} className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Next: Set Strategy</button>
                    </div>
                </div>
            )}
            
            {step === 3 && (
                <form onSubmit={handleSubmit} className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">Set Your Strategy</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="targetMarketCap" className="block text-sm font-medium text-muted-foreground mb-1">Your Target Market Cap</label>
                            <input id="targetMarketCap" name="targetMarketCap" value={targetMarketCapInput} onChange={handleMarketCapChange} onBlur={handleMarketCapBlur} type="text" placeholder="e.g., 1B" className="w-full p-2 bg-muted border border-border rounded-md" required/>
                        </div>
                        <div>
                            <label htmlFor="exitStrategy" className="block text-sm font-medium text-muted-foreground mb-1">Pre-built Exit Strategy</label>
                            <select name="exitStrategy" id="exitStrategy" value={token.exitStrategy || 'targetMC'} onChange={handleChange} className="w-full p-2 bg-muted border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none">
                                <option value="targetMC">All at Target Market Cap</option>
                                <option value="ladder">Ladder Exit (2x, 4x, 8x, 16x)</option>
                                <option value="conservative">Conservative Exit (3x, 6x, 10x)</option>
                                <option value="moonOrBust">Moon or Bust (5x, 10x, hold 50%)</option>
                                {token.exitStrategy === 'ai' && <option value="ai">AI Generated Strategy</option>}
                            </select>
                        </div>
                         {/* AI Strategy Generator */}
                        <div className="border border-border rounded-lg p-4 bg-muted/50">
                            <details open={token.exitStrategy === 'ai'}>
                                <summary className="font-semibold cursor-pointer flex justify-between items-center text-primary">
                                    <span className="flex items-center gap-2"><LightbulbIcon className="w-5 h-5"/> AI Strategy Generator</span>
                                </summary>
                                <div className="mt-4 space-y-4 animate-fade-in">
                                    <p className="text-sm text-muted-foreground">Define your profit goal and risk tolerance to generate a custom exit plan.</p>
                                     <div>
                                        <label htmlFor="desiredProfit" className="block text-sm font-medium text-muted-foreground mb-1">I want to make:</label>
                                        <input id="desiredProfit" type="text" value={desiredProfitInput} onChange={e => setDesiredProfitInput(e.target.value)} placeholder="e.g., $50k or 1M" className="w-full p-2 bg-muted border border-border rounded-md" />
                                     </div>
                                     <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Risk Tolerance:</label>
                                        <div className="flex gap-2">
                                            {(['conservative', 'moderate', 'aggressive'] as const).map(level => (
                                                <button key={level} type="button" onClick={() => setRiskTolerance(level)} className={`flex-1 p-2 text-sm rounded-md capitalize transition-colors ${riskTolerance === level ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>{level}</button>
                                            ))}
                                        </div>
                                     </div>
                                     <button type="button" onClick={handleGenerateStrategy} className="w-full px-4 py-2 rounded-md border border-border hover:bg-accent font-semibold">Generate Plan</button>
                                     {generatedStrategy && (
                                        <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                                            {generatedStrategy.warning && <p className="text-xs text-warning flex items-center gap-2"><AlertTriangleIcon className="w-4 h-4" />{generatedStrategy.warning}</p>}
                                            {generatedStrategy.stages.length > 0 ? (
                                                <>
                                                    <h4 className="font-semibold text-sm">Suggested Strategy:</h4>
                                                    <ul className="text-sm space-y-1">
                                                    {generatedStrategy.stages.map((s, i) => <li key={i}>- Sell {s.percentage}% at ~{s.multiplier.toFixed(1)}x profit</li>)}
                                                    </ul>
                                                    <button type="button" onClick={handleApplyStrategy} className="w-full mt-2 px-4 py-2 text-sm rounded-md bg-success text-success-foreground hover:bg-success/90">Apply This Strategy</button>
                                                </>
                                            ) : <p className="text-sm text-center text-muted-foreground">Could not generate a strategy. Check inputs.</p>}
                                        </div>
                                     )}
                                </div>
                            </details>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6">
                        <button type="submit" className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{existingToken ? 'Update Token' : 'Add Token to Portfolio'}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

// TOKEN DETAILS MODAL
interface TokenDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: Token;
    onEdit: (token: Token) => void;
    isBalanceHidden: boolean;
}
export const TokenDetailsModal: React.FC<TokenDetailsModalProps> = ({ isOpen, onClose, token, onEdit, isBalanceHidden }) => {
    const comparison = useMemo(() => compareStrategies(token), [token]);
    const { selectedStrategy, allAtOnce, winner } = comparison;
    
    const showComparisonView = (token.exitStrategy === 'ai' && !!token.customExitStages) || (token.exitStrategy && !!STRATEGY_CONFIG[token.exitStrategy as keyof typeof STRATEGY_CONFIG]);
    
    let selectedStrategyConfig: { name: string, description: string };
    if (token.exitStrategy === 'ai') {
        selectedStrategyConfig = { name: 'AI-Generated Strategy', description: 'A custom strategy based on your profit and risk inputs.' };
    } else if (token.exitStrategy && STRATEGY_CONFIG[token.exitStrategy as keyof typeof STRATEGY_CONFIG]) {
        selectedStrategyConfig = STRATEGY_CONFIG[token.exitStrategy as keyof typeof STRATEGY_CONFIG];
    } else {
        selectedStrategyConfig = { name: 'All at Target', description: 'Hold 100% until your final target.' };
    }


    const MetricCard: React.FC<{title: string; value: string; subValue?: string; subValueClass?: string; isConfidential?: boolean}> = ({title, value, subValue, subValueClass, isConfidential}) => (
      <div className="p-4 rounded-lg glassmorphism">
        <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
        <p className="text-2xl font-semibold">{isConfidential && isBalanceHidden ? '*****' : value}</p>
        {subValue && <p className={`text-sm ${subValueClass || 'text-muted-foreground'}`}>{isConfidential && isBalanceHidden ? '*****' : subValue}</p>}
      </div>
    );

    const StrategyCard: React.FC<{ title: string; description: string; totalValue: number; profit: number; profitPercent: number; isWinner: boolean; icon: React.ReactNode; children?: React.ReactNode }> = ({title, description, totalValue, profit, profitPercent, isWinner, icon, children}) => (
        <div className={`relative p-4 border rounded-lg transition-all ${isWinner ? 'border-success bg-success/10 shadow-glow-success' : 'border-border'} h-full flex flex-col`}>
            {isWinner && <div className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white bg-success rounded-full flex items-center gap-1"><TrophyIcon className="w-3 h-3"/>BEST</div>}
            <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">{icon} {title}</h4>
            <p className="text-sm text-muted-foreground mb-3 flex-grow">{description}</p>
            {children}
            <div className="p-2 bg-primary/5 rounded flex justify-between items-center mt-3">
                <span className="font-medium text-sm">Cashed Out Value:</span>
                <span className={`font-bold text-lg ${isWinner ? 'text-success' : ''}`}>{isBalanceHidden ? '*****' : formatCurrency(totalValue)}</span>
            </div>
            <div className="mt-2 text-sm flex justify-between">
                <span>Total Profit:</span>
                <span className="font-medium text-success">{isBalanceHidden ? '*****' : `+${formatCurrency(profit)}`} ({profitPercent.toFixed(1)}%)</span>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10">
                    {token.imageUrl ? <img src={token.imageUrl} alt={token.name || 'Token'} className="w-full h-full object-cover" /> : <span className="font-bold text-xl text-primary">{(token.symbol || '??').substring(0, 2)}</span>}
                </div>
                <div>
                    <h2 className="text-3xl font-bold">{token.name || 'Unnamed Token'}</h2>
                    <p className="text-muted-foreground">{(token.symbol || '').toUpperCase()}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricCard title="Current Price" value={formatTokenPrice(token.price || 0)} subValue={`${(token.percentChange24h || 0).toFixed(2)}% (24h)`} subValueClass={(token.percentChange24h||0) >= 0 ? 'text-success' : 'text-destructive'} />
              <MetricCard title="Your Holdings" value={formatCurrency((token.price || 0) * (token.amount || 0))} subValue={`${(token.amount || 0).toLocaleString()} tokens`} isConfidential />
              <MetricCard title="Growth Potential" value={`${comparison.allAtOnce.growthMultiplier.toFixed(2)}x`} subValue="At target market cap" subValueClass="text-success" />
            </div>

            <div className="mb-6 p-4 rounded-lg glassmorphism">
                 <h3 className="font-semibold mb-4 flex items-center gap-2"><CompareHorizontalIcon/> Exit Strategy Simulation</h3>
                 <div className={`grid grid-cols-1 ${!showComparisonView ? '' : 'md:grid-cols-2'} gap-4`}>
                    <StrategyCard
                        title={selectedStrategyConfig.name}
                        description={selectedStrategyConfig.description}
                        totalValue={selectedStrategy.totalExitValue}
                        profit={selectedStrategy.profit}
                        profitPercent={selectedStrategy.profitPercentage}
                        isWinner={winner === 'selectedStrategy' && showComparisonView}
                        icon={!showComparisonView ? <TargetIcon/> : (token.exitStrategy === 'ai' ? <LightbulbIcon/> : <ScissorsIcon/>)}
                    >
                        {!showComparisonView ? (
                             <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between"><span>Target Price:</span><span>{isBalanceHidden ? '*****' : formatTokenPrice(allAtOnce.targetPrice)}</span></div>
                                <div className="flex justify-between"><span>Amount to Sell:</span><span>100%</span></div>
                            </div>
                        ) : (
                             <div className="space-y-1 text-sm text-muted-foreground">
                                {selectedStrategy.profitStages?.map((stage, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span>Sell {stage.percentage}% @ {stage.multiplier}x</span>
                                        <span className="font-mono text-xs p-1 bg-muted rounded">{isBalanceHidden ? '*****' : formatTokenPrice(stage.price)}</span>
                                    </div>
                                ))}
                                {token.exitStrategy === 'moonOrBust' && (
                                    <div className="flex justify-between border-t border-border/50 pt-1 mt-1 font-medium">
                                        <span>Hold remaining:</span>
                                        <span>50%</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </StrategyCard>

                    {showComparisonView && (
                        <StrategyCard
                            title="vs. All At Target"
                            description="For comparison, selling 100% at your target market cap."
                            totalValue={allAtOnce.totalExitValue}
                            profit={allAtOnce.profit}
                            profitPercent={allAtOnce.profitPercentage}
                            isWinner={winner === 'allAtOnce'}
                            icon={<TargetIcon/>}
                        >
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between"><span>Target Price:</span><span>{isBalanceHidden ? '*****' : formatTokenPrice(allAtOnce.targetPrice)}</span></div>
                                <div className="flex justify-between"><span>Amount to Sell:</span><span>100%</span></div>
                            </div>
                        </StrategyCard>
                    )}
                 </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => onEdit(token)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                    <PencilIcon className="w-4 h-4" /> Edit
                </button>
            </div>
        </Modal>
    );
};

// SETTINGS MODAL
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (settings: Settings) => void;
    onExport: (format: 'json' | 'csv') => void;
    onImport: (file: File) => void;
    onClearData: () => void;
}
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onExport, onImport, onClearData }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => setLocalSettings(settings), [settings]);
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
           setLocalSettings(s => ({...s, [name]: (e.target as HTMLInputElement).checked}));
        } else {
           setLocalSettings(s => ({...s, [name]: isNaN(Number(value)) ? value : Number(value)}));
        }
    };
    
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onImport(e.target.files[0]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
             <h2 className="text-2xl font-bold mb-6">Settings</h2>
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Price Update Interval</label>
                  <select name="updateInterval" value={localSettings.updateInterval} onChange={handleChange} className="w-full p-2 bg-muted border border-border rounded-md">
                     <option value="5">5 seconds</option>
                     <option value="10">10 seconds</option>
                     <option value="15">15 seconds</option>
                     <option value="30">30 seconds</option>
                     <option value="60">1 minute</option>
                     <option value="0">Manual only</option>
                  </select>
                </div>
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="notifications-enabled" name="notificationsEnabled" checked={localSettings.notificationsEnabled} onChange={handleChange} className="w-4 h-4"/>
                    <label htmlFor="notifications-enabled">Enable Target Notifications</label>
                 </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Data Management</h3>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => onExport('json')} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent flex items-center gap-2"><DownloadIcon className="w-4 h-4"/>Export JSON</button>
                        <button onClick={() => onExport('csv')} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent flex items-center gap-2"><DownloadIcon className="w-4 h-4"/>Export CSV</button>
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent flex items-center gap-2"><UploadIcon className="w-4 h-4"/>Import JSON</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json"/>
                        <button onClick={onClearData} className="px-3 py-1.5 text-sm rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 flex items-center gap-2"><Trash2Icon className="w-4 h-4"/>Clear All Data</button>
                    </div>
                 </div>
             </div>
             <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => onSave(localSettings)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Save Settings</button>
             </div>
        </Modal>
    );
};


// CONFIRMATION MODAL
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    onConfirm: () => void;
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, title, description, onConfirm }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
                <AlertTriangleIcon className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6">{description}</p>
            <div className="flex justify-center gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md border border-border hover:bg-accent">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm</button>
            </div>
        </div>
    </Modal>
);