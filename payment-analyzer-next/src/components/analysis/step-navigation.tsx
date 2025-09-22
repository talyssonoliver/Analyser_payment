'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  canProgressToStep: (step: number) => boolean;
}

const stepLabels = ['Upload Files', 'Validate', 'Analyze'];

export function StepNavigation({
  currentStep,
  totalSteps,
  onStepClick,
  canProgressToStep
}: StepNavigationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStepClick = (stepNumber: number) => {
    if (canProgressToStep(stepNumber) && !isAnimating) {
      setIsAnimating(true);
      onStepClick?.(stepNumber);
      // Reset animation state after transition
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  return (
    <div className="analysis-steps flex items-center justify-center py-8 px-4 relative">
      {/* Background pattern for enhanced visual effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="w-full h-full bg-gradient-to-r from-blue-50 via-transparent to-green-50" />
      </div>

      <div className="relative flex items-center">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const canProgress = canProgressToStep(stepNumber);
          const isNext = stepNumber === currentStep + 1;

          return (
            <div key={stepNumber} className="flex items-center">
              <div
                className={cn(
                  "step flex flex-col items-center gap-3 transition-all duration-500 cursor-pointer group relative",
                  {
                    "opacity-50 scale-95": !isActive && !isCompleted && !isNext,
                    "opacity-100 scale-100": isActive || isCompleted || isNext,
                    "cursor-not-allowed": !canProgress,
                    "hover:scale-105": canProgress && !isAnimating,
                    "animate-pulse": isNext && !isCompleted,
                  }
                )}
                onClick={() => handleStepClick(stepNumber)}
              >
                {/* Glow effect for active step */}
                {isActive && (
                  <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
                )}

                <div
                  className={cn(
                    "step-circle w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 relative overflow-hidden backdrop-blur-sm",
                    {
                      // Default state
                      "bg-slate-200 text-slate-500 border-2 border-slate-300": !isActive && !isCompleted && !isNext,
                      // Next state (subtle glow)
                      "bg-slate-100 text-slate-600 border-2 border-blue-300 shadow-lg shadow-blue-500/20": isNext && !isCompleted,
                      // Active state with enhanced gradient and glow
                      "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 border-2 border-white": isActive,
                      // Completed state with success styling
                      "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 border-2 border-white": isCompleted,
                      // Hover states with transform and glow effects
                      "hover:bg-slate-300 hover:scale-110 hover:shadow-md group-hover:border-blue-400": !isActive && !isCompleted && canProgress,
                      "hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 hover:scale-110 hover:shadow-2xl": isActive,
                      "hover:from-green-600 hover:to-emerald-700 hover:scale-110 hover:shadow-xl": isCompleted,
                    }
                  )}
                >
                  {/* Shimmer effect for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
                  )}

                  {/* Content with better spacing */}
                  <div className="relative z-10 flex items-center justify-center w-full h-full">
                    {isCompleted ? (
                      <svg
                        className="w-5 h-5 animate-bounce-in"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isActive ? (
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-black">{stepNumber}</span>
                        <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                      </div>
                    ) : (
                      <span className="text-base font-bold">{stepNumber}</span>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    "step-label text-sm font-medium text-center transition-all duration-500 relative",
                    {
                      "text-slate-600": !isActive && !isCompleted && !isNext,
                      "text-slate-700 font-semibold": isNext && !isCompleted,
                      "text-blue-600 font-bold transform scale-105": isActive,
                      "text-green-600 font-bold": isCompleted,
                    }
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{stepLabels[index]}</span>
                    {/* Status indicator */}
                    {isActive && (
                      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
                    )}
                    {isCompleted && (
                      <div className="w-8 h-0.5 bg-green-500 rounded-full" />
                    )}
                    {isNext && !isCompleted && (
                      <div className="w-6 h-0.5 bg-slate-300 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Connector line with gradient animation */}
              {index < totalSteps - 1 && (
                <div className="step-connector-container mx-4 relative">
                  <div
                    className={cn(
                      "step-connector w-16 h-1 rounded-full transition-all duration-700 relative overflow-hidden",
                      {
                        "bg-gradient-to-r from-slate-200 to-slate-300": stepNumber >= currentStep,
                        "bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/30": stepNumber < currentStep,
                      }
                    )}
                  >
                    {/* Animated progress fill */}
                    {stepNumber < currentStep && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                    )}

                    {/* Next step indicator */}
                    {stepNumber === currentStep && (
                      <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-transparent rounded-full animate-pulse"
                           style={{ width: '30%' }} />
                    )}
                  </div>

                  {/* Floating progress dots */}
                  {stepNumber < currentStep && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}