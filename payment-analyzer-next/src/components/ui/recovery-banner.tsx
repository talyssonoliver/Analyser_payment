'use client';

import { useState, useEffect } from 'react';
import { RecoveryBanner as RecoveryBannerType } from '@/lib/services/session-recovery-service';

interface RecoveryBannerProps {
  recovery: RecoveryBannerType;
  onRestore: () => void;
  onDismiss: () => void;
}

export function RecoveryBanner({ recovery, onRestore, onDismiss }: RecoveryBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsAnimating(true), 100);
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300);
  };

  const handleRestore = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onRestore();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`recovery-banner-overlay fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`recovery-banner mx-4 mt-4 rounded-lg shadow-lg border ${
        recovery.hasRuleChanges 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-blue-50 border-blue-200'
      } overflow-hidden`}>
        {/* Banner Header */}
        <div className={`px-4 py-2 text-xs font-medium text-white ${
          recovery.hasRuleChanges 
            ? 'bg-orange-600' 
            : 'bg-blue-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {recovery.hasRuleChanges ? '⚠️' : '🔄'}
              </span>
              <span>Session Recovery Available</span>
            </div>
            <span className="text-xs opacity-90">
              {recovery.minutesAgo}m ago
            </span>
          </div>
        </div>

        {/* Banner Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                recovery.hasRuleChanges 
                  ? 'bg-orange-100 text-orange-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {recovery.hasRuleChanges ? '⚠️' : '💾'}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                recovery.hasRuleChanges ? 'text-orange-800' : 'text-blue-800'
              }`}>
                {recovery.message}
              </p>
              
              {recovery.hasRuleChanges && (
                <p className="text-xs text-orange-600 mt-1">
                  Please review your calculations as payment rules may have changed.
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleRestore}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    recovery.hasRuleChanges
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    Restore Session
                  </span>
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Start Fresh
                </button>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// CSS for smooth animations
export const RecoveryBannerStyles = `
  .recovery-banner-overlay {
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.05);
  }
  
  .recovery-banner {
    max-width: 600px;
    margin: 0 auto;
    animation: slideInFromTop 0.4s ease-out;
  }
  
  @keyframes slideInFromTop {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @media (max-width: 640px) {
    .recovery-banner {
      margin: 8px;
    }
    
    .recovery-banner .flex {
      flex-direction: column;
      gap: 12px;
    }
    
    .recovery-banner button {
      width: 100%;
      justify-content: center;
    }
  }
`;

// Hook for managing recovery banner state
export function useRecoveryBanner() {
  const [recovery, setRecovery] = useState<RecoveryBannerType | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showRecovery = (recoveryData: RecoveryBannerType) => {
    setRecovery(recoveryData);
    setIsVisible(true);
  };

  const hideRecovery = () => {
    setIsVisible(false);
    setRecovery(null);
  };

  return {
    recovery,
    isVisible,
    showRecovery,
    hideRecovery
  };
}