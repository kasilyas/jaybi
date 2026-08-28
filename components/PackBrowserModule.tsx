import React, { useState, useMemo } from 'react';
import { Pack, Product, Language } from '../types';
import { PackCard } from './PackCard';
import { TRANSLATIONS } from '../constants';

interface PackBrowserModuleProps {
  packs: Pack[];
  products: Product[];
  language: Language;
  onPackClick: (pack: Pack) => void;
}

const PACKS_PER_PAGE = 3;

export const PackBrowserModule: React.FC<PackBrowserModuleProps> = ({
  packs, products, language, onPackClick
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const totalPages = Math.ceil(packs.length / PACKS_PER_PAGE);
  const paginatedPacks = useMemo(() => {
    const start = (currentPage - 1) * PACKS_PER_PAGE;
    return packs.slice(start, start + PACKS_PER_PAGE);
  }, [packs, currentPage]);

  if (packs.length === 0) return null;

  return (
    <section className="space-y-8 animate-in fade-in duration-700">
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-2xl font-black text-slate-900">{t.events}</h2>
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex gap-2">
           {Array.from({ length: totalPages }).map((_, i) => (
             <button 
               key={i} 
               onClick={() => setCurrentPage(i + 1)}
               className={`w-2 h-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-slate-900 w-6' : 'bg-slate-300'}`}
             />
           ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        {paginatedPacks.map((pack, idx) => (
          <div key={pack.id} className="animate-card" style={{ animationDelay: `${idx * 0.1}s` }}>
            <PackCard 
              pack={pack} 
              products={products} 
              onClick={onPackClick} 
            />
          </div>
        ))}
      </div>
    </section>
  );
};