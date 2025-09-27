import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Token, Settings, ModalState, ToastMessage, PortfolioHistoryEntry, TopOpportunity } from './types';
import { formatCurrency, formatTokenPrice, formatCompactNumber } from './utils/formatters';
import { searchTokens, batchFetchMarketData } from './services/api';
import { calculatePortfolioValues, findTopOpportunities } from './utils/portfolioCalculations';
import { exportToCSV, exportToJSON } from './utils/export';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AddTokenModal, TokenDetailsModal, SettingsModal, ConfirmationModal, RebalanceWorkbenchModal } from './components/modals/Modals';
import { Toast } from './components/ui/Toast';
import { useLocalStorage } from './hooks/useLocalStorage';

const App: React.FC = () => {
    const [theme, setTheme] = useLocalStorage<string>('theme', 'dark');
    const [tokens, setTokens] = useLocalStorage<Token[]>('cryptoTokens', []);
    const [history, setHistory] = useLocalStorage<PortfolioHistoryEntry[]>('portfolioHistory', []);
    const [settings, setSettings] = useLocalStorage<Settings>('portfolioSettings', {
        updateInterval: 30,
        notificationsEnabled: true,
        sortTokensBy: 'value',
    });
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [needsUpdate, setNeedsUpdate] = useState<{ type: 'manual' | 'auto' } | null>(null);
    const [isBalanceHidden, setIsBalanceHidden] = useLocalStorage<boolean>('isBalanceHidden', false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


    const [modalState, setModalState] = useState<ModalState>({
        addToken: false,
        tokenDetails: null,
        settings: false,
        rebalanceWorkbench: false,
        confirm: null
    });

    // One-time data migration for legacy data, runs only once.
    useEffect(() => {
        const CHAIN_MIGRATION_MAP: { [key: string]: string } = { 'eth': 'ethereum' };
        
        const needsMigration = tokens.some(t => 
            Object.keys(CHAIN_MIGRATION_MAP).includes(t.chain) || !t.conviction
        );
        
        if (needsMigration) {
            console.log("Migrating legacy token data (chains and conviction)...");
            const migratedTokens = tokens.map(token => {
                const migratedToken = { ...token };
                if (CHAIN_MIGRATION_MAP[migratedToken.chain]) {
                    migratedToken.chain = CHAIN_MIGRATION_MAP[migratedToken.chain];
                }
                if (!migratedToken.conviction) {
                    migratedToken.conviction = 'medium'; // Add default conviction
                }
                return migratedToken;
            });
            setTokens(migratedTokens);
        }
        setIsInitialized(true); // Signal that migration check is complete.
    }, []); 

    const addToast = useCallback((title: string, description: string, variant: 'success' | 'error' | 'warning' | 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, description, variant }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const portfolioValues = useMemo(() => calculatePortfolioValues(tokens), [tokens]);
    
    const topOpportunities = useMemo(() => findTopOpportunities(tokens), [tokens]);

    const updatePrices = useCallback(async (isManual = false) => {
        if (tokens.length === 0) {
            setIsUpdating(false);
            return;
        }

        setIsUpdating(true);

        try {
            const tokensToUpdate = tokens.filter(t => t.chain && t.pairAddress);
            if (tokensToUpdate.length === 0) {
                console.warn("No tokens with chain/pair data to update.");
                if (isManual) addToast('No Updatable Tokens', 'None of your tokens have the required data for price updates.', 'warning');
                setIsUpdating(false);
                return;
            }

            const updates = await batchFetchMarketData(tokensToUpdate);

            const finalTokens = tokens.map(originalToken => {
                const pairAddressLower = originalToken.pairAddress?.toLowerCase();
                if (pairAddressLower && updates.has(pairAddressLower)) {
                    const update = updates.get(pairAddressLower)!;
                    return { ...originalToken, ...update };
                }
                return originalToken;
            });

            setTokens(finalTokens);
            setLastUpdated(new Date());
            if (isManual) addToast('Update Complete', 'Portfolio data has been refreshed.', 'success');
        } catch (error) {
            console.error('Failed to update prices:', error);
            const errorMessage = error instanceof Error ? error.message : 'Could not refresh token data.';
            if (isManual) addToast('Update Failed', errorMessage, 'error');
        } finally {
            setIsUpdating(false);
        }
    }, [tokens, setTokens, addToast]);
    
    // Effect to trigger an immediate update after state changes from import/save
    useEffect(() => {
        if (needsUpdate) {
            updatePrices(needsUpdate.type === 'manual');
            setNeedsUpdate(null); // Reset trigger
        }
    }, [needsUpdate, tokens]); // Depend on tokens to ensure it runs *after* state is set

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme]);

    const savedUpdatePrices = useRef(updatePrices);

    useEffect(() => {
        savedUpdatePrices.current = updatePrices;
    }, [updatePrices]);
    
    useEffect(() => {
        if (!isInitialized) return; // Don't run updates until initialization is complete.

        savedUpdatePrices.current(false);

        if (settings.updateInterval > 0) {
            const intervalId = setInterval(() => {
                savedUpdatePrices.current();
            }, settings.updateInterval * 1000);
            return () => clearInterval(intervalId);
        }
    }, [isInitialized, settings.updateInterval]);
    
    // Auto-refresh when tab becomes visible again
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePrices(false); // No toast for this auto-refresh
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [updatePrices]);


    useEffect(() => {
        if (tokens.length === 0) return;

        const today = new Date().toDateString();
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;

        if (!lastEntry || new Date(lastEntry.timestamp).toDateString() !== today) {
            // It's a new day or the history is empty. Add a new entry.
            const newEntry: PortfolioHistoryEntry = {
                timestamp: new Date().toISOString(),
                totalValue: portfolioValues.total,
            };
            // Append the new entry and ensure we don't keep more than 30 entries.
            setHistory(prev => [...prev, newEntry].slice(-30));
        } else {
            // It's the same day. Update the value of the last entry if it's different.
            // This check prevents an infinite render loop.
            if (lastEntry.totalValue !== portfolioValues.total) {
                const updatedHistory = [...history];
                // Update the last entry with the new total value, keeping the original timestamp for the day.
                updatedHistory[updatedHistory.length - 1] = {
                    ...lastEntry,
                    totalValue: portfolioValues.total
                };
                setHistory(updatedHistory);
            }
        }
    }, [tokens, portfolioValues.total, history, setHistory]);

    const handleSaveToken = (token: Token) => {
        const isEditing = tokens.some(t => t.id === token.id);
        if (isEditing) {
            setTokens(tokens.map(t => t.id === token.id ? token : t));
            addToast('Token Updated', `${token.name} has been updated in your portfolio.`, 'success');
        } else {
            setTokens([...tokens, token]);
            addToast('Token Added', `${token.name} has been added to your portfolio.`, 'success');
        }
        setModalState(prev => ({ ...prev, addToken: false }));
        setNeedsUpdate({ type: 'auto' });
    };

    const handleRemoveToken = (tokenId: string) => {
        const token = tokens.find(t => t.id === tokenId);
        if (token) {
            setModalState(prev => ({ ...prev, confirm: {
                title: `Remove ${token.symbol}?`,
                description: `Are you sure you want to remove ${token.name} from your portfolio? This action cannot be undone.`,
                onConfirm: () => {
                    setTokens(tokens.filter(t => t.id !== tokenId));
                    addToast('Token Removed', `${token.name} has been removed.`, 'success');
                    setModalState(prev => ({ ...prev, confirm: null }));
                }
            }}));
        }
    };

    const handleEditToken = (token: Token) => {
        setModalState(prev => ({ ...prev, addToken: true, tokenDetails: token }));
    };
    
    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        addToast('Settings Saved', 'Your preferences have been updated.', 'success');
        setModalState(prev => ({ ...prev, settings: false }));
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (format === 'json') {
            exportToJSON({ tokens, settings, history });
        } else {
            exportToCSV(tokens);
        }
        addToast('Data Exported', `Portfolio has been exported to ${format.toUpperCase()}.`, 'success');
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.tokens && Array.isArray(data.tokens) && data.settings && data.history) {
                    const importedTokens: Token[] = data.tokens;
                    setTokens(importedTokens);
                    setSettings(data.settings);
                    setHistory(data.history);

                    const missingDataCount = importedTokens.filter(t => !t.chain || !t.pairAddress).length;
                    if (missingDataCount > 0) {
                        addToast(
                            'Import Successful with Warnings', 
                            `${missingDataCount} token(s) are missing market data. Please edit them to enable price updates.`, 
                            'warning'
                        );
                    } else {
                        addToast('Import Successful', 'Portfolio data has been loaded.', 'success');
                    }
                    
                    setNeedsUpdate({ type: 'manual' });
                } else {
                    addToast('Import Failed', 'Invalid JSON file format.', 'error');
                }
            } catch (e) {
                addToast('Import Failed', 'Could not parse the file.', 'error');
            }
        };
        reader.readAsText(file);
        setModalState(prev => ({ ...prev, settings: false }));
    };

    const handleClearData = () => {
         setModalState(prev => ({ ...prev, confirm: {
            title: 'Clear All Data?',
            description: 'This will remove all your tokens, history, and settings. This action is irreversible.',
            onConfirm: () => {
                setTokens([]);
                setHistory([]);
                setSettings({
                    updateInterval: 30,
                    notificationsEnabled: true,
                    sortTokensBy: 'value',
                });
                setModalState(prev => ({ ...prev, confirm: null, settings: false }));
                addToast('Data Cleared', 'All your portfolio data has been removed.', 'success');
            }
         }}));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const toggleBalanceVisibility = () => {
        setIsBalanceHidden(prev => !prev);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <main className={`${theme}`}>
            <div className="bg-[var(--color-background)] text-[var(--color-foreground)] min-h-screen font-sans">
                <Header 
                    portfolioValue={portfolioValues.total}
                    isUpdating={isUpdating}
                    theme={theme}
                    isBalanceHidden={isBalanceHidden}
                    lastUpdated={lastUpdated}
                    onThemeToggle={toggleTheme}
                    onRefresh={() => updatePrices(true)}
                    onSettings={() => setModalState(prev => ({...prev, settings: true}))}
                    onToggleBalance={toggleBalanceVisibility}
                />
                <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                   <Dashboard 
                       tokens={tokens}
                       portfolioValues={portfolioValues}
                       history={history}
                       sortOrder={settings.sortTokensBy}
                       isUpdating={isUpdating}
                       topOpportunities={topOpportunities}
                       isBalanceHidden={isBalanceHidden}
                       onSortChange={(value) => setSettings(s => ({...s, sortTokensBy: value}))}
                       onAddToken={() => setModalState(prev => ({ ...prev, addToken: true, tokenDetails: null }))}
                       onViewToken={(token) => setModalState(prev => ({...prev, tokenDetails: token}))}
                       onEditToken={handleEditToken}
                       onRemoveToken={handleRemoveToken}
                       onOpenWorkbench={() => setModalState(prev => ({...prev, rebalanceWorkbench: true}))}
                   />
                </div>

                <AddTokenModal
                    isOpen={modalState.addToken}
                    onClose={() => setModalState(prev => ({ ...prev, addToken: false, tokenDetails: null }))}
                    onSave={handleSaveToken}
                    existingToken={modalState.tokenDetails}
                    searchTokensFunction={searchTokens}
                />
                
                {modalState.tokenDetails && !modalState.addToken && (
                    <TokenDetailsModal 
                        isOpen={!!modalState.tokenDetails}
                        onClose={() => setModalState(prev => ({...prev, tokenDetails: null}))}
                        token={modalState.tokenDetails}
                        onSave={handleSaveToken}
                        onEdit={handleEditToken}
                        isBalanceHidden={isBalanceHidden}
                    />
                )}

                <SettingsModal
                    isOpen={modalState.settings}
                    onClose={() => setModalState(prev => ({...prev, settings: false}))}
                    settings={settings}
                    onSave={handleSaveSettings}
                    onExport={handleExport}
                    onImport={handleImport}
                    onClearData={handleClearData}
                />

                <RebalanceWorkbenchModal
                    isOpen={modalState.rebalanceWorkbench}
                    onClose={() => setModalState(prev => ({ ...prev, rebalanceWorkbench: false }))}
                    tokens={tokens}
                    portfolioValues={portfolioValues}
                    isBalanceHidden={isBalanceHidden}
                />

                {modalState.confirm && (
                   <ConfirmationModal 
                        isOpen={!!modalState.confirm}
                        onClose={() => setModalState(prev => ({...prev, confirm: null}))}
                        title={modalState.confirm.title}
                        description={modalState.confirm.description}
                        onConfirm={modalState.confirm.onConfirm}
                   />
                )}

                <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
                    <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                        {toasts.map((toast) => (
                           <Toast
                                key={toast.id}
                                {...toast}
                                onClose={() => removeToast(toast.id)}
                           />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default App;