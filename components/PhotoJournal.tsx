import React, { useState } from 'react';
import { PhotoEntry } from '../types';
import { Camera, Lock, Image as ImageIcon, Sparkles } from 'lucide-react';
import { analyzeSkinPhoto } from '../services/geminiService';

interface Props {
  photos: PhotoEntry[];
  isPro: boolean;
  onAddPhoto: (photo: PhotoEntry) => void;
  onUnlock: () => void;
}

export const PhotoJournal: React.FC<Props> = ({ photos, isPro, onAddPhoto, onUnlock }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!preview || !notes) return;
    
    // Simulate AI analysis upon save if requested
    const newPhoto: PhotoEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        imageUrl: preview,
        notes: notes
    };

    onAddPhoto(newPhoto);
    
    // Reset form
    setSelectedFile(null);
    setPreview('');
    setNotes('');
    setAnalysisResult('');
  };
  
  const handleAnalyze = async () => {
    if (!preview) return;
    setIsAnalyzing(true);
    // Strip base64 prefix
    const base64 = preview.split(',')[1];
    const result = await analyzeSkinPhoto(base64, notes);
    setAnalysisResult(result);
    setIsAnalyzing(false);
    // Auto-append analysis to notes
    setNotes(prev => prev + (prev ? '\n\n' : '') + `[AI Analysis]: ${result}`);
  }

  if (!isPro) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-full shadow-lg mb-4">
                <Lock size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Pro Feature</h3>
            <p className="text-slate-500 mb-6 max-w-xs mx-auto">Track your skin's progress with photos and AI analysis.</p>
            <button onClick={onUnlock} className="px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
                Unlock Pro Access
            </button>
        </div>
        {/* Blurred Content Placeholder */}
        <div className="opacity-30 blur-sm pointer-events-none">
            <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square bg-slate-200 rounded-lg"></div>
                <div className="aspect-square bg-slate-200 rounded-lg"></div>
                <div className="aspect-square bg-slate-200 rounded-lg"></div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Camera className="text-teal-500" size={24} />
        Progress Photos
      </h2>

      {/* Upload Section */}
      <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
        {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 mb-3 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> a selfie</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
        ) : (
            <div className="space-y-4">
                <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How is your skin feeling today?"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows={3}
                />
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="flex-1 flex justify-center items-center gap-2 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                    >
                       <Sparkles size={16} />
                       {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                    >
                        Save Entry
                    </button>
                    <button 
                        onClick={() => { setPreview(''); setSelectedFile(null); setNotes(''); setAnalysisResult(''); }}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </button>
                </div>
                {analysisResult && (
                    <div className="p-3 bg-purple-50 text-purple-900 text-sm rounded-lg border border-purple-100">
                        {analysisResult}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer">
                <img src={photo.imageUrl} alt={photo.date} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-white text-xs font-medium">{new Date(photo.date).toLocaleDateString()}</span>
                    <p className="text-white/80 text-[10px] line-clamp-2">{photo.notes}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
