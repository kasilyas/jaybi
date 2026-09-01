
import React, { useState, useEffect } from 'react';
import { Product, StoreName, Language } from '../types';
import { Icons, STORES, CATEGORY_VISUALS, TRANSLATIONS } from '../constants';

interface ProductCardProps {
  product: Product;
  onClick: (p: Product) => void;
  onAddToCart: (p: Product, store?: string, city?: string) => void;
  onBrandClick: (brand: string) => void;
  onToggleCompare: (productId: string) => void;
  onToggleSave: (productId: string) => void;
  isComparing: boolean;
  isSaved: boolean;
  language: Language;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onBrandClick, 
  onToggleCompare, 
  onToggleSave,
  isComparing,
  isSaved,
  language
}) => {
  const [imageError, setImageError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [showOtherOffers, setShowOtherOffers] = useState(false);
  
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const sortedPrices = [...product.prices].sort((a, b) => a.price - b.price);
  const bestPrice = sortedPrices[0];
  const otherPrices = sortedPrices.slice(1);

  const isPromoActive = bestPrice.originalPrice &&
    bestPrice.originalPrice > bestPrice.price &&
    (!bestPrice.promotionExpiresAt || new Date(bestPrice.promotionExpiresAt) > new Date());

  const discountPercent = isPromoActive
    ? Math.round(((bestPrice.originalPrice! - bestPrice.price) / bestPrice.originalPrice!) * 100)
    : 0;

  // --- Remise produit / flash sale (v0.2) ---
  const effectiveDiscount = product.effectiveDiscountPercent ?? 0;
  const isFlashSale = !!product.flashSaleActive;
  const hasProductDiscount = effectiveDiscount > 0;
  // Prix de base (meilleur prix enseigne) avant remise produit
  const basePrice = bestPrice?.price ?? 0;
  const discountedPrice = hasProductDiscount
    ? basePrice * (1 - effectiveDiscount / 100)
    : basePrice;

  useEffect(() => {
    if (!bestPrice.promotionExpiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(bestPrice.promotionExpiresAt!).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [bestPrice.promotionExpiresAt]);

  const isFresh = new Date(bestPrice.lastUpdated).getTime() > new Date().getTime() - (24 * 60 * 60 * 1000);
  const visual = CATEGORY_VISUALS[product.category] || CATEGORY_VISUALS['default'];

  return (
    <div className={`card-hover bg-white border rounded-[2rem] p-4 sm:p-5 flex flex-col transition-all group relative overflow-hidden ${isComparing ? 'border-emerald-500 ring-4 ring-emerald-500/10 scale-[1.02]' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40'}`}>

      {/* Glow accent en arrière-plan selon catégorie */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${visual.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

      {/* Top Actions */}
      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-20 flex flex-col gap-2`}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(product.id); }}
          className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm touch-target ${isComparing ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/90 backdrop-blur border-slate-200 text-slate-300 hover:border-emerald-500 hover:text-emerald-500'}`}
        >
          <Icons.Compare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(product.id); }}
          className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm touch-target ${isSaved ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/90 backdrop-blur border-slate-200 text-slate-300 hover:border-rose-500 hover:text-rose-500'}`}
        >
          <Icons.Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : 'fill-none'}`} />
        </button>
      </div>

      <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-10 flex flex-col gap-1.5 items-end`}>
        {/* Badge Flash si vente flash active */}
        {isFlashSale && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-md border bg-gradient-to-r from-rose-500 to-rose-600 border-rose-600 text-white">
            <Icons.Lightning className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-tight">Flash</span>
          </div>
        )}
        {/* Badge remise (promo enseigne OU remise produit/flash) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-md border ${
          isPromoActive || hasProductDiscount ? 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-600 text-white'
          : isFresh ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isPromoActive || hasProductDiscount ? 'bg-white' : isFresh ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
          <span className="text-[9px] font-black uppercase tracking-tight">
            {isPromoActive || hasProductDiscount ? `-${Math.max(discountPercent, effectiveDiscount)}%` : isFresh ? t.freshPrice : t.verify}
          </span>
        </div>
      </div>

      {/* Image Holder */}
      <div className={`relative aspect-square mb-5 bg-gradient-to-br ${visual.color} rounded-[2rem] overflow-hidden flex items-center justify-center p-8 border border-slate-100 shadow-inner`}>
        {imageError ? (
          <div className="text-6xl drop-shadow-xl">{visual.emoji}</div>
        ) : (
          <img 
            src={product.image} 
            alt={product.name} 
            onError={() => setImageError(true)}
            className="max-w-full max-h-full object-contain transform transition-transform duration-700 group-hover:scale-105 drop-shadow-lg"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className={`flex justify-between items-start mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onBrandClick(product.brand); }}
            className="text-[10px] text-emerald-600 font-black uppercase tracking-widest hover:underline hover:text-emerald-700 transition-all"
          >
            {product.brand}
          </button>
          <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{product.weight}{product.unit}</span>
        </div>
        
        <h3 className={`text-sm font-bold text-slate-800 mb-6 leading-tight h-10 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {product.name}
        </h3>

        <div className="mt-auto bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
           {/* Best Price Main Display */}
           <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
                {/* Prix barré : promo enseigne OU remise produit/flash */}
                {(isPromoActive || hasProductDiscount) && (
                  <span className="text-[10px] font-bold text-slate-400 line-through" dir="ltr">
                    {(isPromoActive ? bestPrice.originalPrice : basePrice)?.toFixed(2)} {t.currencySuffix}
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${isPromoActive || hasProductDiscount ? (isFlashSale ? 'text-rose-600' : 'text-emerald-600') : 'text-emerald-600'}`}>
                    {(isPromoActive ? bestPrice.price : discountedPrice).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-black text-slate-400">{t.currencySuffix}</span>
                </div>
                {/* Libellé flash si présent */}
                {isFlashSale && product.flashSaleLabel && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-rose-500 mt-0.5">{product.flashSaleLabel}</span>
                )}
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                  <img src={STORES[bestPrice.store as StoreName]?.logo} alt={bestPrice.store} className="h-3 w-auto object-contain" />
                  <span className="text-[8px] font-black text-slate-500 uppercase">{bestPrice.store}</span>
                </div>
              </div>
           </div>

           <button
             onClick={(e) => { e.stopPropagation(); onAddToCart(product, bestPrice.store, bestPrice.city); }}
             className={`w-full py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:from-emerald-600 hover:to-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-300/50 mb-2`}
           >
             <Icons.Plus /> {t.addToCart}
           </button>

           {/* Option to view other prices if multiple stores exist */}
           {otherPrices.length > 0 && (
             <div>
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowOtherOffers(!showOtherOffers); }}
                 className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center justify-center gap-1 mt-2"
               >
                 {showOtherOffers ? 'Masquer' : `Voir ${otherPrices.length} autres offres`} 
                 <Icons.ChevronRight className={`w-3 h-3 transition-transform ${showOtherOffers ? '-rotate-90' : 'rotate-90'}`} />
               </button>

               {showOtherOffers && (
                 <div className="mt-3 space-y-2 animate-in slide-in-from-top-1">
                   {otherPrices.map((price, idx) => (
                     <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 flex items-center justify-center bg-slate-50 rounded-lg">
                             <img src={STORES[price.store as StoreName]?.logo} className="h-3 w-auto" alt=""/>
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-slate-900 uppercase">{price.store}</p>
                             <p className="text-[7px] font-bold text-slate-400">{price.city}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-700">{price.price.toFixed(2)}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onAddToCart(product, price.store, price.city); }}
                            className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors touch-target"
                          >
                             <Icons.Plus className="scale-75" />
                          </button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
