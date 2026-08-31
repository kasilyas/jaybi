
import React, { useMemo } from 'react';
import { Product, StoreName, Language } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemove: (id: string) => void;
  onAddToCart: (id: string, store?: StoreName, city?: string, isPreference?: boolean) => void;
  language: Language;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ 
  isOpen, onClose, products, onRemove, onAddToCart, language 
}) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  // Récupérer toutes les combinaisons Store + City uniques des produits sélectionnés
  const locationEntries = useMemo(() => {
    // Fix: Allow string in store type for the locations map to match PriceEntry
    const locations = new Map<string, { store: StoreName | string, city: string }>();
    products.forEach(p => {
      p.prices.forEach(pr => {
        const key = `${pr.store}-${pr.city}`;
        locations.set(key, { store: pr.store, city: pr.city });
      });
    });
    return Array.from(locations.values());
  }, [products]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-[3rem] shadow-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
        
        <header className={`p-8 border-b border-slate-100 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-2xl font-black text-slate-900">{language === 'ar' ? 'تحليل مقارن دقيق' : 'Analyse Comparative Fine'}</h2>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">{language === 'ar' ? 'اختر المتجر والمدينة المناسبة لك' : 'Choisissez le magasin et la ville qui vous conviennent'}</p>
           </div>
           <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
              <Icons.Minus />
           </button>
        </header>

        <div className="flex-1 overflow-x-auto p-8 no-scrollbar">
           <table className={`w-full min-w-[800px] ${isRTL ? 'text-right' : 'text-left'}`}>
              <thead>
                 <tr>
                    <th className="w-64 text-left p-4 pb-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Enseigne & Ville</th>
                    {products.map(p => (
                      <th key={p.id} className="px-4 pb-8 align-top relative group">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 bg-slate-50 rounded-[1.5rem] p-4 shadow-inner border border-slate-100 relative">
                               <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                               <button 
                                  onClick={() => onRemove(p.id)}
                                  className={`absolute -top-2 -right-2 w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-110 z-30`}
                               >
                                  <Icons.Minus className="scale-75" />
                               </button>
                            </div>
                            <div className="text-center px-2">
                               <h3 className="text-[10px] font-black text-slate-800 uppercase leading-tight line-clamp-2">{p.name}</h3>
                            </div>
                         </div>
                      </th>
                    ))}
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {locationEntries.map(loc => (
                   <tr key={`${loc.store}-${loc.city}`} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-4">
                         <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-sm">
                               {/* Fix: Indexing STORES with casting and optional chaining for safety */}
                               <img src={STORES[loc.store as StoreName]?.logo} className="h-full object-contain" alt="" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{loc.store}</p>
                               <p className="text-[8px] font-bold text-emerald-600 uppercase mt-1 tracking-tighter">{loc.city}</p>
                            </div>
                         </div>
                      </td>
                      {products.map(p => {
                        const priceEntry = p.prices.find(pr => pr.store === loc.store && pr.city === loc.city);
                        const isBestPriceForProd = priceEntry && priceEntry.price === Math.min(...p.prices.map(pr => pr.price));
                        
                        return (
                          <td key={p.id} className="px-4 py-6 text-center">
                             {priceEntry ? (
                               <button 
                                 onClick={() => onAddToCart(p.id, loc.store as StoreName, loc.city, true)}
                                 className={`group/btn flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all w-full ${isBestPriceForProd ? 'border-emerald-200 bg-emerald-50/30' : 'border-transparent hover:border-slate-200 hover:bg-white'}`}
                               >
                                  <span className={`text-lg font-black ${isBestPriceForProd ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                                     {priceEntry.price.toFixed(2)} <span className="text-[9px] text-slate-400">DH</span>
                                  </span>
                                  {isBestPriceForProd ? (
                                    <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-100 px-2 py-0.5 rounded-md">{t.bestOffer}</span>
                                  ) : (
                                    <span className="text-[7px] font-black text-slate-300 uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity">Choisir ce lieu</span>
                                  )}
                               </button>
                             ) : (
                               <span className="text-[8px] text-slate-200 font-black uppercase tracking-widest">—</span>
                             )}
                          </td>
                        );
                      })}
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};
