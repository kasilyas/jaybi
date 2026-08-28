
import React from 'react';
import { Order, Product, Language, StoreName, Pack } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  packs: Pack[];
  language: Language;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order, products, packs, language }) => {
  if (!isOpen || !order) return null;
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] p-12 shadow-4xl animate-in zoom-in-95 max-h-[85vh] overflow-hidden flex flex-col">
        <header className="mb-8 shrink-0">
           <div className="flex items-center justify-between mb-4">
              <span className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-900"><Icons.Minus /></button>
           </div>
           <h2 className="text-3xl font-black text-slate-900">Détails de Commande</h2>
           <p className="text-[10px] text-emerald-600 font-black uppercase mt-2">{order.createdAt}</p>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
           {order.items.map((item, idx) => {
             const product = products.find(p => p.id === item.productId)!;
             const store = item.store || StoreName.MARJANE;
             let price = product.prices.find(p => p.store === store)?.price || 0;
             let isDiscounted = false;

             if (item.packId) {
                const pack = packs.find(p => p.id === item.packId);
                if (pack && pack.discountPercent) {
                   price = price * (1 - pack.discountPercent / 100);
                   isDiscounted = true;
                }
             }

             return (
               <div key={idx} className={`flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border ${isDiscounted ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100'}`}>
                  <div className="w-12 h-12 bg-white rounded-xl p-2 shrink-0 border border-slate-200">
                     <img src={product.image} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs font-bold text-slate-900">{product.name}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{store}</p>
                        {isDiscounted && <span className="text-[7px] font-black text-amber-600 bg-amber-100 px-1.5 rounded uppercase">Pack Promo</span>}
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-sm font-black ${isDiscounted ? 'text-amber-600' : 'text-slate-900'}`}>{(price * item.quantity).toFixed(2)} DH</p>
                     <p className="text-[9px] font-bold text-slate-400">{item.quantity} x {price.toFixed(2)}</p>
                  </div>
               </div>
             );
           })}
        </div>

        <footer className="mt-8 pt-8 border-t border-slate-100 shrink-0">
           <div className="flex justify-between items-center mb-6">
              <p className="text-sm font-black text-slate-400 uppercase">Total payé</p>
              <p className="text-3xl font-black text-slate-900">{order.total.toFixed(2)} DH</p>
           </div>
           <button onClick={onClose} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl">Retour à l'historique</button>
        </footer>
      </div>
    </div>
  );
};
