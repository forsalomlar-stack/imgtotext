import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onImagesSelect(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onImagesSelect(files);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div
        className={`relative rounded-3xl p-6 sm:p-10 transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[280px] cursor-pointer group
          ${isDragging
            ? 'border-2 border-slate-900 bg-white/80 scale-[1.02] shadow-xl'
            : 'border-2 border-dashed border-slate-300 bg-white/40 backdrop-blur-sm hover:border-slate-800 hover:bg-white/60 hover:shadow-md'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/*"
          multiple
          className="hidden"
        />

        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>

        <h3 className="text-lg sm:text-xl font-heading font-bold text-slate-900 mb-2">Rasmlarni yuklash</h3>
        <p className="text-sm sm:text-base text-slate-500 font-sans text-center max-w-sm px-2 mb-4 leading-relaxed">
          Suratlarni shu yerga tashlang yoki <b>Ctrl+V</b> orqali qo'ying.
        </p>
        <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-2 sm:mt-4 bg-slate-200/50 px-4 py-1.5 rounded-full uppercase tracking-wider">
          JPG, PNG, WEBP
        </p>
      </div>
    </div>
  );
};
