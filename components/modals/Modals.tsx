import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import { Token, Settings, StrategyComparison, ApiToken, ExitStrategyType, PortfolioValues, Conviction, AiRebalancePlan } from '../../types';
import { formatCurrency, formatTokenPrice, parseShorthandNumber, formatShorthandNumber, formatCompactNumber } from '../../utils/formatters';
// FIX: Removed unused icon imports (CheckIcon, ScaleIcon, DollarSignIcon, InfoIcon) to resolve export errors.
import { XIcon, SearchIcon, AlertTriangleIcon, DownloadIcon, UploadIcon, Trash2Icon, PencilIcon, TrophyIcon, CompareHorizontalIcon, ScissorsIcon, TargetIcon, LightbulbIcon, ArrowLeftIcon, ShieldIcon, DollarSignIcon, RocketIcon, TrendingUpIcon, WandSparklesIcon } from '../ui/Icons';
import { compareStrategies, STRATEGY_CONFIG, generateAiStrategy, getAiRebalancePlan, calculatePortfolioValues } from '../../utils/portfolioCalculations';
import { useDebounce } from '../../hooks/useDebounce';
import { CustomExitStrategyModal } from './CustomExitStrategyModal';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'|'full' }> = ({ isOpen, onClose, children, size = 'md' }) => {
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
        full: 'max-w-full h-full m-0 rounded-none'
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
            <div ref={modalRef} className={`bg-[var(--color-card)] rounded-xl w-full ${sizeClasses[size]} shadow-xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in`} onClick={e => e.stopPropagation()}>
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors z-10" aria-label="Close modal">
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
    addToast: (title: string, description: string, variant: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose, onSave, existingToken, searchTokensFunction, addToast }) => {
    const [step, setStep] = useState(1);
    const [token, setToken] = useState<Partial<Token>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<ApiToken[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [marketCapInput, setMarketCapInput] = useState('');
    const [targetMarketCapInput, setTargetMarketCapInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // AI Strategy State
    const [desiredProfitInput, setDesiredProfitInput] = useState('');
    const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
    const [generatedStrategy, setGeneratedStrategy] = useState<{ stages: { percentage: number, multiplier: number }[], warning?: string } | null>(null);

    // Custom Strategy State
    const [showCustomStrategyModal, setShowCustomStrategyModal] = useState(false);


    useEffect(() => {
        const isEditing = !!existingToken;
        const initialToken = existingToken || {
            name: '', symbol: '', amount: 0, price: 0, entryPrice: 0, marketCap: 0, targetMarketCap: 0, exitStrategy: 'targetMC', conviction: 'medium', chain: '', pairAddress: ''
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
        setToken({ exitStrategy: 'targetMC', conviction: 'medium' });
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
            imageUrl: apiToken.imageUrl,
            conviction: prev.conviction || 'medium',
        }));
        
        setMarketCapInput(newMarketCap > 0 ? formatShorthandNumber(newMarketCap) : '');
        setTargetMarketCapInput(newTargetMarketCap > 0 ? formatShorthandNumber(newTargetMarketCap) : '');
        
        setSearchTerm('');
        setSearchResults([]);
        setStep(2);
    };

    const handleGenerateStrategy = async () => {
        setIsGenerating(true);
        setGeneratedStrategy(null);
        try {
            const desiredProfit = parseShorthandNumber(desiredProfitInput);
            if (desiredProfit <= 0) {
                 addToast('Invalid Input', 'Please enter a desired profit amount.', 'warning');
                 return;
            }
            const result = await generateAiStrategy(token, desiredProfit, riskTolerance);
            setGeneratedStrategy(result);
        } catch (error) {
            console.error(error);
            addToast('AI Error', error instanceof Error ? error.message : 'Could not generate strategy.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyStrategy = () => {
        if (generatedStrategy && generatedStrategy.stages.length > 0) {
            setToken(prev => ({
                ...prev,
                exitStrategy: 'ai',
                customExitStages: generatedStrategy.stages,
            }));
            addToast('Strategy Applied', 'The AI-generated strategy has been set.', 'success');
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
            conviction: token.conviction || 'medium',
            customExitStages: token.customExitStages,
            imageUrl: token.imageUrl
        });
    };

    const convictionStyles: { [key in Conviction]: { base: string; text: string; } } = {
        low: { base: 'bg-destructive text-destructive-foreground', text: 'text-destructive-foreground' },
        medium: { base: 'bg-warning text-warning-foreground', text: 'text-warning-foreground' },
        high: { base: 'bg-success text-success-foreground', text: 'text-success-foreground' },
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

                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h3 className="font-semibold mb-2 text-muted-foreground">Conviction Level</h3>
                            <div className="flex rounded-md overflow-hidden border border-border">
                                {(['low', 'medium', 'high'] as Conviction[]).map((level, i) => {
                                    const isSelected = token.conviction === level;
                                    return (
                                        <button 
                                            key={level} 
                                            type="button" 
                                            onClick={() => setToken(prev => ({ ...prev, conviction: level }))} 
                                            className={`flex-1 p-2 text-sm rounded-none capitalize transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-card)] focus:z-10 ${i > 0 ? 'border-l border-border' : ''} ${isSelected ? `${convictionStyles[level].base} font-semibold shadow-inner` : 'bg-muted/50 hover:bg-accent'}`}
                                        >
                                            {level}
                                        </button>
                                    );
                                })}
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
                                <option value="progressive">Progressive Realization (50%, 75%, 90%, 100%)</option>
                                <option value="ladder">Ladder Exit (2x, 4x, 8x, 16x)</option>
                                <option value="conservative">Conservative Exit (3x, 6x, 10x)</option>
                                <option value="moonOrBust">Moon or Bust (5x, 10x, hold 50%)</option>
                                <option value="custom">Custom Exit Strategy</option>
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
                                     <button type="button" onClick={handleGenerateStrategy} disabled={isGenerating} className="w-full px-4 py-2 rounded-md border border-border hover:bg-accent font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        {isGenerating ? <><Spinner/>Generating...</> : 'Generate Plan'}
                                     </button>
                                     {generatedStrategy && (
                                        <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                                            {generatedStrategy.warning && <p className="text-xs text-warning flex items-center gap-2"><AlertTriangleIcon className="w-4 h-4" />{generatedStrategy.warning}</p>}
                                            {generatedStrategy.stages.length > 0 ? (
                                                <>
                                                    <h4 className="font-semibold text-sm">Suggested Strategy:</h4>
                                                    <ul className="text-sm space-y-1">
                                                    {generatedStrategy.stages.map((s, i) => <li key={i}>- Sell {s.percentage.toFixed(1)}% at ~{s.multiplier.toFixed(1)}x profit</li>)}
                                                    </ul>
                                                    <button type="button" onClick={handleApplyStrategy} className="w-full mt-2 px-4 py-2 text-sm rounded-md bg-success text-success-foreground hover:bg-success/90">Apply This Strategy</button>
                                                </>
                                            ) : <p className="text-sm text-center text-muted-foreground">Could not generate a strategy. Check inputs.</p>}
                                        </div>
                                     )}
                                </div>
                            </details>
                        </div>

                        {/* Custom Strategy Builder */}
                        <div className="border border-border rounded-lg p-4 bg-muted/50">
                            <details open={token.exitStrategy === 'custom'}>
                                <summary className="font-semibold cursor-pointer flex justify-between items-center text-primary">
                                    <span className="flex items-center gap-2"><TargetIcon className="w-5 h-5"/> Custom Exit Strategy</span>
                                </summary>
                                <div className="mt-4 space-y-4 animate-fade-in">
                                    <p className="text-sm text-muted-foreground">Create your own custom exit strategy with specific sell levels and percentages.</p>
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">Custom Strategy</p>
                                            <p className="text-xs text-muted-foreground">
                                                {token.customExitStages && token.customExitStages.length > 0 
                                                    ? `${token.customExitStages.length} stages configured`
                                                    : 'No custom stages set'
                                                }
                                            </p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCustomStrategyModal(true)}
                                            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            {token.customExitStages && token.customExitStages.length > 0 ? 'Edit Strategy' : 'Create Strategy'}
                                        </button>
                                    </div>
                                    {token.customExitStages && token.customExitStages.length > 0 && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <h4 className="font-semibold text-sm mb-2">Current Strategy:</h4>
                                            <ul className="text-sm space-y-1">
                                                {token.customExitStages
                                                    .sort((a, b) => a.multiplier - b.multiplier)
                                                    .map((stage, i) => (
                                                    <li key={i} className="flex justify-between">
                                                        <span>Stage {i + 1}: ${stage.multiplier}</span>
                                                        <span className="font-medium">{stage.percentage}%</span>
                                                    </li>
                                                ))}
                                            </ul>
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

            {/* Custom Exit Strategy Modal */}
            <CustomExitStrategyModal
                isOpen={showCustomStrategyModal}
                onClose={() => setShowCustomStrategyModal(false)}
                onSave={(stages) => {
                    setToken(prev => ({ ...prev, customExitStages: stages }));
                    setShowCustomStrategyModal(false);
                }}
                existingStages={token.customExitStages}
                tokenName={token.name || 'Token'}
            />
        </Modal>
    );
};

// TOKEN DETAILS MODAL
interface TokenDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: Token;
    onSave: (token: Token) => void;
    onEdit: (token: Token) => void;
    isBalanceHidden: boolean;
}
export const TokenDetailsModal: React.FC<TokenDetailsModalProps> = ({ isOpen, onClose, token, onSave, onEdit, isBalanceHidden }) => {
    const [activeStrategy, setActiveStrategy] = useState<ExitStrategyType>(token.exitStrategy);
    const [showCustomStrategyModal, setShowCustomStrategyModal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveStrategy(token.exitStrategy);
        }
    }, [isOpen, token.exitStrategy]);

    const tokenForComparison = useMemo(() => ({
        ...token,
        exitStrategy: activeStrategy,
        // Only use custom stages if the 'ai' strategy is actively selected for comparison
        customExitStages: activeStrategy === 'ai' ? token.customExitStages : undefined,
    }), [token, activeStrategy]);
    
    const comparison = useMemo(() => compareStrategies(tokenForComparison), [tokenForComparison]);
    const { selectedStrategy, allAtOnce, winner } = comparison;
    
    const handleApplyStrategy = () => {
        const updatedToken: Token = {
            ...token,
            exitStrategy: activeStrategy,
        };
        onSave(updatedToken);
        onClose();
    };
    
    const showComparisonView = activeStrategy !== 'targetMC';

    let selectedStrategyConfig: { name: string, description: string };
    if (activeStrategy === 'ai') {
        selectedStrategyConfig = { name: 'AI-Generated Strategy', description: 'A custom strategy based on your profit and risk inputs.' };
    } else if (activeStrategy === 'custom') {
        selectedStrategyConfig = { name: 'Custom Exit Strategy', description: 'Your own custom exit strategy with specific sell levels and percentages.' };
    } else if (activeStrategy === 'progressive') {
        selectedStrategyConfig = STRATEGY_CONFIG.progressive;
    } else if (activeStrategy === 'ladder' || activeStrategy === 'conservative' || activeStrategy === 'moonOrBust') {
        selectedStrategyConfig = STRATEGY_CONFIG[activeStrategy];
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
                 <h3 className="font-semibold mb-2 flex items-center gap-2"><CompareHorizontalIcon/> Exit Strategy Simulator</h3>
                 <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="strategy-selector" className="text-sm font-medium text-muted-foreground flex-shrink-0">Compare Strategy:</label>
                    <select
                        id="strategy-selector"
                        value={activeStrategy}
                        onChange={(e) => setActiveStrategy(e.target.value as ExitStrategyType)}
                        className="w-full bg-card/50 border border-border rounded-md px-2 py-1.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                        <option value="targetMC">All at Target Market Cap</option>
                        <option value="progressive">Progressive Realization</option>
                        <option value="ladder">Ladder Exit</option>
                        <option value="conservative">Conservative Exit</option>
                        <option value="moonOrBust">Moon or Bust</option>
                        <option value="custom">Custom Exit Strategy</option>
                        {(token.customExitStages && token.customExitStages.length > 0) && <option value="ai">AI Generated Strategy</option>}
                    </select>
                </div>

                 <div className={`grid grid-cols-1 ${!showComparisonView ? '' : 'md:grid-cols-2'} gap-4`}>
                    <StrategyCard
                        title={selectedStrategyConfig.name}
                        description={selectedStrategyConfig.description}
                        totalValue={selectedStrategy.totalExitValue}
                        profit={selectedStrategy.profit}
                        profitPercent={selectedStrategy.profitPercentage}
                        isWinner={winner === 'selectedStrategy' && showComparisonView}
                        icon={!showComparisonView ? <TargetIcon/> : (activeStrategy === 'ai' ? <LightbulbIcon/> : <ScissorsIcon/>)}
                    >
                        {!selectedStrategy.profitStages || selectedStrategy.profitStages.length === 0 ? (
                             <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between"><span>Target Price:</span><span>{isBalanceHidden ? '*****' : formatTokenPrice(allAtOnce.targetPrice)}</span></div>
                                <div className="flex justify-between"><span>Amount to Sell:</span><span>100%</span></div>
                            </div>
                        ) : (
                             <div className="text-sm text-muted-foreground -mx-2">
                                <div className="flex justify-between px-2 py-1 font-semibold text-xs uppercase">
                                    <span>Action</span>
                                    <span>Price (Multiplier)</span>
                                </div>
                                <div className="space-y-1">
                                {selectedStrategy.profitStages?.map((stage, i) => (
                                    <div key={i} className="flex justify-between items-center px-2 py-1.5 rounded-md hover:bg-primary/5">
                                        <span>Sell {stage.percentage.toFixed(1)}%</span>
                                        <span className="font-mono text-xs p-1 bg-muted rounded">{isBalanceHidden ? '*****' : `${formatTokenPrice(stage.price)} (${stage.multiplier.toFixed(1)}x)`}</span>
                                    </div>
                                ))}
                                {activeStrategy === 'moonOrBust' && (
                                    <div className="flex justify-between border-t border-border/50 pt-1 mt-1 font-medium px-2">
                                        <span>Hold remaining:</span>
                                        <span>50%</span>
                                    </div>
                                )}
                                </div>
                                {activeStrategy === 'custom' && (
                                    <div className="mt-3 pt-3 border-t border-border/50">
                                        <button
                                            onClick={() => setShowCustomStrategyModal(true)}
                                            className="w-full px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            Edit Custom Strategy
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </StrategyCard>

                    {showComparisonView && (
                        <StrategyCard
                            title="vs. All At Target"
                            description="For comparison, this is the result of selling 100% at your final target market cap."
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

            <div className="flex flex-col md:flex-row justify-end gap-3">
                 <button onClick={() => onEdit(token)} className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center gap-2">
                    <PencilIcon className="w-4 h-4" /> Edit Full Details
                </button>
                <button 
                    onClick={handleApplyStrategy} 
                    disabled={activeStrategy === token.exitStrategy}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    Apply Strategy
                </button>
            </div>

            {/* Custom Exit Strategy Modal */}
            <CustomExitStrategyModal
                isOpen={showCustomStrategyModal}
                onClose={() => setShowCustomStrategyModal(false)}
                onSave={(stages) => {
                    const updatedToken = { ...token, customExitStages: stages };
                    onSave(updatedToken);
                    setShowCustomStrategyModal(false);
                }}
                existingStages={token.customExitStages}
                tokenName={token.name}
            />
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

// REBALANCE WORKBENCH MODAL
type RebalanceGoal = 'accelerate' | 'risk' | 'profit';
type WorkbenchStep = 'goal_selection' | 'workbench' | 'plan_summary';

interface RebalanceWorkbenchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokens: Token[];
    portfolioValues: PortfolioValues;
    isBalanceHidden: boolean;
}

export const RebalanceWorkbenchModal: React.FC<RebalanceWorkbenchModalProps> = ({ isOpen, onClose, tokens, portfolioValues, isBalanceHidden }) => {
    const [step, setStep] = useState<WorkbenchStep>('goal_selection');
    const [goal, setGoal] = useState<RebalanceGoal | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<AiRebalancePlan | null>(null);
    const [sellSliders, setSellSliders] = useState<Record<string, number>>({});

    useEffect(() => {
        if (isOpen) {
            setStep('goal_selection');
            setGoal(null);
            setSellSliders({});
            setPlan(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);
    
    const handleSelectGoal = async (selectedGoal: RebalanceGoal) => {
        setGoal(selectedGoal);
        setStep('workbench');
        setIsLoading(true);
        setError(null);
        try {
            const aiPlan = await getAiRebalancePlan(tokens, selectedGoal);
            setPlan(aiPlan);
            // Pre-fill sliders with AI suggestions
            const initialSliders = aiPlan.sells.reduce((acc, sell) => {
                const token = tokens.find(t => t.symbol === sell.symbol);
                if (token) {
                    acc[token.id] = sell.percentage;
                }
                return acc;
            }, {} as Record<string, number>);
            setSellSliders(initialSliders);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSliderChange = (tokenId: string, value: number) => {
        setSellSliders(prev => ({...prev, [tokenId]: value}));
    };
    
    const { sourceCandidates, buyCandidate, totalToReallocate, simulatedValues, finalPlan } = useMemo(() => {
        if (!plan) return { sourceCandidates: [], buyCandidate: null, totalToReallocate: 0, simulatedValues: portfolioValues, finalPlan: { sells: [], buys: [] } };

        const sourceTokens = plan.sells
            .map(sell => tokens.find(t => t.symbol === sell.symbol))
            .filter((t): t is Token => !!t)
            .map(t => ({...t, value: t.amount * t.price}));

        const buyToken = plan.buy ? tokens.find(t => t.symbol === plan.buy!.symbol) : null;

        const totalToReallocate = sourceTokens.reduce((acc, token) => {
            const percentage = sellSliders[token.id] || 0;
            return acc + (token.value * (percentage / 100));
        }, 0);

        let simulatedTokens = [...tokens];
        if (totalToReallocate > 0 && buyToken) {
            simulatedTokens = tokens.map(t => {
                const sellPercentage = sellSliders[t.id];
                if (sellPercentage > 0) {
                    const newAmount = t.amount * (1 - sellPercentage / 100);
                    return { ...t, amount: newAmount };
                }
                if (t.id === buyToken.id) {
                    const amountToAdd = totalToReallocate / t.price;
                    return { ...t, amount: t.amount + amountToAdd };
                }
                return t;
            });
        }
        
        const simulatedValues = calculatePortfolioValues(simulatedTokens);

        const finalPlan = {
            sells: sourceTokens
                .map(t => ({ token: t, percentage: sellSliders[t.id] || 0 }))
                .filter(s => s.percentage > 0)
                .map(s => ({ ...s, amountUSD: s.token.value * (s.percentage / 100) })),
            buys: buyToken ? [{ token: buyToken, amountUSD: totalToReallocate }] : [],
        };

        return { sourceCandidates: sourceTokens, buyCandidate: buyToken, totalToReallocate, simulatedValues, finalPlan };
    }, [plan, sellSliders, tokens, portfolioValues]);

    const GoalButton: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void }> = ({ icon, title, description, onClick }) => (
        <button onClick={onClick} className="p-6 border border-border rounded-lg text-left hover:bg-accent hover:border-primary transition-all flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">{icon}</div>
            <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </button>
    );

    const renderGoalSelection = () => (
        <>
            <h2 className="text-2xl font-bold mb-1 text-center">AI Portfolio Optimizer</h2>
            <p className="text-muted-foreground text-center mb-6">What is your primary goal for rebalancing today?</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GoalButton icon={<DollarSignIcon className="w-6 h-6"/>} title="Take Profits" description="Secure gains from tokens that are near their target." onClick={() => handleSelectGoal('profit')} />
                <GoalButton icon={<ShieldIcon className="w-6 h-6"/>} title="Reduce Risk" description="Trim oversized positions to diversify and protect your portfolio." onClick={() => handleSelectGoal('risk')} />
                <GoalButton icon={<RocketIcon className="w-6 h-6"/>} title="Accelerate Growth" description="Move capital from underperformers to high-potential assets." onClick={() => handleSelectGoal('accelerate')} />
            </div>
        </>
    );

    const renderWorkbench = () => {
        const goalInfo = {
            profit: { title: "Take Profits", icon: <DollarSignIcon className="w-5 h-5"/> },
            risk: { title: "Reduce Risk", icon: <ShieldIcon className="w-5 h-5"/> },
            accelerate: { title: "Accelerate Growth", icon: <RocketIcon className="w-5 h-5"/> },
        };
        const currentGoalInfo = goal ? goalInfo[goal] : {title: '', icon: null};

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    <Spinner />
                    <h2 className="text-xl font-semibold mt-4">Analyzing Your Portfolio...</h2>
                    <p className="text-muted-foreground">The AI is crafting a custom rebalancing plan for you.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                     <AlertTriangleIcon className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold mt-4">Analysis Failed</h2>
                    <p className="text-muted-foreground max-w-md">{error}</p>
                     <button onClick={() => setStep('goal_selection')} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground">Try a Different Goal</button>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                     <button onClick={() => setStep('goal_selection')} className="p-2 rounded-full hover:bg-accent" aria-label="Go back"><ArrowLeftIcon className="w-5 h-5"/></button>
                     <h2 className="text-2xl font-bold flex items-center gap-2">{currentGoalInfo.icon} {currentGoalInfo.title}</h2>
                </div>
                {sourceCandidates.length === 0 && !buyCandidate ? (
                     <div className="text-center flex-grow flex flex-col justify-center items-center h-80">
                        <p className="text-lg font-semibold">No recommendations for this goal.</p>
                        <p className="text-muted-foreground max-w-md">{plan?.rationale || "The AI determined your portfolio is well-aligned for this objective."}</p>
                    </div>
                ) : (
                <>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                    <h3 className="font-semibold text-primary flex items-center gap-2"><WandSparklesIcon /> AI Rationale</h3>
                    <p className="text-sm text-primary/80">{plan?.rationale}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
                    {/* Source Column */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-destructive">Source Funds (Sell)</h3>
                        {sourceCandidates.map(token => (
                            <div key={token.id} className="p-4 border border-border rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <img src={token.imageUrl} className="w-6 h-6 rounded-full" alt={token.name}/>
                                        <span className="font-semibold">{token.symbol}</span>
                                    </div>
                                    <span className="font-bold text-lg">{formatCurrency((token.value * ( (sellSliders[token.id] || 0) / 100)))}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="range" min="0" max="100" step="5" value={sellSliders[token.id] || 0} onChange={(e) => handleSliderChange(token.id, parseInt(e.target.value))} className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                                    <span className="font-mono w-12 text-center">{sellSliders[token.id] || 0}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Destination Column */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-success">Destination (Buy)</h3>
                        {buyCandidate ? (
                            <div className="p-4 border border-border rounded-lg bg-success/5">
                                <div className="flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                        <img src={buyCandidate.imageUrl} className="w-6 h-6 rounded-full" alt={buyCandidate.name}/>
                                        <span className="font-semibold">{buyCandidate.symbol}</span>
                                     </div>
                                     <span className="font-bold text-lg text-success">+{formatCurrency(totalToReallocate)}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{plan?.buy?.rationale || `Re-allocating to a high-potential asset.`}</p>
                            </div>
                        ) : <p className="text-muted-foreground">No suitable buy candidate found by the AI.</p>}
                    </div>
                </div>

                {/* Impact Analysis Footer */}
                <div className="mt-6 p-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <h4 className="text-sm text-muted-foreground">Capital to Re-allocate</h4>
                        <p className="text-xl font-bold text-primary">{formatCurrency(totalToReallocate)}</p>
                    </div>
                     <div>
                        <h4 className="text-sm text-muted-foreground">Original Potential</h4>
                        <p className="text-xl font-bold">{portfolioValues.growthMultiplier.toFixed(2)}x</p>
                    </div>
                    <div>
                        <h4 className="text-sm text-muted-foreground">New Potential</h4>
                        <p className="text-xl font-bold text-success">{simulatedValues.growthMultiplier.toFixed(2)}x</p>
                    </div>
                    <div className="flex items-center justify-center">
                        <button onClick={() => setStep('plan_summary')} disabled={totalToReallocate < 1} className="w-full px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground">View Plan</button>
                    </div>
                </div>
                </>
                )}
            </div>
        );
    };
    
    const renderPlanSummary = () => (
        <div>
            <div className="flex items-center gap-4 mb-4">
                 <button onClick={() => setStep('workbench')} className="p-2 rounded-full hover:bg-accent" aria-label="Go back"><ArrowLeftIcon className="w-5 h-5"/></button>
                 <h2 className="text-2xl font-bold">Your Rebalancing Plan</h2>
            </div>
            <p className="text-muted-foreground mb-6">This is an unactioned plan based on your simulation. You will need to perform these trades manually.</p>
            <div className="space-y-4">
                {finalPlan.sells.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-lg text-destructive mb-2">1. Sell Orders</h3>
                        <div className="space-y-2">
                        {finalPlan.sells.map(({token, percentage, amountUSD}) => (
                            <div key={token.id} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                                <span>Sell <strong>{percentage}%</strong> of your <strong>{token.symbol}</strong> holding</span>
                                <span className="font-semibold">{formatCurrency(amountUSD)}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                 {finalPlan.buys.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-lg text-success mb-2">2. Buy Order</h3>
                        <div className="space-y-2">
                        {finalPlan.buys.map(({token, amountUSD}) => (
                            <div key={token.id} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                                <span>Buy <strong>{token.symbol}</strong> with re-allocated funds</span>
                                <span className="font-semibold">{formatCurrency(amountUSD)}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>
             <div className="mt-8 text-center">
                 <button onClick={onClose} className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Done</button>
            </div>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            {step === 'goal_selection' && renderGoalSelection()}
            {step === 'workbench' && renderWorkbench()}
            {step === 'plan_summary' && renderPlanSummary()}
        </Modal>
    );
};