
import React from 'react';
import { Product, Language, StoreName } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';
import { ProductImage } from './ProductImage';

interface BrandBrowserModuleProps {
  brandName: string;
  products: Product[];
  language: Language;
  onAddToCart: (id: string, store?: StoreName | string, city?: string, isPref?: boolean) => void;
  onClose: () => void;
}

export const BrandBrowserModule: React.FC<BrandBrowserModuleProps> = ({
  brandName, products, language, onAddToCart, onClose
}) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';
  const brandProducts = products.filter(p => p.brand === brandName && !p.isDeleted);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className={`flex items-center justify-between bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl border border-slate-100 shadow-inner">
              🏷️
           </div>
           <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-4xl font-black text-slate-900">{brandName}</h2>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.3em] mt-1">Sélection Exclusive</p>
           </div>
        </div>
        <button onClick={onClose} className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-200">
           <Icons.Minus />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {brandProducts.map(p => (
          <div key={p.id} className={`bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm flex flex-col md:flex-row gap-10 hover:border-emerald-500 transition-all ${isRTL ? 'md:flex-row-reverse' : ''}`}>
             <div className="w-full md:w-48 aspect-square bg-slate-50 rounded-[2rem] p-6 flex items-center justify-center border border-slate-50 shadow-inner">
                <ProductImage product={p} className="w-full h-full flex items-center justify-center" imgClassName="max-w-full max-h-full object-contain mix-blend-multiply" showBrand />
             </div>
             
             <div className="flex-1 space-y-6">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                   <h3 className="text-2xl font-black text-slate-900">{p.name}</h3>
                   <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{p.weight} {p.unit} • {p.category}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                   {p.prices.map((pr, idx) => (
                      <button 
                        key={idx}
                        onClick={() => onAddToCart(p.id, pr.store, pr.city, true)}
                        className="bg-slate-50 border border-slate-100 rounded-3xl p-5 hover:bg-white hover:border-emerald-500 hover:shadow-xl transition-all group/price text-center flex flex-col items-center"
                      >
                         <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl p-2 mb-3 flex items-center justify-center shadow-sm group-hover/price:scale-110 transition-transform">
                            <img src={STORES[pr.store as StoreName]?.logo} className="h-full object-contain" alt={pr.store} />
                         </div>
                         <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{pr.store}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-3">{pr.city}</p>
                         <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-emerald-600">{pr.price.toFixed(2)}</span>
                            <span className="text-[10px] font-black text-slate-400">DH</span>
                         </div>
                         <div className="mt-4 w-full py-2 bg-slate-900 text-white text-[8px] font-black uppercase rounded-xl opacity-0 group-hover/price:opacity-100 transition-opacity">
                            {t.addToCart}
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          </div>
        ))}
        {brandProducts.length === 0 && (
          <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center">
             <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">{t.noResults}</p>
          </div>
        )}
      </div>
    </div>
  );
};
