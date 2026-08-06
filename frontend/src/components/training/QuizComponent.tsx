"use client";

import React, { useState } from 'react';
import { Quiz } from './trainingData';
import { Icons } from '../shared/Icons';

interface QuizComponentProps {
  quiz: Quiz;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuizComponent({ quiz, onSuccess, onCancel }: QuizComponentProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    if (selectedOptionIndex === null) return;
    
    const correct = selectedOptionIndex === quiz.correctAnswerIndex;
    setIsCorrect(correct);
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-5 h-full justify-between">
      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Title */}
        <div className="flex items-center gap-2 text-orange-500">
          <Icons.BookOpen size={16} />
          <h4 className="text-xs uppercase font-bold tracking-wider">
            Quiz de validation
          </h4>
        </div>

        {/* Question */}
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 leading-relaxed bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
          {quiz.question}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2.5">
          {quiz.options.map((option, index) => {
            let optionStyle = "border-zinc-200 dark:border-zinc-800 hover:border-zinc-355 bg-transparent";
            
            if (submitted) {
              if (index === quiz.correctAnswerIndex) {
                optionStyle = "border-green-500 bg-green-500/5 text-green-700 dark:text-green-400";
              } else if (index === selectedOptionIndex) {
                optionStyle = "border-red-500 bg-red-500/5 text-red-700 dark:text-red-400";
              } else {
                optionStyle = "border-zinc-200 dark:border-zinc-900 opacity-60 text-zinc-400";
              }
            } else if (selectedOptionIndex === index) {
              optionStyle = "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500 text-orange-600 dark:text-orange-400";
            }

            return (
              <button
                key={index}
                disabled={submitted}
                onClick={() => setSelectedOptionIndex(index)}
                className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                  !submitted ? 'active:scale-[0.99] cursor-pointer' : 'cursor-default'
                } ${optionStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5 ${
                    selectedOptionIndex === index 
                      ? 'border-orange-500 text-orange-500' 
                      : 'border-zinc-350 dark:border-zinc-700 text-zinc-400'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation feedback */}
        {submitted && (
          <div className={`p-4 rounded-xl border animate-fade-in flex flex-col gap-1.5 ${
            isCorrect 
              ? 'border-green-200/50 bg-green-500/5 text-green-700 dark:text-green-400' 
              : 'border-red-200/50 bg-red-500/5 text-red-700 dark:text-red-400'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              {isCorrect ? (
                <>
                  <Icons.CheckCircle size={12} /> Explication (Bonne Réponse !)
                </>
              ) : (
                <>
                  <Icons.AlertCircle size={12} /> Oups, Mauvaise réponse
                </>
              )}
            </span>
            <p className="text-[11px] leading-relaxed font-medium">
              {quiz.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2.5 shrink-0 border-t border-zinc-100 dark:border-zinc-900 pt-3">
        {!submitted ? (
          <>
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer bg-transparent"
            >
              Annuler
            </button>
            <button
              disabled={selectedOptionIndex === null}
              onClick={handleSubmit}
              className="flex-2 py-2 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
            >
              Valider ma réponse
            </button>
          </>
        ) : (
          <button
            onClick={onSuccess}
            className="w-full py-2.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-green-500/10"
          >
            <Icons.CheckCircle size={14} className="text-white" />
            {isCorrect ? 'Terminer et valider le module' : 'Recommencer ou Terminer'}
          </button>
        )}
      </div>
    </div>
  );
}
