import React from 'react';
import { AnalyticsData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lock, TrendingUp, Calendar, Trophy } from 'lucide-react';

interface Props {
  data: AnalyticsData;
  completionHistory: { day: string; value: number }[];
  isPro: boolean;
  onUnlock: () => void;
}

export const Analytics: React.FC<Props> = ({ data, completionHistory, isPro, onUnlock }) => {
  if (!isPro) {
    return (
       <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm relative overflow-hidden h-64 flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-full shadow-lg mb-4">
                <Lock size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Detailed Analytics</h3>
            <p className="text-slate-500 mb-6">Unlock streaks, completion charts, and skin trends.</p>
            <button onClick={onUnlock} className="px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
                Unlock Pro Access
            </button>
        </div>
        <div className="w-full opacity-20 blur-sm">
             {/* Mock Chart Background */}
            <div className="h-32 flex items-end justify-between px-8 gap-2">
                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                    <div key={i} className="w-full bg-slate-400 rounded-t" style={{ height: `${h}%`}}></div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-full mb-2">
                    <Trophy size={20} />
                </div>
                <span className="text-2xl font-bold text-slate-800">{data.streak}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Day Streak</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-full mb-2">
                    <TrendingUp size={20} />
                </div>
                <span className="text-2xl font-bold text-slate-800">{data.last7DaysCompletion}%</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Last 7 Days</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full mb-2">
                    <Calendar size={20} />
                </div>
                <span className="text-2xl font-bold text-slate-800">{data.monthlyCompletion}%</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Monthly</span>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Routine Consistency</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionHistory}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {completionHistory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.value >= 80 ? '#14b8a6' : '#cbd5e1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};
