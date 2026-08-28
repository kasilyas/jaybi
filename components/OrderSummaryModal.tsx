
import React from 'react';
import { Product, CartItem, Language, StoreName, PromoCode, Pack } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  packs: Pack[];
  language: Language;
  onConfirmOrder: () => void;
  onConfirmRoadmap: () => void;
  appliedPromo: PromoCode | null;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({ 
  isOpen, onClose, cart, products, packs, language, onConfirmOrder, onConfirmRoadmap, appliedPromo 
}) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  if (!isOpen) return null;

  const groupedItems = cart.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId)!;
    const bestPriceEntry = [...product.prices].sort((a, b) => a.price - b.price)[0];
    const store = item.store || bestPriceEntry.store;
    
    // Calcul du prix spécifique (Pack ou Standard)
    let unitPrice = product.prices.find(pr => pr.store === store)?.price || bestPriceEntry.price;
    let packName = undefined;

    if (item.packId) {
      const pack = packs.find(p => p.id === item.packId);
      if (pack) {
        packName = pack.name;
        if (pack.discountPercent) {
          unitPrice = unitPrice * (1 - pack.discountPercent / 100);
        }
      }
    }

    if (!acc[store]) acc[store] = [];
    acc[store].push({ ...item, product, price: unitPrice, packName });
    return acc;
  }, {} as Record<string, any[]>);

  const subtotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)!;
    let price = product.prices.find(pr => pr.store === item.store)?.price || Math.min(...product.prices.map(pr => pr.price));
    
    if (item.packId) {
      const pack = packs.find(p => p.id === item.packId);
      if (pack && pack.discountPercent) {
        price = price * (1 - pack.discountPercent / 100);
      }
    }
    return sum + (price * item.quantity);
  }, 0);

  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percent') discount = subtotal * (appliedPromo.discountValue / 100);
    else discount = appliedPromo.discountValue;
  }

  const totalAmount = Math.max(0, subtotal - discount);

  return (
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[3rem] shadow-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
        
        <header className="p-10 border-b border-slate-100 shrink-0">
          <h2 className="text-3xl font-black text-slate-900">{t.optimizationTitle}</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Vérifiez vos articles avant de finaliser</p>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
           {Object.entries(groupedItems).map(([store, itemsVal]) => {
             const items = itemsVal as any[];
             return (
               <section key={store} className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                     <img src={STORES[store as StoreName].logo} className="h-6 w-auto object-contain" alt="" />
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">{store}</h3>
                  </div>
                  <div className="space-y-3">
                     {items.map((item, idx) => (
                       <div key={idx} className={`flex items-center justify-between bg-white px-5 py-3 rounded-2xl border ${item.packName ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                             <span className="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">{item.quantity}x</span>
                             <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate block">{item.product.name}</span>
                                {item.packName && (
                                  <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest bg-amber-100 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                    PACK {item.packName}
                                  </span>
                                )}
                             </div>
                          </div>
                          <span className={`text-xs font-black whitespace-nowrap ml-2 ${item.packName ? 'text-amber-600' : 'text-slate-900'}`} dir="ltr">
                            {(item.price * item.quantity).toFixed(2)} {t.currencySuffix}
                          </span>
                       </div>
                     ))}
                  </div>
               </section>
             );
           })}
        </div>

        <footer className="p-10 bg-slate-50 border-t border-slate-200 shrink-0">
           <div className="space-y-1 mb-6">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Sous-total</span>
                <span dir="ltr">{subtotal.toFixed(2)} {t.currencySuffix}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-xs font-black text-emerald-500 uppercase tracking-widest">
                  <span>{t.promoDiscount} ({appliedPromo.code})</span>
                  <span dir="ltr">-{discount.toFixed(2)} {t.currencySuffix}</span>
                </div>
              )}
           </div>
           
           <div className="flex justify-between items-center mb-10">
              <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total Final</span>
              <span className="text-4xl font-black text-slate-900" dir="ltr">{totalAmount.toFixed(2)} <span className="text-lg">{t.currencySuffix}</span></span>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={onConfirmRoadmap}
                className="py-5 bg-white border border-slate-200 text-slate-900 font-black rounded-3xl text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex flex-col items-center gap-1"
              >
                 Terminer mes courses
                 <span className="text-[8px] text-slate-400 font-bold lowercase">(Roadmap GPS)</span>
              </button>
              <button 
                onClick={onConfirmOrder}
                className="py-5 bg-emerald-500 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex flex-col items-center gap-1"
              >
                 Commander
                 <span className="text-[8px] text-emerald-100 font-bold lowercase">(Livraison domicile)</span>
              </button>
           </div>
        </footer>
      </div>
    </div>
  );
};
