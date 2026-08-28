
import React from 'react';
import { Product, Language, StoreName } from '../types';
import { ProductCard } from './ProductCard';
import { TRANSLATIONS } from '../constants';

interface ProductBrowserModuleProps {
  products: Product[];
  language: Language;
  onAddToCart: (id: string, store?: StoreName | string, city?: string, isUserPreference?: boolean) => void;
  onToggleCompare: (id: string) => void;
  onToggleSave: (id: string) => void;
  onBrandClick: (brand: string) => void;
  onProductClick: (product: Product) => void;
  comparisonIds: string[];
  savedIds: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ProductBrowserModule: React.FC<ProductBrowserModuleProps> = ({
  products, language, onAddToCart, onToggleCompare, onToggleSave, onBrandClick, onProductClick, comparisonIds, savedIds, currentPage, totalPages, onPageChange
}) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  return (
    <section className="space-y-8 animate-in fade-in duration-700">
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-2xl font-black text-slate-900">{t.popularProducts}</h2>
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{products.length} {t.itemsFound}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((p, idx) => (
          <div key={p.id} className="animate-card" style={{ animationDelay: `${idx * 0.05}s` }}>
            <ProductCard 
              product={p} 
              onClick={(prod) => onProductClick(prod)} 
              onAddToCart={(p, store, city) => onAddToCart(p.id, store, city)} 
              onToggleCompare={(id) => onToggleCompare(id)} 
              onToggleSave={(id) => onToggleSave(id)}
              isComparing={comparisonIds.includes(p.id)} 
              isSaved={savedIds.includes(p.id)}
              onBrandClick={onBrandClick}
              language={language}
            />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-xl scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-400'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
