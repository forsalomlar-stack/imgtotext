import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { GoogleGenAI } from "@google/genai";

interface TextDisplayProps {
  text: string;
  onReset: () => void;
}

export const TextDisplay: React.FC<TextDisplayProps> = ({ text, onReset }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState(text);  useEffect(() => {
    // Post-process text to convert raw exponents to Unicode superscripts for better readability
    // if they are not already in math blocks.
    let processed = text;
    processed = processed.replace(/\^2(?![^$]*\$)/g, '²');
    processed = processed.replace(/\^3(?![^$]*\$)/g, '³');
    setDisplayText(processed);
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    alert("Matn nusxalandi!");
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob(['\uFEFF' + displayText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = "extracted_text.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadWord = async () => {
    if (!contentRef.current) return;

    // Create a clone of the content to manipulate it without affecting the UI
    const clone = contentRef.current.cloneNode(true) as HTMLElement;
    const svgs = clone.querySelectorAll('svg');
    
    // Convert each SVG to a PNG image
    for (const svg of Array.from(svgs)) {
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Get dimensions
        const bbox = svg.getBoundingClientRect();
        const width = svg.getAttribute('width') ? parseInt(svg.getAttribute('width')!) : (bbox.width || 400);
        const height = svg.getAttribute('height') ? parseInt(svg.getAttribute('height')!) : (bbox.height || 400);
        
        canvas.width = width * 2; // Higher resolution
        canvas.height = height * 2;
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(2, 2);
              ctx.drawImage(img, 0, 0, width, height);
              const pngUrl = canvas.toDataURL('image/png');
              
              const newImg = document.createElement('img');
              newImg.src = pngUrl;
              newImg.width = width;
              newImg.height = height;
              newImg.style.display = 'block';
              newImg.style.margin = '10px auto';
              
              svg.parentNode?.replaceChild(newImg, svg);
            }
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.onerror = reject;
          img.src = url;
        });
      } catch (err) {
        console.error('Error converting SVG to PNG:', err);
      }
    }

    // Get the rendered HTML content from the modified clone
    const contentHtml = clone.innerHTML;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
            xmlns:v='urn:schemas-microsoft-com:vml'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>OCR Natija</title>
        <!--[if gte mso 9]><xml>
          <o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml><![endif]-->
        <style>
          v\\:* {behavior:url(#default#VML);}
          o\\:* {behavior:url(#default#VML);}
          w\\:* {behavior:url(#default#VML);}
          .shape {behavior:url(#default#VML);}

          @page WordSection1 {
            size: 8.27in 11.69in;
            margin: 0.5in 0.5in 0.7in 0.5in;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; }
          .katex-html { display: none; }
          .katex-mathml { display: block !important; }
          table.content-table { border-collapse: collapse; width: 100%; }
          table.content-table td, table.content-table th { border: 1px solid #ddd; padding: 8px; }
          img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        </style>
      </head>
      <body>

          <!-- ===== ASOSIY KONTENT ===== -->
          ${contentHtml.replace(/<table/g, '<table class="content-table"')}
        </div>

      </body>
      </html>
    `;
    
    const blob = new Blob(['\uFEFF' + header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = 'ocr_natija.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative">
      <div className="bg-slate-50/50 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 text-base sm:text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Natija
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            title="Nusxa olish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button 
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Yopish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-5 sm:p-8 overflow-y-auto markdown-body text-sm sm:text-base font-sans leading-relaxed text-slate-700" ref={contentRef}>
        <ReactMarkdown 
          remarkPlugins={[remarkMath, remarkGfm]} 
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const value = String(children).replace(/\n$/, '');

              if (!inline && language === 'svg') {
                return (
                  <div 
                    className="my-6 flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: value }} 
                  />
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {displayText}
        </ReactMarkdown>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 sm:p-5 flex gap-3 flex-wrap sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={handleDownloadWord}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 px-5 rounded-2xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
          Word (.doc)
        </button>
        <button 
          onClick={handleDownloadTxt}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-600 py-3 px-5 rounded-2xl text-sm font-semibold transition-all hover:-translate-y-0.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Text (.txt)
        </button>
      </div>
    </div>
  );
};