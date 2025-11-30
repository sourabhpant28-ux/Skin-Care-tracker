import React from 'react';
import { RoutineStep, RoutineTime } from '../types';
import { CheckCircle2, Circle, Sun, Moon } from 'lucide-react';

interface Props {
  steps: RoutineStep[];
  completedSteps: string[];
  onToggleStep: (id: string) => void;
  currentMode: 'morning' | 'night'; // For filtering the view mostly, or visually separating
}

export const DailyChecklist: React.FC<Props> = ({ steps, completedSteps, onToggleStep, currentMode }) => {
  const isMorning = currentMode === 'morning';
  
  // Filter relevant steps for the current time
  // 'both' steps appear in both morning and night
  const relevantSteps = steps.filter(step => 
    step.time === currentMode || step.time === 'both'
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-teal-900/5 border border-slate-100 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1.5 ${isMorning ? 'bg-orange-300' : 'bg-indigo-400'}`} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isMorning ? 'bg-orange-100 text-orange-500' : 'bg-indigo-100 text-indigo-500'}`}>
                {isMorning ? <Sun size={24} /> : <Moon size={24} />}
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{isMorning ? 'Good Morning' : 'Good Evening'}</h2>
                <p className="text-sm text-slate-500">Let's get that glow.</p>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {relevantSteps.map(step => {
          const isDone = completedSteps.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => onToggleStep(step.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                isDone 
                  ? 'bg-teal-50 border-teal-100' 
                  : 'bg-slate-50 border-transparent hover:bg-slate-100'
              } border`}
            >
              <div className="flex items-center gap-3">
                <div className={`transition-colors ${isDone ? 'text-teal-500' : 'text-slate-300'}`}>
                    {isDone ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                </div>
                <span className={`font-medium ${isDone ? 'text-teal-900 line-through opacity-70' : 'text-slate-700'}`}>
                  {step.productName}
                </span>
              </div>
              
              {isDone && (
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Done</span>
              )}
            </button>
          );
        })}
        {relevantSteps.length === 0 && (
            <div className="text-center py-8 text-slate-400">
                No steps scheduled for {currentMode}.
            </div>
        )}
      </div>
    </div>
  );
};
