
import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from './Icons';

interface ToastProps extends ToastMessage {
    onClose: () => void;
}

const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-success" />,
    error: <XCircleIcon className="w-6 h-6 text-destructive" />,
    warning: <AlertTriangleIcon className="w-6 h-6 text-warning" />,
    info: <InfoIcon className="w-6 h-6 text-primary" />,
};

export const Toast: React.FC<ToastProps> = ({ title, description, variant, onClose }) => {
    return (
        <div className="w-full bg-card text-card-foreground shadow-lg rounded-lg pointer-events-auto ring-1 ring-border overflow-hidden animate-slide-up">
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {icons[variant]}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button onClick={onClose} className="rounded-md inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
