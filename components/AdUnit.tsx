
import React from 'react';
import { Icons, TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface AdUnitProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  language: Language;
}

export const AdUnit: React.FC<AdUnitProps> = ({ slot, format = 'auto', language }) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  return (
    <div className="w-full my-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex items-center gap-2 mb-2 px-4">
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t.sponsored}</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-h-[150px] relative overflow-hidden group">
        {/* Placeholder pour script AdSense réel */}
        {/* <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-XXXXX" data-ad-slot={slot} data-ad-format={format} data-full-width-responsive="true"></ins> */}
        
        <div className="text-center space-y-3 opacity-20 group-hover:opacity-40 transition-opacity">
           <Icons.Magic className="mx-auto scale-150" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Google AdSense Space</p>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
};
