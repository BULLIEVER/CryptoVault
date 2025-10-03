import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RotateCcw } from 'lucide-react';

interface CustomExitStage {
    id: string;
    percentage: number;
    priceTarget: number;
}

interface CustomExitStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (stages: { percentage: number; multiplier: number }[]) => void;
    existingStages?: { percentage: number; multiplier: number }[];
    tokenName?: string;
}

export const CustomExitStrategyModal: React.FC<CustomExitStrategyModalProps> = ({
    isOpen,
    onClose,
    onSave,
    existingStages = [],
    tokenName = 'Token'
}) => {
    const [stages, setStages] = useState<CustomExitStage[]>([]);
    const [totalPercentage, setTotalPercentage] = useState(0);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingStages.length > 0) {
                const initialStages = existingStages.map((stage, index) => ({
                    id: `stage-${index}`,
                    percentage: stage.percentage,
                    priceTarget: stage.multiplier
                }));
                setStages(initialStages);
            } else {
                setStages([
                    { id: 'stage-1', percentage: 25, priceTarget: 2.5 },
                    { id: 'stage-2', percentage: 25, priceTarget: 5.0 },
                    { id: 'stage-3', percentage: 25, priceTarget: 7.5 },
                    { id: 'stage-4', percentage: 25, priceTarget: 10.0 }
                ]);
            }
        }
    }, [isOpen, existingStages]);

    useEffect(() => {
        const total = stages.reduce((sum, stage) => sum + stage.percentage, 0);
        setTotalPercentage(total);
        setIsValid(total === 100 && stages.length > 0 && stages.every(stage => 
            stage.percentage > 0 && stage.priceTarget > 0
        ));
    }, [stages]);

    const addStage = () => {
        const newStage: CustomExitStage = {
            id: `stage-${Date.now()}`,
            percentage: 0,
            priceTarget: 5.0
        };
        setStages([...stages, newStage]);
    };

    const removeStage = (id: string) => {
        if (stages.length > 1) {
            setStages(stages.filter(stage => stage.id !== id));
        }
    };

    const updateStage = (id: string, field: 'percentage' | 'priceTarget', value: number) => {
        setStages(stages.map(stage => 
            stage.id === id ? { ...stage, [field]: value } : stage
        ));
    };

    const resetToDefault = () => {
        setStages([
            { id: 'stage-1', percentage: 25, priceTarget: 2.5 },
            { id: 'stage-2', percentage: 25, priceTarget: 5.0 },
            { id: 'stage-3', percentage: 25, priceTarget: 7.5 },
            { id: 'stage-4', percentage: 25, priceTarget: 10.0 }
        ]);
    };

    const handleSave = () => {
        if (isValid) {
            const stagesToSave = stages.map(stage => ({
                percentage: stage.percentage,
                multiplier: stage.priceTarget
            }));
            onSave(stagesToSave);
            onClose();
        }
    };

    const getPercentageColor = () => {
        if (totalPercentage === 100) return 'text-green-500';
        if (totalPercentage > 100) return 'text-red-500';
        return 'text-yellow-500';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold">Custom Exit Strategy</h2>
                        <p className="text-sm text-muted-foreground">
                            Create a custom exit strategy for {tokenName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {/* Instructions */}
                        <div className="bg-muted/50 border border-border rounded-lg p-4">
                            <h3 className="font-semibold mb-2">How it works:</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Set the percentage of tokens to sell at each price level</li>
                                <li>• Set the price target in dollars (e.g., $2.50, $5.00, $10.00)</li>
                                <li>• Total percentage must equal 100%</li>
                                <li>• Stages are executed in order as price targets are reached</li>
                            </ul>
                        </div>

                        {/* Total Percentage Display */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                            <span className="font-medium">Total Percentage:</span>
                            <span className={`font-bold text-lg ${getPercentageColor()}`}>
                                {totalPercentage}%
                            </span>
                        </div>

                        {/* Stages */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Exit Stages</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={resetToDefault}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 border border-border rounded-md transition-colors"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset
                                    </button>
                                    <button
                                        onClick={addStage}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Stage
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {stages.map((stage, index) => (
                                    <div key={stage.id} className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                                    Sell Percentage
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={stage.percentage}
                                                        onChange={(e) => updateStage(stage.id, 'percentage', parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                                    />
                                                    <span className="absolute right-3 top-2 text-muted-foreground text-sm">%</span>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                                    Price Target
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0.000001"
                                                        step="0.000001"
                                                        value={stage.priceTarget}
                                                        onChange={(e) => updateStage(stage.id, 'priceTarget', parseFloat(e.target.value) || 0.000001)}
                                                        className="w-full p-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                                    />
                                                    <span className="absolute right-3 top-2 text-muted-foreground text-sm">$</span>
                                                </div>
                                            </div>
                                        </div>

                                        {stages.length > 1 && (
                                            <button
                                                onClick={() => removeStage(stage.id)}
                                                className="flex-shrink-0 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        {stages.length > 0 && (
                            <div className="bg-muted/30 border border-border rounded-lg p-4">
                                <h3 className="font-semibold mb-3">Strategy Preview</h3>
                                <div className="space-y-2">
                                    {stages
                                        .sort((a, b) => a.priceTarget - b.priceTarget)
                                        .map((stage, index) => (
                                        <div key={stage.id} className="flex justify-between items-center text-sm">
                                            <span>Stage {index + 1}: ${stage.priceTarget}</span>
                                            <span className="font-medium">{stage.percentage}% of tokens</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                    >
                        <Save className="h-4 w-4" />
                        Save Strategy
                    </button>
                </div>
            </div>
        </div>
    );
};
