
import React, { useState, useRef, useEffect } from 'react';
import { PhotoEntry } from '../types';
import { Camera, Lock, Image as ImageIcon, Sparkles, X, ZoomIn, Loader2, RotateCcw, Upload } from 'lucide-react';
import { analyzeSkinPhoto } from '../services/geminiService';

interface Props {
  photos: PhotoEntry[];
  isPro: boolean;
  onAddPhoto: (photo: PhotoEntry) => void;
  onUnlock: () => void;
}

export const PhotoJournal: React.FC<Props> = ({ photos, isPro, onAddPhoto, onUnlock }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<PhotoEntry | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Camera Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      // We do not set videoRef.current.srcObject here because videoRef is null 
      // (the video element is not rendered yet).
      setIsCameraOpen(true);
      setPreview('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  // Effect to attach stream once the video element is mounted and rendered
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    // Match the video dimensions
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Flip horizontally if using user-facing camera to act like a mirror
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        
        // Convert to standard JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(dataUrl);
        stopCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // --- Image Processing & Analysis ---

  // Helper to resize uploaded images
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (!result) { reject(new Error("Failed")); return; }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1024;
                let w = img.width;
                let h = img.height;
                if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else resolve(result);
            };
            img.onerror = () => resolve(result);
            img.src = result;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0]);
        setPreview(resized);
      } catch (err) {
        alert("Error loading image");
      }
      e.target.value = ''; // reset
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setIsAnalyzing(true);
    try {
        const base64 = preview.split(',')[1];
        const result = await analyzeSkinPhoto(base64, 'image/jpeg', notes);
        setAnalysisResult(result);
    } catch (e) {
        setAnalysisResult("Analysis failed. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  }

  const handleSave = () => {
    if (!preview) return;
    // We prioritize the analysis result in the notes if available
    const content = analysisResult || notes || "No analysis or notes.";
    
    const newPhoto: PhotoEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        imageUrl: preview,
        notes: content 
    };
    onAddPhoto(newPhoto);
    setPreview('');
    setNotes('');
    setAnalysisResult('');
  };

  // --- Render ---

  if (!isPro) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-full shadow-lg mb-4">
                <Lock size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Pro Feature</h3>
            <button onClick={onUnlock} className="px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
                Unlock Pro Access
            </button>
        </div>
        <div className="opacity-30 blur-sm pointer-events-none h-48 bg-slate-200"></div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      
      {/* Capture Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* State: Camera Open */}
        {isCameraOpen && (
            <div className="relative bg-black aspect-[3/4] flex items-center justify-center">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                />
                <div className="absolute bottom-6 flex items-center gap-6">
                    <button onClick={stopCamera} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30">
                        <X size={24} />
                    </button>
                    <button 
                        onClick={capturePhoto} 
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/10 transition-colors"
                    >
                        <div className="w-12 h-12 bg-white rounded-full"></div>
                    </button>
                </div>
            </div>
        )}

        {/* State: Preview & Analysis */}
        {!isCameraOpen && preview && (
            <div className="p-4 space-y-4">
                <div className="relative h-48 bg-slate-100 rounded-xl overflow-hidden group">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    <button 
                        onClick={() => setPreview('')}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {!analysisResult && (
                    <div className="flex flex-col gap-2">
                         <p className="text-sm text-slate-500 text-center mb-2">Photo captured. Ready to analyze.</p>
                         <button 
                            onClick={handleAnalyze} 
                            disabled={isAnalyzing}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                            {isAnalyzing ? 'Analyzing Skin...' : 'Analyze Skin'}
                        </button>
                    </div>
                )}

                {analysisResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 text-sm leading-relaxed">
                            <h4 className="font-semibold mb-1 flex items-center gap-2 text-purple-700">
                                <Sparkles size={14} /> AI Analysis Result
                            </h4>
                            {analysisResult}
                        </div>
                        <button 
                            onClick={handleSave}
                            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-200"
                        >
                            Save to Journal
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* State: Idle (Start) */}
        {!isCameraOpen && !preview && (
             <div className="p-6 flex flex-col items-center justify-center gap-4">
                 <button 
                    onClick={startCamera}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                 >
                     <Camera size={20} />
                     Take Photo
                 </button>
                 
                 <div className="relative w-full text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <span className="relative bg-white px-2 text-xs text-slate-400">OR</span>
                 </div>

                 <label className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 cursor-pointer px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                     <Upload size={16} />
                     Upload from gallery
                     <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                 </label>
             </div>
        )}
      </div>

      {/* Journal History (Analysis Logs) */}
      <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 px-1">Skin Journal</h3>
          
          {photos.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                  No analysis entries yet.
              </div>
          )}

          {photos.map((entry) => (
              <div key={entry.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                  </div>
                  
                  {/* The Main Content is TEXT now */}
                  <div className="text-slate-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                      {entry.notes || "No analysis recorded."}
                  </div>

                  {/* Photo is secondary/hidden */}
                  <div className="flex justify-end border-t border-slate-50 pt-2">
                      <button 
                        onClick={() => setViewingPhoto(entry)}
                        className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:underline"
                      >
                          <ImageIcon size={12} /> View Original Photo
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>

    {/* Detail Modal for Original Photo */}
    {viewingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative">
                <button 
                    onClick={() => setViewingPhoto(null)}
                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                >
                    <X size={20} />
                </button>
                <img src={viewingPhoto.imageUrl} alt="Original" className="w-full h-auto max-h-[80vh] object-contain bg-slate-100" />
                <div className="p-3 bg-white border-t border-slate-100 text-center">
                     <span className="text-xs text-slate-500">Original Capture - {new Date(viewingPhoto.date).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
