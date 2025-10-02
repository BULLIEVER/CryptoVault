import React, { useState, useEffect } from 'react';
import { Token } from '../types';
import { formatCurrency } from '../utils/formatters';
import { rebalancePortfolio, QUICK_STRATEGIES, RebalanceResult, getAIStrategyRecommendation, AIRecommendation } from '../utils/quickRebalancing';
import { 
    TargetIcon, 
    CheckCircleIcon, 
    AlertTriangleIcon,
    XIcon,
    TrendingUpIcon,
    ArrowDownIcon,
    LightbulbIcon,
    WandSparklesIcon
} from './ui/Icons';

interface QuickRebalancerProps {
    tokens: Token[];
    isBalanceHidden: boolean;
    onClose: () => void;
}

export const QuickRebalancer: React.FC<QuickRebalancerProps> = ({
    tokens,
    isBalanceHidden,
    onClose
}) => {
    const [strategy, setStrategy] = useState<keyof typeof QUICK_STRATEGIES>('equal');
    const [result, setResult] = useState<RebalanceResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [userGoal, setUserGoal] = useState('');
    const [showAiAssistant, setShowAiAssistant] = useState(false);

    useEffect(() => {
        calculateRebalance();
    }, [tokens, strategy]);

    const calculateRebalance = async () => {
        if (tokens.length < 2) return;
        
        setIsLoading(true);
        try {
            const rebalanceResult = rebalancePortfolio(tokens, strategy);
            setResult(rebalanceResult);
        } catch (error) {
            console.error('Rebalancing error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getAIRecommendation = async () => {
        if (!userGoal.trim()) return;
        
        setIsAiLoading(true);
        try {
            const recommendation = await getAIStrategyRecommendation(tokens, userGoal);
            setAiRecommendation(recommendation);
            setStrategy(recommendation.recommendedStrategy);
        } catch (error) {
            console.error('AI recommendation error:', error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const renderAIStrategyAssistant = () => (
        <div className="space-y-4 p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
                <WandSparklesIcon className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-primary">AI Strategy Assistant</h3>
            </div>
            
            <p className="text-muted-foreground mb-4">
                Describe your investment goal and let AI recommend the best strategy for your portfolio.
            </p>
            
            <div className="space-y-3">
                <textarea
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    placeholder="e.g., 'I want to maximize my gains' or 'I'm looking for steady, safe growth'"
                    className="w-full p-3 border border-border rounded-lg bg-background resize-none"
                    rows={3}
                />
                
                <button
                    onClick={getAIRecommendation}
                    disabled={!userGoal.trim() || isAiLoading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isAiLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <LightbulbIcon className="w-4 h-4" />
                            Get AI Recommendation
                        </>
                    )}
                </button>
            </div>
            
            {aiRecommendation && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                            AI Pick
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {aiRecommendation.confidence}% confidence
                        </span>
                    </div>
                    <p className="text-sm text-primary/80 mb-2">{aiRecommendation.reasoning}</p>
                    <p className="text-xs text-muted-foreground">
                        Recommended: <strong>{QUICK_STRATEGIES[aiRecommendation.recommendedStrategy].name}</strong>
                    </p>
                </div>
            )}
        </div>
    );

    const renderStrategySelector = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Choose Strategy</h2>
                <button
                    onClick={() => setShowAiAssistant(!showAiAssistant)}
                    className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2"
                >
                    <WandSparklesIcon className="w-4 h-4" />
                    {showAiAssistant ? 'Hide' : 'Show'} AI Assistant
                </button>
            </div>
            
            {showAiAssistant && renderAIStrategyAssistant()}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(QUICK_STRATEGIES).map(([key, strategyInfo]) => {
                    const isAiRecommended = aiRecommendation?.recommendedStrategy === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setStrategy(key as keyof typeof QUICK_STRATEGIES)}
                            className={`p-4 rounded-lg border-2 text-center transition-all relative ${
                                strategy === key
                                    ? isAiRecommended
                                        ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30'
                                        : 'border-primary bg-primary/10 shadow-lg'
                                    : isAiRecommended
                                        ? 'border-primary/50 bg-primary/5 hover:border-primary/70 hover:bg-primary/10'
                                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                            }`}
                        >
                            {isAiRecommended && (
                                <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                                    AI Pick
                                </div>
                            )}
                            <div className="text-3xl mb-2">{strategyInfo.icon}</div>
                            <h3 className="font-semibold text-lg mb-1">{strategyInfo.name}</h3>
                            <p className="text-sm text-muted-foreground">{strategyInfo.description}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderActions = () => {
        if (!result) return null;

        if (result.isBalanced) {
            return (
                <div className="text-center py-12">
                    <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Portfolio is Balanced!</h3>
                    <p className="text-muted-foreground">No rebalancing needed with the {QUICK_STRATEGIES[strategy].name} strategy.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Rebalancing Actions</h3>
                    <p className="text-muted-foreground">
                        {result.actions.length} action{result.actions.length !== 1 ? 's' : ''} needed
                    </p>
                </div>

                <div className="space-y-3">
                    {result.actions.map((action, index) => (
                        <div 
                            key={index}
                            className={`p-4 rounded-lg border-2 ${
                                action.action === 'SELL' 
                                    ? 'border-destructive/20 bg-destructive/5' 
                                    : 'border-success/20 bg-success/5'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        action.action === 'SELL' 
                                            ? 'bg-destructive/20' 
                                            : 'bg-success/20'
                                    }`}>
                                        {action.action === 'SELL' ? (
                                            <ArrowDownIcon className="w-5 h-5 text-destructive" />
                                        ) : (
                                            <TrendingUpIcon className="w-5 h-5 text-success" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">{action.symbol}</h4>
                                        <p className="text-sm text-muted-foreground">{action.token}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-xl ${
                                        action.action === 'SELL' ? 'text-destructive' : 'text-success'
                                    }`}>
                                        {action.action} {isBalanceHidden ? '*****' : formatCurrency(action.amount)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Change: {action.change}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-destructive">
                            {result.actions.filter(a => a.action === 'SELL').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Sells</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-success">
                            {result.actions.filter(a => a.action === 'BUY').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Buys</p>
                    </div>
                </div>
            </div>
        );
    };

    if (tokens.length < 2) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h1 className="text-2xl font-bold">Quick Rebalancer</h1>
                        <p className="text-muted-foreground">Streamlined portfolio optimization</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-accent"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <AlertTriangleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Need More Tokens</h3>
                        <p className="text-muted-foreground">Add at least 2 tokens to rebalance your portfolio.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold">Quick Rebalancer</h1>
                    <p className="text-muted-foreground">Streamlined portfolio optimization</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Strategy Selection */}
                {renderStrategySelector()}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-muted-foreground">Calculating...</span>
                    </div>
                )}

                {/* Actions */}
                {!isLoading && renderActions()}

                {/* Strategy Info */}
                {result && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-primary">
                                Strategy: {QUICK_STRATEGIES[strategy].name}
                            </h4>
                            {aiRecommendation && aiRecommendation.recommendedStrategy === strategy && (
                                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                                    AI Recommended
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-primary/80">
                            {QUICK_STRATEGIES[strategy].description}
                        </p>
                        {aiRecommendation && aiRecommendation.recommendedStrategy === strategy && (
                            <p className="text-sm text-primary/80 mt-2 italic">
                                "{aiRecommendation.reasoning}"
                            </p>
                        )}
                        {result.totalValue > 0 && (
                            <p className="text-sm text-primary/80 mt-2">
                                <strong>Total Portfolio Value:</strong> {isBalanceHidden ? '*****' : formatCurrency(result.totalValue)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
