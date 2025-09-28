'use client';

import { cn } from '@/lib/utils';
import '@/styles/step-navigation.css';

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
  const handleStepClick = (stepNumber: number) => {
    if (canProgressToStep(stepNumber)) {
      onStepClick?.(stepNumber);
    }
  };

  return (
    <div className="analysis-steps" id="analysisSteps">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        canProgressToStep(stepNumber);

        const elements = [];

        // Add the step element
        elements.push(
          <div
            key={`step-${stepNumber}`}
            className={cn(
              "step",
              {
                "active": isActive,
                "completed": isCompleted,
              }
            )}
            data-step={stepNumber}
            onClick={() => handleStepClick(stepNumber)}
          >
            <div className="step-circle">
              {stepNumber}
            </div>
            <div className="step-label">
              {stepLabels[index]}
            </div>
          </div>
        );

        // Add connector line after step (except for last step)
        if (index < totalSteps - 1) {
          elements.push(
            <div key={`connector-${stepNumber}`} className="step-connector"></div>
          );
        }

        return elements;
      }).flat()}
    </div>
  );
}