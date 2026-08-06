"use client";

import React, { useState } from 'react';
import StepInstruction from './StepInstruction';
import StepMediaViewer from './StepMediaViewer';
import StepActions from './StepActions';
import { Step } from './trainingData';

interface StepPlayerProps {
  steps: Step[];
  onComplete: () => void;
  onBlockEscalated: (stepName: string) => void;
  onAskCopilot?: (stepTitle: string) => void;
}

export default function StepPlayer({ steps, onComplete, onBlockEscalated, onAskCopilot }: StepPlayerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const step = steps[currentStepIndex];
  const hasPrev = currentStepIndex > 0;
  const hasNext = currentStepIndex < steps.length - 1;

  const handleNext = () => {
    setBlockedCount(0); // Reset blocked clicks on progress
    if (hasNext) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(); // Triggers the final Quiz
    }
  };

  const handlePrev = () => {
    setBlockedCount(0);
    if (hasPrev) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleBlocked = () => {
    const newCount = blockedCount + 1;
    setBlockedCount(newCount);
    
    if (newCount >= 2) {
      // Escalates and opens MSP Ticket creation
      onBlockEscalated(step.title);
      setBlockedCount(0); // Reset count
    } else {
      // Small feedback on first click
      alert("Une erreur ? Si vous êtes totalement bloqué, ré-appuyez sur le bouton pour ouvrir un ticket de support instantané auprès de votre MSP.");
    }
  };

  const handleDoItForMe = (config: string) => {
    setExecutingAction(config);
    
    // Simulate API or background execution
    setTimeout(() => {
      setExecutingAction(null);
      alert(`[Simulation Onbora Co-pilot] L'action "${step.actionLabel}" a été exécutée avec succès en tâche de fond !`);
      handleNext();
    }, 1800);
  };

  return (
    <div className="flex flex-col gap-6 h-full justify-between">
      <div className="flex flex-col gap-5 overflow-y-auto pr-1">
        {/* Instruction details */}
        <StepInstruction
          currentStep={currentStepIndex + 1}
          totalSteps={steps.length}
          title={step.title}
          instruction={step.instruction}
        />

        {/* CSS/SVG Mock Interface Viewer */}
        <StepMediaViewer
          mediaType={step.mediaType}
          currentStep={currentStepIndex + 1}
        />
      </div>

      {/* Navigation action buttons */}
      <StepActions
        onNext={handleNext}
        onPrev={handlePrev}
        onBlocked={handleBlocked}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isLast={!hasNext}
        actionLabel={step.actionLabel}
        actionType={step.actionType}
        actionConfig={step.actionConfig}
        onDoItForMe={handleDoItForMe}
        isExecutingDoItForMe={executingAction !== null}
        onAskCopilot={onAskCopilot ? () => onAskCopilot(step.title) : undefined}
      />
    </div>
  );
}
