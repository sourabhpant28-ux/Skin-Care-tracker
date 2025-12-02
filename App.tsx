
import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { RoutineManager } from './components/RoutineManager';
import { DailyChecklist } from './components/DailyChecklist';
import { PhotoJournal } from './components/PhotoJournal';
import { Analytics } from './components/Analytics';
import { LiveAssistant } from './components/LiveAssistant';
import { RoutineStep, UserProfile, PhotoEntry, SkinType } from './types';
import { MOCK_INITIAL_STEPS } from './constants';
import { generateRoutineSuggestion } from './services/geminiService';
import { CheckSquare, List, PieChart, Mic, Image, User, Sparkles } from 'lucide-react';

// Helper to get consistent date string (YYYY-MM-DD)
const getTodayKey = () => new Date().toLocaleDateString('en-CA');

export default function App() {
  // --- State ---
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
        const saved = localStorage.getItem('skin_profile');
        return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  const [routineSteps, setRoutineSteps] = useState<RoutineStep[]>(() => {
    try {
        const saved = localStorage.getItem('skin_routine');
        return saved ? JSON.parse(saved) : MOCK_INITIAL_STEPS;
    } catch(e) { return MOCK_INITIAL_STEPS; }
  });

  // History: Map of "YYYY-MM-DD" -> ["stepId1", "stepId2"]
  const [history, setHistory] = useState<Record<string, string[]>>(() => {
    try {
        const saved = localStorage.getItem('skin_history');
        return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });

  // Completed Steps for Today
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    const today = getTodayKey();
    // If we have a record for today in history, use it.
    if (history && history[today]) {
        return history[today];
    }
    // Otherwise it's a new day (or first load), start empty.
    return [];
  });

  const [photos, setPhotos] = useState<PhotoEntry[]>(() => {
     try {
        const saved = localStorage.getItem('skin_photos');
        return saved ? JSON.parse(saved) : [];
     } catch(e) { return []; }
  });
  
  const [activeTab, setActiveTab] = useState<'today' | 'routine' | 'photos' | 'analytics'>('today');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'night'>('morning');

  // --- Effects ---
  useEffect(() => {
    try {
        if (profile) localStorage.setItem('skin_profile', JSON.stringify(profile));
    } catch (e) { console.error("Failed to save profile", e); }
  }, [profile]);

  useEffect(() => {
    try {
        localStorage.setItem('skin_routine', JSON.stringify(routineSteps));
    } catch (e) { console.error("Failed to save routine", e); }
  }, [routineSteps]);

  // Sync completedSteps to History and LocalStorage whenever it changes
  useEffect(() => {
    const today = getTodayKey();
    setHistory(prev => {
        // Only update if actually different to avoid unnecessary writes/renders
        if (JSON.stringify(prev[today]) === JSON.stringify(completedSteps)) return prev;

        const newHistory = { ...prev, [today]: completedSteps };
        try {
            localStorage.setItem('skin_history', JSON.stringify(newHistory));
        } catch (e) { console.error("Failed to save history", e); }
        return newHistory;
    });
  }, [completedSteps]);
  
  useEffect(() => {
    try {
        localStorage.setItem('skin_photos', JSON.stringify(photos));
    } catch (e) { 
        console.error("Failed to save photos (likely storage limit)", e); 
    }
  }, [photos]);

  // Determine time of day roughly on mount
  useEffect(() => {
    const hour = new Date().getHours();
    setTimeOfDay(hour < 17 ? 'morning' : 'night');
  }, []);

  // --- Calculations for Analytics ---
  const getAnalyticsData = () => {
    const today = getTodayKey();
    const totalSteps = Math.max(routineSteps.length, 1); // Avoid division by zero
    
    // 1. Calculate Streak
    // Logic: Consecutive days ending today or yesterday where > 0 steps were completed.
    let streak = 0;
    
    // Check if today has activity
    if ((history[today]?.length || 0) > 0) {
        streak++;
    }

    // Check backwards from yesterday
    let d = new Date();
    d.setDate(d.getDate() - 1);
    while (true) {
        const k = d.toLocaleDateString('en-CA');
        if ((history[k]?.length || 0) > 0) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }

    // 2. Last 7 Days History
    const chartData = [];
    let sum7 = 0;
    for (let i = 6; i >= 0; i--) {
         const d = new Date();
         d.setDate(d.getDate() - i);
         const k = d.toLocaleDateString('en-CA');
         const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
         
         const count = history[k]?.length || 0;
         const pct = Math.min(100, Math.round((count / totalSteps) * 100));
         
         chartData.push({ day: dayLabel, value: pct });
         sum7 += pct;
    }
    const avg7 = Math.round(sum7 / 7);

    // 3. Monthly Completion
    let sum30 = 0;
    for (let i = 29; i >= 0; i--) {
         const d = new Date();
         d.setDate(d.getDate() - i);
         const k = d.toLocaleDateString('en-CA');
         
         const count = history[k]?.length || 0;
         const pct = Math.min(100, Math.round((count / totalSteps) * 100));
         sum30 += pct;
    }
    const avg30 = Math.round(sum30 / 30);

    return {
        streak,
        last7DaysCompletion: avg7,
        monthlyCompletion: avg30,
        completionHistory: chartData
    };
  };

  const analyticsData = getAnalyticsData();

  // --- Handlers ---

  const handleOnboardingComplete = (skinType: SkinType, skinGoals: string[]) => {
    const newProfile: UserProfile = {
      skinType,
      skinGoals,
      isPro: false, // Default Free
      streak: 0
    };
    setProfile(newProfile);
    // Optionally trigger initial AI routine generation
    generateAIRoutine(skinType, skinGoals);
  };

  const generateAIRoutine = async (type: string, goals: string[]) => {
    setLoadingAI(true);
    const result = await generateRoutineSuggestion(type, goals);
    if (result && result.steps) {
        const newSteps: RoutineStep[] = result.steps.map((s: any, idx: number) => ({
            id: `ai-${Date.now()}-${idx}`,
            productName: s.productName,
            time: s.time,
            completedToday: false
        }));
        setRoutineSteps(newSteps);
    }
    setLoadingAI(false);
  };

  const toggleStepCompletion = (id: string) => {
    setCompletedSteps(prev => 
      prev.includes(id) ? prev.filter(stepId => stepId !== id) : [...prev, id]
    );
  };

  const addStep = (step: Omit<RoutineStep, 'id' | 'completedToday'>) => {
    const newStep: RoutineStep = {
      ...step,
      id: Date.now().toString(),
      completedToday: false
    };
    setRoutineSteps([...routineSteps, newStep]);
  };

  const removeStep = (id: string) => {
    setRoutineSteps(routineSteps.filter(s => s.id !== id));
  };

  const addPhoto = (photo: PhotoEntry) => {
    setPhotos([photo, ...photos]);
  };

  const unlockPro = () => {
    if (profile) setProfile({ ...profile, isPro: true });
  };

  // --- Render ---

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto border-x border-slate-100 shadow-2xl shadow-slate-200/50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="bg-teal-500 rounded-lg p-1.5">
                <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-slate-800 tracking-tight">SkinTracker<span className="text-teal-500">Pro</span></h1>
        </div>
        <div className="flex gap-2">
             {!profile.isPro && (
                 <button onClick={unlockPro} className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md hover:bg-teal-100">
                     UPGRADE
                 </button>
             )}
             <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                 <User size={16} />
             </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        
        {/* Helper Floating Action for Voice */}
        <div className="fixed bottom-24 right-4 z-30 lg:right-[calc(50%-240px)]">
             <button 
                onClick={() => setIsLiveOpen(true)}
                className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-900/30 flex items-center justify-center hover:scale-105 transition-transform"
             >
                 <Mic size={24} />
             </button>
        </div>

        {activeTab === 'today' && (
            <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-200 rounded-lg mb-4">
                    <button 
                        onClick={() => setTimeOfDay('morning')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${timeOfDay === 'morning' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Morning
                    </button>
                    <button 
                         onClick={() => setTimeOfDay('night')}
                         className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${timeOfDay === 'night' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Night
                    </button>
                </div>

                <DailyChecklist 
                    steps={routineSteps}
                    completedSteps={completedSteps}
                    onToggleStep={toggleStepCompletion}
                    currentMode={timeOfDay}
                />
            </div>
        )}

        {activeTab === 'routine' && (
            <RoutineManager 
                steps={routineSteps}
                onAddStep={addStep}
                onRemoveStep={removeStep}
                onGenerateAI={() => generateAIRoutine(profile.skinType, profile.skinGoals)}
                isPro={profile.isPro}
                loadingAI={loadingAI}
            />
        )}

        {activeTab === 'photos' && (
            <PhotoJournal 
                photos={photos}
                isPro={profile.isPro}
                onAddPhoto={addPhoto}
                onUnlock={unlockPro}
            />
        )}

        {activeTab === 'analytics' && (
            <Analytics 
                data={{
                    last7DaysCompletion: analyticsData.last7DaysCompletion,
                    monthlyCompletion: analyticsData.monthlyCompletion,
                    streak: analyticsData.streak
                }}
                completionHistory={analyticsData.completionHistory}
                isPro={profile.isPro}
                onUnlock={unlockPro}
            />
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-slate-200 p-2 flex justify-around items-center z-40">
        <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'today' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <CheckSquare size={24} className={activeTab === 'today' ? 'fill-current' : ''} />
            <span className="text-[10px] font-medium mt-1">Today</span>
        </button>
        <button 
            onClick={() => setActiveTab('routine')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'routine' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <List size={24} />
            <span className="text-[10px] font-medium mt-1">Routine</span>
        </button>
        <button 
            onClick={() => setActiveTab('photos')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'photos' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <Image size={24} />
            <span className="text-[10px] font-medium mt-1">Photos</span>
        </button>
        <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'analytics' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <PieChart size={24} />
            <span className="text-[10px] font-medium mt-1">Progress</span>
        </button>
      </nav>

      {/* Voice Assistant Modal */}
      <LiveAssistant 
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
        userProfile={profile}
      />
    </div>
  );
}
