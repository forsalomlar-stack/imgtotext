import React, { useState, useEffect } from 'react';
import { extractTextFromImage } from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { TextDisplay } from './components/TextDisplay';
import { ImageFile, ExtractedData } from './types';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const sendResultToBackend = async (text: string, imagePreview: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, imagePreview })
    });
  } catch (err) {
    console.warn('Backendga yuborishda xatolik:', err);
  }
};

const App: React.FC = () => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Global paste handler — Ctrl+V har qanday holatda ishlaydi
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) handleImageSelect(files[0]);
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []); // Empty dependency array as we don't need 'images' anymore

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => setShowInstallModal(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (!isStandalone) setShowInstallModal(true);
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        alert("Ilova allaqachon o'rnatilgan.");
      } else {
        alert("Ilovani o'rnatish uchun brauzer menyusidan 'Asosiy ekranga qo'shish' bandini tanlang.");
      }
      setShowInstallModal(false);
    }
  };

  const processImage = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1536;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
          else { if (h > MAX) { w = w * MAX / h; h = MAX; } }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas context error")); return; }
          ctx.drawImage(img, 0, 0, w, h);

          let mimeType = file.type;
          if (mimeType !== 'image/png' && mimeType !== 'image/webp') mimeType = 'image/jpeg';

          const dataUrl = canvas.toDataURL(mimeType, 0.8);
          resolve({ data: dataUrl, mimeType, preview: dataUrl });
        };
        img.onerror = () => reject(new Error("Rasmni yuklashda xatolik"));
      };
      reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
    });
  };

  const handleImageSelect = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      const processed = await processImage(file);
      setImage(processed);
      setExtractedData(null);
    } catch (err: any) {
      setError(err?.message || "Rasmni qayta ishlashda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setExtractedData(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const text = await extractTextFromImage(image.data, image.mimeType);
      
      setExtractedData({ text, timestamp: Date.now() });

      // Send result to backend
      sendResultToBackend(text, image.preview);
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("Processing error:", err);

      if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("API limiti tugadi. Iltimos, birozdan so'ng qayta urinib ko'ring.");
      } else {
        setError(msg || "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] overflow-y-auto selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="glass-panel px-4 sm:px-8 py-4 flex items-center justify-between z-10 sticky top-0 border-b border-zinc-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/></svg>
          </div>
          <h1 className="text-xl font-heading font-bold text-zinc-900 tracking-tight">OCR Pro</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        {!image ? (
          <div className="h-full flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] py-4">
            <div className="text-center mb-10 max-w-lg px-2">
              <h2 className="text-4xl sm:text-5xl font-heading font-bold text-zinc-900 mb-4 tracking-tight">Rasmdan Matnga</h2>
              <p className="text-base sm:text-lg text-zinc-500 font-sans leading-relaxed">
                Matn va murakkab formulalarni soniyalar ichida yuqori aniqlikda ajratib oling.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <ImageUploader onImageSelect={handleImageSelect} />
              {isLoading && <p className="text-center text-sm text-zinc-500 mt-4">Rasm yuklanmoqda...</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-start">
            {/* Left Side: Image Preview */}
            <div className="w-full lg:w-1/2 flex flex-col gap-3 sm:gap-4">

              {/* Active image */}
              <div className="bg-white p-2 rounded-3xl border border-zinc-200/60 shadow-sm relative group transition-all">
                <img
                  src={image.preview}
                  alt="Selected"
                  className="w-full h-auto max-h-[50vh] sm:max-h-[55vh] object-contain rounded-2xl bg-zinc-50"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-4 right-4 sm:top-5 sm:right-5 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:scale-105 transition-all"
                  title="Rasmni o'chirish"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {!extractedData && !isLoading && (
                <button
                  onClick={handleConvert}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-heading font-medium text-lg py-4 px-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                  Tahlil Qilish
                </button>
              )}

              {isLoading && (
                <div className="w-full bg-white p-4 sm:p-6 rounded-xl border border-zinc-200 shadow-sm text-center">
                  <div className="inline-block w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2 sm:mb-3"></div>
                  <p className="text-sm sm:text-base text-zinc-600 font-medium animate-pulse">
                    Tahlil qilinmoqda...
                    <br/>
                    <span className="text-[10px] sm:text-xs text-zinc-400 font-normal">Murakkab matnlar uchun biroz vaqt ketishi mumkin</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50 border border-red-100 text-red-600 p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleReset}
                className="text-zinc-400 hover:text-zinc-900 font-medium text-sm text-center py-2 transition-colors inline-flex justify-center items-center gap-1 mt-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Ortga qaytish
              </button>
            </div>

            {/* Right Side: Result */}
            {extractedData && (
              <div className="w-full lg:w-1/2 min-h-[400px] lg:h-[600px]">
                <TextDisplay
                  text={extractedData.text}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] max-w-sm w-full p-8 sm:p-10 text-center relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-zinc-50 border border-zinc-100/60 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" className="text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </div>
            
            <h2 className="text-2xl font-heading font-bold text-zinc-900 mb-3 tracking-tight relative z-10">Ilovani o'rnatish</h2>
            <p className="text-zinc-500 font-sans leading-relaxed mb-8 relative z-10">
              OCR Pro ilovasidan tezroq va qulayroq foydalanish uchun uni asosiy ekraningizga qo'shib oling.
            </p>
            
            <div className="flex flex-col gap-3 relative z-10">
              <button
                onClick={() => { handleInstallClick(); setShowInstallModal(false); }}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-heading font-medium text-lg hover:bg-zinc-800 transition-all hover:-translate-y-0.5 shadow-lg shadow-zinc-900/10 active:scale-[0.98]"
              >
                Hozir o'rnatish
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3 text-zinc-400 font-medium hover:text-zinc-900 transition-colors rounded-2xl"
              >
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;