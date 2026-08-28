
import React, { useState, useEffect, useMemo } from 'react';
import { Pack, Product, CampaignTheme } from '../types';
import { Icons, THEME_CONFIG } from '../constants';

interface PackCardProps {
  pack: Pack;
  products: Product[];
  onClick: (pack: Pack) => void;
}

export const PackCard: React.FC<PackCardProps> = ({ pack, products, onClick }) => {
  const [status, setStatus] = useState<{ label: string; active: boolean; type: 'waiting' | 'running' | 'expired' }>({ label: '', active: false, type: 'waiting' });
  const config = THEME_CONFIG[pack.theme || 'standard'];

  const packProducts = useMemo(() => products.filter(p => pack.productIds.includes(p.id)), [products, pack.productIds]);
  
  const originalTotal = useMemo(() => packProducts.reduce((sum, p) => {
    const bestPrice = Math.min(...p.prices.map(pr => pr.price));
    return sum + bestPrice;
  }, 0), [packProducts]);

  const finalPrice = useMemo(() => {
    if (pack.price) return pack.price; // Use preset price if exists
    if (pack.discountPercent) return originalTotal * (1 - pack.discountPercent / 100);
    return originalTotal;
  }, [pack.price, pack.discountPercent, originalTotal]);

  const discountPercent = useMemo(() => {
    if (pack.discountPercent) return pack.discountPercent;
    if (pack.originalPrice && pack.price && pack.originalPrice > pack.price) {
      return Math.round(((pack.originalPrice - pack.price) / pack.originalPrice) * 100);
    }
    return 0;
  }, [pack.discountPercent, pack.originalPrice, pack.price]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const startTime = pack.startsAt ? new Date(pack.startsAt).getTime() : 0;
      const endTime = pack.expiresAt ? new Date(pack.expiresAt).getTime() : Infinity;

      if (now < startTime) {
        // Pas encore commencé
        const diff = startTime - now;
        const h = Math.floor((diff / (1000 * 60 * 60)));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setStatus({ label: `Débute dans ${h}h ${m}m`, active: false, type: 'waiting' });
      } else if (now > endTime) {
        // Terminé
        setStatus({ label: 'EXPIRÉ', active: false, type: 'expired' });
      } else {
        // En cours
        if (endTime === Infinity) {
          setStatus({ label: 'OFFRE PERMANENTE', active: true, type: 'running' });
        } else {
          const diff = endTime - now;
          const h = Math.floor((diff / (1000 * 60 * 60)));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setStatus({ label: `Termine dans ${h}h ${m}m ${s}s`, active: true, type: 'running' });
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [pack.startsAt, pack.expiresAt]);

  const progress = pack.type === 'group-buy' 
    ? (pack.currentParticipants! / pack.groupBuyMinParticipants!) * 100 
    : 0;

  const accentColor = pack.theme === 'black-friday' ? 'border-yellow-500' : 
                     pack.theme === 'ramadan' ? 'border-emerald-500' : 
                     pack.theme === 'flash' ? 'border-rose-500' : 'border-slate-200';

  return (
    <div 
      onClick={() => onClick(pack)}
      className={`shrink-0 w-80 bg-white border-2 ${accentColor} rounded-[2.5rem] p-6 transition-all cursor-pointer group shadow-lg relative overflow-hidden active:scale-95 hover:shadow-2xl hover:shadow-slate-200/50 ${status.type === 'expired' ? 'grayscale opacity-70' : ''}`}
    >
      {/* Sponsored Badge */}
      {pack.isSponsored && (
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-slate-100 px-2 py-1 rounded-lg text-[7px] font-black uppercase text-slate-500 border border-slate-200 tracking-widest">
            {pack.supplierName || 'Partenaire'}
          </span>
        </div>
      )}

      {/* Labels */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
         <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm text-[8px] font-black uppercase tracking-tighter ${pack.theme === 'black-friday' ? 'bg-yellow-500 text-black' : 'bg-slate-900 text-white'}`}>
            <Icons.Tag className="scale-75" />
            {config.label}
         </div>
         {discountPercent > 0 && (
           <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">
             -{discountPercent}%
           </div>
         )}
         {status.label && status.type !== 'expired' && (
           <div className={`text-[9px] font-black text-white px-2 py-1 rounded-lg ${status.type === 'waiting' ? 'bg-amber-500' : 'bg-rose-600 animate-pulse'}`}>
             {status.type === 'waiting' ? '⏳ ' : '🔥 '} {status.label}
           </div>
         )}
      </div>
      
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl mb-6 mt-12 group-hover:rotate-12 transition-transform shadow-inner border border-slate-100">
        {pack.image}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors origin-left">{pack.name}</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider line-clamp-2 leading-relaxed h-10">
          {pack.description}
        </p>
      </div>

      {pack.type === 'group-buy' && (
        <div className="mt-6 space-y-2">
           <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
              <span>{pack.currentParticipants} participants</span>
              <span>Objectif : {pack.groupBuyMinParticipants}</span>
           </div>
           <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
           </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
        <div>
          {(pack.originalPrice || originalTotal > finalPrice) && (
            <p className="text-[10px] font-bold text-slate-300 line-through mb-0.5">{(pack.originalPrice || originalTotal).toFixed(2)} DH</p>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{finalPrice.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-slate-400">DH</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-lg`}>
          <Icons.ChevronRight />
        </div>
      </div>
    </div>
  );
};
