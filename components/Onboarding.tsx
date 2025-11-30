import React, { useState } from 'react';
import { SKIN_TYPES, DEFAULT_GOALS } from '../constants';
import { SkinType } from '../types';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  onComplete: (type: SkinType, goals: string[]) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [skinType, setSkinType] = useState<SkinType>('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleNext = () => {
    if (step === 1 && skinType) setStep(2);
    else if (step === 2 && selectedGoals.length > 0) onComplete(skinType, selectedGoals);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                <Sparkles size={24} />
            </div>
        </div>
        
        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">What's your skin type?</h1>
            <p className="text-slate-500 text-center mb-8">This helps us tailor your routine.</p>
            <div className="space-y-3">
              {SKIN_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSkinType(type as SkinType)}
                  className={`w-full p-4 rounded-xl text-left transition-all border ${
                    skinType === type 
                    ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                  }`}
                >
                  <span className="font-medium">{type}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">What are your goals?</h1>
            <p className="text-slate-500 text-center mb-8">Select all that apply.</p>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_GOALS.map(goal => (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all border ${
                    selectedGoals.includes(goal)
                    ? 'bg-teal-50 border-teal-500 text-teal-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleNext}
            disabled={(step === 1 && !skinType) || (step === 2 && selectedGoals.length === 0)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {step === 1 ? 'Next' : 'Get Started'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
