import React, { useState, useEffect } from 'react';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import { VaultIcon, RefreshCwIcon, SettingsIcon, SunIcon, MoonIcon, EyeIcon, EyeOffIcon } from './ui/Icons';

interface HeaderProps {
    portfolioValue: number;
    theme: string;
    isUpdating: boolean;
    isBalanceHidden: boolean;
    lastUpdated: Date | null;
    onThemeToggle: () => void;
    onRefresh: () => void;
    onSettings: () => void;
    onToggleBalance: () => void;
}

export const Header: React.FC<HeaderProps> = ({ portfolioValue, theme, isUpdating, isBalanceHidden, lastUpdated, onThemeToggle, onRefresh, onSettings, onToggleBalance }) => {
    const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(lastUpdated));

    useEffect(() => {
        setRelativeTime(formatRelativeTime(lastUpdated));
        const interval = setInterval(() => {
            setRelativeTime(formatRelativeTime(lastUpdated));
        }, 5000); // Update relative time string every 5 seconds
        return () => clearInterval(interval);
    }, [lastUpdated]);

    return (
        <header className="sticky top-0 z-50 w-full p-4">
            <div className="max-w-7xl mx-auto glassmorphism rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary animate-pulse-soft">
                            <VaultIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-[var(--color-foreground)]">CryptoVault</h1>
                            <p className="text-xs md:text-sm text-[var(--color-muted-foreground)] transition-opacity">
                               {isUpdating ? 'Fetching latest market prices...' : (lastUpdated ? `Last updated: ${relativeTime}` : 'Exit Strategy Simulator')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm text-[var(--color-muted-foreground)]">Portfolio Value</p>
                            <p className="text-lg font-semibold text-[var(--color-foreground)]">{isBalanceHidden ? '*****' : formatCurrency(portfolioValue)}</p>
                        </div>
                        <button onClick={onToggleBalance} className="p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors" aria-label="Toggle Balance Visibility">
                            {isBalanceHidden ? <EyeOffIcon className="w-5 h-5 text-[var(--color-muted-foreground)]" /> : <EyeIcon className="w-5 h-5 text-[var(--color-muted-foreground)]" />}
                        </button>
                        <button onClick={onRefresh} className="p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors" aria-label="Refresh Data" disabled={isUpdating}>
                            <RefreshCwIcon className={`w-5 h-5 text-[var(--color-muted-foreground)] ${isUpdating ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onSettings} className="p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors" aria-label="Settings">
                            <SettingsIcon className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                        </button>
                        <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors" aria-label="Toggle Theme">
                            {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};