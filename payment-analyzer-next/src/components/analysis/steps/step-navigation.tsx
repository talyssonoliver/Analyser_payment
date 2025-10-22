"use client";

import { cn } from "@/lib/utils";
import "@/styles/step-navigation.css";

interface StepNavigationProps {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly onStepClick?: (step: number) => void;
  readonly canProgressToStep: (step: number) => boolean;
}

const stepLabels = ["Upload Files", "Validate", "Analyze"];

export function StepNavigation({
  currentStep,
  totalSteps,
  onStepClick,
  canProgressToStep,
}: StepNavigationProps) {
  const handleStepClick = (stepNumber: number) => {
    if (canProgressToStep(stepNumber)) {
      onStepClick?.(stepNumber);
    }
  };

  return (
    <ol className="analysis-steps" aria-label="Analysis steps">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const canProgress = canProgressToStep(stepNumber);

        const elements = [] as React.ReactNode[];

        // Add the step element - using native button for accessibility
        elements.push(
          <li
            key={`step-${stepLabels[index]}`}
            aria-setsize={totalSteps}
            aria-posinset={stepNumber}
          >
            <button
              type="button"
              className={cn("step", {
                active: isActive,
                completed: isCompleted,
              })}
              data-step={stepNumber}
              disabled={!canProgress}
              aria-label={`Step ${stepNumber}: ${stepLabels[index]}`}
              aria-current={isActive ? "step" : undefined}
              onClick={() => handleStepClick(stepNumber)}
            >
              <div className="step-circle">{stepNumber}</div>
              <div className="step-label">{stepLabels[index]}</div>
            </button>
          </li>
        );

        // Add connector line after step (except for last step)
        if (index < totalSteps - 1) {
          elements.push(
            <li
              key={`connector-after-${stepLabels[index]}`}
              className="step-connector"
              aria-hidden="true"
            ></li>
          );
        }

        return elements;
      }).flat()}
    </ol>
  );
}
