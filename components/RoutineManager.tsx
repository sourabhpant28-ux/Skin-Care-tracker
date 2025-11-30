import React, { useState } from 'react';
import { RoutineStep, RoutineTime } from '../types';
import { Trash2, Plus, Sparkles } from 'lucide-react';

interface Props {
  steps: RoutineStep[];
  onAddStep: (step: Omit<RoutineStep, 'id' | 'completedToday'>) => void;
  onRemoveStep: (id: string) => void;
  onGenerateAI: () => void;
  isPro: boolean;
  loadingAI: boolean;
}

export const RoutineManager: React.FC<Props> = ({ steps, onAddStep, onRemoveStep, onGenerateAI, isPro, loadingAI }) => {
  const [newProduct, setNewProduct] = useState('');
  const [newTime, setNewTime] = useState<RoutineTime>('morning');

  const handleAdd = () => {
    if (!newProduct.trim()) return;
    onAddStep({ productName: newProduct, time: newTime });
    setNewProduct('');
  };

  const sections: { title: string; filter: RoutineTime | 'both' }[] = [
    { title: 'Morning', filter: 'morning' },
    { title: 'Night', filter: 'night' },
    { title: 'Anytime', filter: 'both' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">My Routine</h2>
        <button 
          onClick={onGenerateAI}
          disabled={loadingAI}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${loadingAI ? 'bg-slate-100 text-slate-400' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
        >
          <Sparkles size={16} />
          {loadingAI ? 'Thinking...' : 'AI Suggest'}
        </button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
           const sectionSteps = steps.filter(s => s.time === section.filter);
           if (sectionSteps.length === 0 && section.filter === 'both') return null;

           return (
             <div key={section.title}>
               <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">{section.title}</h3>
               <ul className="space-y-2">
                 {sectionSteps.map(step => (
                   <li key={step.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                     <span className="font-medium text-slate-700">{step.productName}</span>
                     <button 
                       onClick={() => onRemoveStep(step.id)}
                       className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <Trash2 size={16} />
                     </button>
                   </li>
                 ))}
                 {sectionSteps.length === 0 && (
                   <li className="text-sm text-slate-400 italic py-2">No steps yet.</li>
                 )}
               </ul>
             </div>
           );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Step</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
            placeholder="e.g., Hyaluronic Acid"
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={newTime}
            onChange={(e) => setNewTime(e.target.value as RoutineTime)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="morning">Morning</option>
            <option value="night">Night</option>
            <option value="both">Both</option>
          </select>
        </div>
        <button
          onClick={handleAdd}
          className="w-full flex justify-center items-center gap-2 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
        >
          <Plus size={18} /> Add Step
        </button>
      </div>
    </div>
  );
};
