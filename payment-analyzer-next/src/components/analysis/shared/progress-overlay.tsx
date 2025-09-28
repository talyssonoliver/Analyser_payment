'use client';

import { useState, useEffect } from 'react';
import { ProgressTrackingService, ProgressState, ProgressStage } from '@/lib/services/progress-tracking-service';

interface ProgressOverlayProps {
  isVisible: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ProgressOverlay({ 
  isVisible, 
  onComplete, 
  onError, 
  className = '' 
}: ProgressOverlayProps) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!isVisible) return;

    const progressService = ProgressTrackingService.getInstance();

    // Subscribe to progress updates
    const unsubscribe = progressService.subscribe((progressState) => {
      setProgress(progressState);

      // Handle completion
      if (!progressState.isActive && progressState.overallProgress === 100) {
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      }

      // Handle errors
      const errorStage = progressState.stages.find(stage => stage.error);
      if (errorStage) {
        onError?.(errorStage.error!);
      }
    });

    // Update time remaining periodically
    const timeInterval = setInterval(() => {
      if (progress?.isActive) {
        const remaining = progressService.getEstimatedTimeRemaining();
        if (remaining > 0) {
          const seconds = Math.ceil(remaining / 1000);
          if (seconds > 60) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            setTimeRemaining(`${minutes}m ${remainingSeconds}s`);
          } else {
            setTimeRemaining(`${seconds}s`);
          }
        } else {
          setTimeRemaining('');
        }
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timeInterval);
    };
  }, [isVisible, onComplete, onError, progress]); // Added progress as dependency

  if (!isVisible || !progress) {
    return null;
  }

  const formatElapsedTime = (startTime: number): string => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`progress-overlay fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="progress-modal bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="progress-header bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Processing Analysis</h2>
              <p className="text-blue-100 mt-1">
                {progress.currentStage >= 0 && progress.currentStage < progress.stages.length
                  ? progress.stages[progress.currentStage].name
                  : 'Initializing...'
                }
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold">{progress.overallProgress}%</div>
              {timeRemaining && (
                <div className="text-sm text-blue-200">{timeRemaining} remaining</div>
              )}
              {progress.startTime > 0 && (
                <div className="text-xs text-blue-300">
                  Elapsed: {formatElapsedTime(progress.startTime)}
                </div>
              )}
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4">
            <div className="bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-500 ease-out rounded-full shadow-sm"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress Stages */}
        <div className="progress-body p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {progress.stages.slice(0, -1).map((stage, index) => (
              <ProgressStageItem
                key={stage.id}
                stage={stage}
                isLast={index === progress.stages.length - 2}
              />
            ))}
          </div>

          {/* Completion Stage */}
          {progress.overallProgress === 100 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <div className="font-semibold text-green-800">Analysis Complete!</div>
                  <div className="text-sm text-green-600">
                    Processing completed successfully in {formatElapsedTime(progress.startTime)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {progress.stages.some(stage => stage.error) && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="text-3xl">❌</div>
                <div>
                  <div className="font-semibold text-red-800">Analysis Failed</div>
                  <div className="text-sm text-red-600">
                    {progress.stages.find(stage => stage.error)?.error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="progress-footer bg-slate-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Stage {Math.max(0, progress.currentStage + 1)} of {progress.totalStages + 1}
            </span>
            
            {progress.isActive && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
                <span>Processing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual stage component
interface ProgressStageItemProps {
  stage: ProgressStage;
  isLast: boolean;
}

function ProgressStageItem({ stage, isLast }: ProgressStageItemProps) {
  const getStageState = () => {
    if (stage.error) {
      return {
        bgColor: 'bg-red-50 border-red-200',
        iconColor: 'text-red-600 bg-red-100',
        textColor: 'text-red-800',
        icon: '❌'
      };
    }
    
    if (stage.isComplete) {
      return {
        bgColor: 'bg-green-50 border-green-200',
        iconColor: 'text-green-600 bg-green-100',
        textColor: 'text-green-800',
        icon: '✅'
      };
    }
    
    if (stage.isActive) {
      return {
        bgColor: 'bg-blue-50 border-blue-200',
        iconColor: 'text-blue-600 bg-blue-100',
        textColor: 'text-blue-800',
        icon: stage.icon
      };
    }
    
    return {
      bgColor: 'bg-slate-50 border-slate-200',
      iconColor: 'text-slate-400 bg-slate-100',
      textColor: 'text-slate-600',
      icon: stage.icon
    };
  };

  const stageState = getStageState();

  return (
    <div className="stage-item">
      <div className={`flex items-start gap-4 p-4 border rounded-xl transition-all duration-300 ${stageState.bgColor}`}>
        {/* Stage Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold ${stageState.iconColor} transition-all duration-300`}>
          <span className="text-lg">{stageState.icon}</span>
        </div>

        {/* Stage Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${stageState.textColor}`}>
              {stage.name}
            </h3>
            <span className="text-xs text-slate-500">#{stage.id}</span>
          </div>
          
          <p className="text-sm text-slate-600 mb-2">
            {stage.description}
          </p>
          
          {/* Stage Details */}
          {stage.details && (
            <div className="text-xs text-slate-500 bg-white bg-opacity-50 rounded-lg px-3 py-2 mb-2">
              📝 {stage.details}
            </div>
          )}
          
          {/* Stage Timing */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {stage.startTime && (
              <span>
                Started: {new Date(stage.startTime).toLocaleTimeString()}
              </span>
            )}
            
            {stage.endTime && stage.startTime && (
              <span>
                Duration: {Math.round((stage.endTime - stage.startTime) / 100) / 10}s
              </span>
            )}
            
            {stage.isActive && stage.startTime && (
              <span className="text-blue-600 font-medium">
                Running: {Math.round((Date.now() - stage.startTime) / 100) / 10}s
              </span>
            )}
          </div>
          
          {/* Error Message */}
          {stage.error && (
            <div className="mt-2 text-sm text-red-600 bg-red-100 rounded-lg px-3 py-2">
              <strong>Error:</strong> {stage.error}
            </div>
          )}
        </div>

        {/* Active Stage Indicator */}
        {stage.isActive && (
          <div className="flex-shrink-0">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
          </div>
        )}
      </div>

      {/* Connection Line */}
      {!isLast && (
        <div className="flex justify-center">
          <div className={`w-0.5 h-4 transition-colors duration-300 ${
            stage.isComplete ? 'bg-green-300' : 'bg-slate-300'
          }`} />
        </div>
      )}
    </div>
  );
}

// Hook for using progress overlay
export function useProgressOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [progressService] = useState(() => ProgressTrackingService.getInstance());

  const startProgress = () => {
    setIsVisible(true);
    progressService.start();
  };

  const stopProgress = () => {
    progressService.abort('Stopped by user');
    setIsVisible(false);
  };

  const completeProgress = () => {
    progressService.complete();
  };

  const hideProgress = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    startProgress,
    stopProgress,
    completeProgress,
    hideProgress,
    progressService
  };
}