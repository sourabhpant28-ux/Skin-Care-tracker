import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Activity, Volume2 } from 'lucide-react';
import { LiveSession, decodeAudioData } from '../services/liveService';
import { UserProfile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export const LiveAssistant: React.FC<Props> = ({ isOpen, onClose, userProfile }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [transcripts, setTranscripts] = useState<{text: string, isUser: boolean}[]>([]);
  
  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Handle cleanup when closing or unmounting
  const cleanup = async () => {
      // Disconnect session
      if (liveSessionRef.current) {
          await liveSessionRef.current.disconnect();
          liveSessionRef.current = null;
      }

      // Stop all playing audio
      sourcesRef.current.forEach(source => {
          try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
      
      // Close output audio context
      if (audioContextRef.current) {
          if (audioContextRef.current.state !== 'closed') {
              try { await audioContextRef.current.close(); } catch (e) {}
          }
          audioContextRef.current = null;
      }
      
      setIsActive(false);
      setStatus('idle');
  };

  useEffect(() => {
    if (!isOpen) {
        cleanup();
    }
    return () => {
        cleanup();
    };
  }, [isOpen]);

  const handleConnect = async () => {
    // Ensure fresh start
    await cleanup();
    
    liveSessionRef.current = new LiveSession(process.env.API_KEY || '');
    setStatus('connecting');
    
    // Setup Audio Output Context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    nextStartTimeRef.current = audioContextRef.current.currentTime;

    const systemInstruction = `You are Skin Routine Tracker Pro's voice assistant. 
    User Profile: Skin Type: ${userProfile.skinType}, Goals: ${userProfile.skinGoals.join(', ')}.
    Keep responses short, helpful, and conversational. 
    If asked about the app, explain you can help track routines.`;

    await liveSessionRef.current.connect({
        onOpen: () => {
            setIsActive(true);
            setStatus('listening');
        },
        onClose: () => {
            cleanup();
        },
        onAudioData: async (base64) => {
            setStatus('speaking');
            if (!audioContextRef.current) return;
            
            const ctx = audioContextRef.current;
            const audioBuffer = await decodeAudioData(base64, ctx);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            // Scheduling
            // Ensure next start time is at least current time
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            
            sourcesRef.current.add(source);
            
            source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setStatus('listening');
                }
            };
        },
        onError: (err) => {
            console.error("Live Error:", err);
            cleanup();
        },
        onTranscription: (text, isUser) => {
            // Only add if it has content
            if (!text.trim()) return;
            
            setTranscripts(prev => {
                // Simple logic to append or update last message if it's the same speaker
                // For this demo, just append to keep it simple, but limit history
                const last = prev[prev.length - 1];
                if (last && last.isUser === isUser) {
                     return [...prev.slice(0, -1), { text: last.text + text, isUser }];
                }
                return [...prev.slice(-4), { text, isUser }];
            });
        }
    }, systemInstruction);
  };

  const toggleSession = () => {
    if (isActive) {
        cleanup();
    } else {
        handleConnect();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px] relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10">
            <X size={20} className="text-slate-600" />
        </button>

        <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center p-8 text-center overflow-hidden">
            {/* Ambient Background Animation */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative z-10 mb-8">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                    status === 'speaking' ? 'bg-teal-400 shadow-[0_0_50px_rgba(45,212,191,0.5)] scale-110' :
                    status === 'listening' ? 'bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse' :
                    'bg-slate-700'
                }`}>
                    {status === 'speaking' ? (
                        <Volume2 size={48} className="text-white animate-bounce" />
                    ) : (
                        <Activity size={48} className="text-white" />
                    )}
                </div>
            </div>

            <h3 className="text-white text-xl font-semibold mb-2 relative z-10">
                {status === 'idle' ? 'Ready to Chat' : 
                 status === 'connecting' ? 'Connecting...' :
                 status === 'listening' ? 'Listening...' : 'Speaking...'}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs relative z-10">
                {status === 'idle' ? 'Tap the mic to start a real-time conversation about your skin.' : 'Talk naturally. I can hear you.'}
            </p>
        </div>

        <div className="h-48 bg-slate-50 border-t border-slate-100 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcripts.length === 0 && isActive && (
                    <p className="text-center text-slate-400 text-sm italic mt-4">Transcripts will appear here...</p>
                )}
                {transcripts.map((t, i) => (
                    <div key={i} className={`flex ${t.isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                            t.isUser ? 'bg-indigo-100 text-indigo-900' : 'bg-white border border-slate-200 text-slate-700'
                        }`}>
                            {t.text}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
                <button 
                    onClick={toggleSession}
                    disabled={status === 'connecting'}
                    className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center gap-2 w-full max-w-[200px] font-semibold ${
                        isActive 
                        ? 'bg-rose-500 text-white hover:bg-rose-600' 
                        : 'bg-teal-500 text-white hover:bg-teal-600'
                    } ${status === 'connecting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isActive ? <><MicOff size={20} /> End Chat</> : <><Mic size={20} /> Start Chat</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};