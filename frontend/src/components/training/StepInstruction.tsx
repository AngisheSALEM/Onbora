"use client";

import React from 'react';

interface StepInstructionProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  instruction: string;
}

export default function StepInstruction({
  currentStep,
  totalSteps,
  title,
  instruction
}: StepInstructionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded-full">
          Étape {currentStep} sur {totalSteps}
        </span>
        <span className="text-[10px] text-zinc-400 font-semibold">
          {Math.round((currentStep / totalSteps) * 100)}% complété
        </span>
      </div>
      
      <div className="flex flex-col gap-1.5">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
          {title}
        </h4>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
          {instruction}
        </p>
      </div>
    </div>
  );
}
