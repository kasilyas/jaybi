
import React from 'react';
import { Pack, Product } from '../types';
import { Icons, STORES } from '../constants';

interface PackDetailsModalProps {
  pack: Pack | null;
  products: Product[];
  onClose: () => void;
  onAddAll: (productIds: string[], packId?: string) => void;
}

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({ pack, products, onClose, onAddAll }) => {
  if (!pack || !pack.productIds) return null;
  
  const packProducts = products.filter(p => pack.productIds.includes(p.id));
  
  // Somme des meilleurs prix individuels
  const totalPrice = packProducts.reduce((sum, p) => {
    const bestPrice = Math.min(...p.prices.map(pr => pr.price));
    return sum + bestPrice;
  }, 0);

  // Calcul du prix final avec remise
  let finalPrice = totalPrice;
  if (pack.price) {
      finalPrice = pack.price;
  } else if (pack.discountPercent) {
      finalPrice = totalPrice * (1 - pack.discountPercent / 100);
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[3rem] p-5 sm:p-10 shadow-4xl animate-in zoom-in-95 overflow-hidden modal-fullscreen-mobile">
        
        <div className="flex items-center gap-8 mb-10">
           <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border border-slate-100">
              {pack.image}
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{pack.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                 <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Offre Groupée</span>
                 {pack.discountPercent && <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-2 py-1 rounded">-{pack.discountPercent}%</span>}
              </div>
           </div>
        </div>

        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 no-scrollbar mb-10">
          {packProducts.map(p => {
            const bestPriceEntry = [...p.prices].sort((a, b) => a.price - b.price)[0];
            return (
              <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-5 flex items-center gap-5 group hover:bg-white hover:border-emerald-200 transition-all">
                 <div className="w-16 h-16 bg-white rounded-2xl p-3 shrink-0 shadow-sm border border-slate-100">
                    <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1">{p.brand} • {p.weight}{p.unit}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{bestPriceEntry.price.toFixed(2)} DH</p>
                    <div className="flex items-center gap-2 justify-end mt-1 opacity-40">
                       <img src={STORES[bestPriceEntry.store].logo} className="h-2 w-auto grayscale" alt="" />
                    </div>
                 </div>
              </div>
            );
          })}
        </div>

        <div className="pt-10 border-t border-slate-100 flex items-center justify-between">
           <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total du Pack</p>
              <div className="flex items-baseline gap-2 mt-1">
                 {finalPrice < totalPrice && (
                    <span className="text-lg font-bold text-slate-300 line-through">{totalPrice.toFixed(2)} DH</span>
                 )}
                 <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">{finalPrice.toFixed(2)}</span>
                    <span className="text-xl font-bold text-slate-400">DH</span>
                 </div>
              </div>
           </div>
           <button 
             onClick={() => { onAddAll(pack.productIds, pack.id); onClose(); }}
             className="px-10 py-6 bg-emerald-500 text-white font-black rounded-[2rem] text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-4"
           >
             Ajouter au panier
             <Icons.Cart />
           </button>
        </div>
        
        <button onClick={onClose} className="absolute top-10 right-10 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-colors">
           <Icons.Minus />
        </button>
      </div>
    </div>
  );
};
