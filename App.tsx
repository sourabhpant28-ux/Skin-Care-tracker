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
import { Layout, CheckSquare, List, PieChart, Mic, Image, User, Sparkles } from 'lucide-react';

export default function App() {
  // --- State ---
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('skin_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [routineSteps, setRoutineSteps] = useState<RoutineStep[]>(() => {
    const saved = localStorage.getItem('skin_routine');
    return saved ? JSON.parse(saved) : MOCK_INITIAL_STEPS;
  });

  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    const saved = localStorage.getItem('skin_completed_today');
    // Simple logic: reset if date changed (in real app, check date string)
    return saved ? JSON.parse(saved) : [];
  });

  const [photos, setPhotos] = useState<PhotoEntry[]>(() => {
     // In a real app we wouldn't store base64 in localstorage due to limits, but for demo:
     const saved = localStorage.getItem('skin_photos');
     return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState<'today' | 'routine' | 'photos' | 'analytics'>('today');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'night'>('morning');

  // --- Effects ---
  useEffect(() => {
    if (profile) localStorage.setItem('skin_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('skin_routine', JSON.stringify(routineSteps));
  }, [routineSteps]);

  useEffect(() => {
    localStorage.setItem('skin_completed_today', JSON.stringify(completedSteps));
  }, [completedSteps]);
  
  useEffect(() => {
    localStorage.setItem('skin_photos', JSON.stringify(photos));
  }, [photos]);

  // Determine time of day roughly on mount
  useEffect(() => {
    const hour = new Date().getHours();
    setTimeOfDay(hour < 17 ? 'morning' : 'night');
  }, []);

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
                    last7DaysCompletion: 85,
                    monthlyCompletion: 72,
                    streak: profile.isPro ? 12 : 3 // Mock data
                }}
                completionHistory={[
                    { day: 'M', value: 80 }, { day: 'T', value: 100 }, { day: 'W', value: 40 },
                    { day: 'T', value: 90 }, { day: 'F', value: 100 }, { day: 'S', value: 60 }, { day: 'S', value: 85 }
                ]}
                isPro={profile.isPro}
                onUnlock={unlockPro}
            />
        )}

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-slate-100 p-2 z-40 flex justify-around items-center pb-safe">
        <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'today' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <CheckSquare size={24} />
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

      {/* Live Assistant Modal */}
      <LiveAssistant 
        isOpen={isLiveOpen} 
        onClose={() => setIsLiveOpen(false)} 
        userProfile={profile}
      />
      
    </div>
  );
}
