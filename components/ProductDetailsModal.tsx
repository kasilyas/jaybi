
import React from 'react';
import { Product, StoreName, Language } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, store: StoreName | string, city: string) => void;
  language: Language;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ 
  product, isOpen, onClose, onAddToCart, language 
}) => {
  if (!isOpen || !product) return null;

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  // Trier les prix du moins cher au plus cher
  const sortedPrices = [...product.prices].sort((a, b) => a.price - b.price);
  const bestPrice = sortedPrices[0]?.price;

  return (
    <div className={`fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
        
        {/* Header Produit */}
        <div className="p-8 pb-0 flex flex-col items-center text-center">
           <div className="w-32 h-32 bg-slate-50 rounded-[2rem] p-6 shadow-inner border border-slate-100 mb-6 relative group">
              <img src={product.image} className="w-full h-full object-contain mix-blend-multiply transform transition-transform group-hover:scale-110" alt={product.name} />
              <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase">{product.weight}{product.unit}</p>
              </div>
           </div>
           
           <h2 className="text-xl font-black text-slate-900 leading-tight px-4">{product.name}</h2>
           <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-2 bg-emerald-50 px-3 py-1 rounded-full">
             {product.brand} • {product.category}
           </p>
        </div>

        {/* Liste des Prix */}
        <div className="flex-1 overflow-y-auto p-8 space-y-3 no-scrollbar">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
             {language === 'ar' ? 'العروض المتوفرة' : 'Offres disponibles'} ({product.prices.length})
           </p>
           
           {sortedPrices.map((priceEntry, idx) => {
             const isBest = priceEntry.price === bestPrice;
             return (
               <div 
                 key={`${priceEntry.store}-${priceEntry.city}`} 
                 className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-100 cursor-pointer group ${isBest ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
                 onClick={() => {
                    onAddToCart(product, priceEntry.store, priceEntry.city);
                    onClose();
                 }}
               >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-100 shadow-sm">
                        <img src={STORES[priceEntry.store as StoreName]?.logo} className="h-full object-contain" alt={priceEntry.store} />
                     </div>
                     <div className="text-left">
                        <p className="text-xs font-black text-slate-900 uppercase">{priceEntry.store}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                           <Icons.Lightning className="w-3 h-3" /> {priceEntry.city}
                        </p>
                     </div>
                  </div>

                  <div className="text-right">
                     <p className={`text-lg font-black ${isBest ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {priceEntry.price.toFixed(2)} <span className="text-[10px] text-slate-400">DH</span>
                     </p>
                     {isBest && (
                       <span className="inline-block bg-emerald-200 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                         {t.bestOffer}
                       </span>
                     )}
                  </div>
               </div>
             );
           })}
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
           <Icons.Minus />
        </button>
      </div>
    </div>
  );
};
