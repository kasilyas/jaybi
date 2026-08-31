
import React, { useState, useMemo } from 'react';
import { Product, CartItem, StoreName, Language, PromoCode, Pack } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';
import { DeleteConfirmation, AdminModal } from './AdminShared';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  packs?: Pack[];
  language: Language;
  onUpdateQuantity: (id: string, store: StoreName | string | undefined, city: string | undefined, delta: number, packId?: string) => void;
  onRemove: (id: string, store: StoreName | string | undefined, city: string | undefined, packId?: string) => void;
  onOpenRoadmap: () => void;
  onPlaceOrder: (mode: 'delivery' | 'roadmap', payment: 'cod' | 'cmi') => void;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onApplyPromo: (code: string) => boolean;
  appliedPromo: PromoCode | null;
  onRemovePromo: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, onClose, cart, products, packs = [], language, onUpdateQuantity, onRemove, onPlaceOrder, isLoggedIn, onOpenAuth, onApplyPromo, appliedPromo, onRemovePromo 
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{id: string, store?: string, city?: string, packId?: string, packName?: string} | null>(null);

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const cartData = useMemo(() => {
    // Filtrer les items archivés
    return cart.filter(i => !i.isDeleted).map(item => {
      const product = products.find(p => p.id === item.productId)!;
      // Si le store est défini dans l'item du panier, on l'utilise, sinon on prend le meilleur prix par défaut
      const targetStore = (item.store) as StoreName; 
      const priceEntry = product.prices.find(p => p.store === targetStore && (item.city ? p.city === item.city : true));
      
      // Fallback si jamais le prix n'est pas trouvé (ne devrait pas arriver si la logique d'ajout est bonne)
      const currentPriceEntry = priceEntry || [...product.prices].sort((a, b) => a.price - b.price)[0];
      
      let finalPrice = currentPriceEntry.price;
      let isDiscounted = false;
      let packName = undefined;

      // Appliquer la remise pack si applicable
      if (item.packId) {
        const pack = packs.find(p => p.id === item.packId);
        if (pack) {
          packName = pack.name;
          if (pack.discountPercent) {
            finalPrice = finalPrice * (1 - pack.discountPercent / 100);
            isDiscounted = true;
          }
        }
      }

      return { ...item, product, targetStore: currentPriceEntry.store, currentPrice: finalPrice, isDiscounted, packName };
    });
  }, [cart, products, packs]);

  const subtotal = cartData.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
  
  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discountType === 'percent') return subtotal * (appliedPromo.discountValue / 100);
    return appliedPromo.discountValue;
  }, [appliedPromo, subtotal]);

  const totalCost = Math.max(0, subtotal - discountAmount);

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onApplyPromo(promoInput);
    if (success) {
      setPromoInput('');
      setPromoError(false);
    } else {
      setPromoError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[600] overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-0 bottom-0 w-full max-w-lg bg-white shadow-4xl flex flex-col animate-in ${isRTL ? 'slide-in-from-left' : 'slide-in-from-right'} duration-500 border-l border-slate-200 modal-fullscreen-mobile`}>
        
        <header className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-3xl font-black text-slate-900">{t.cart}</h2>
            <p className="text-[11px] text-emerald-600 font-bold uppercase mt-1">
              {cartData.length} {t.itemsFound}
            </p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
            <Icons.Minus />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 no-scrollbar">
          {cartData.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                <Icons.Cart />
                <p className="text-sm font-black uppercase tracking-widest mt-4">{t.emptyCart}</p>
             </div>
          ) : (
             <>
               {cartData.map((item, idx) => (
                 <div key={`${item.productId}-${item.store}-${item.city}-${idx}`} className={`flex items-center gap-5 p-5 bg-white rounded-3xl border ${item.packId ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100'} group shadow-sm hover:shadow-md transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="shrink-0 relative">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl p-3 flex items-center justify-center border border-slate-100">
                        <img src={item.product.image} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-lg p-1.5 border border-slate-200 shadow-lg">
                        <img src={STORES[item.targetStore as string]?.logo} className="w-full h-full object-contain" alt="" />
                      </div>
                    </div>
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                       {item.packName && (
                         <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider mb-1">
                           <Icons.Tag className="w-2 h-2" />
                           {item.packName}
                         </div>
                       )}
                       <p className="text-sm font-bold text-slate-900 leading-tight">{item.product.name}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{item.city}</p>
                       <div className="flex items-center gap-2 mt-1">
                         <p className={`text-xs font-black ${item.isDiscounted ? 'text-amber-600' : 'text-emerald-600'}`} dir="ltr">
                           {item.currentPrice.toFixed(2)} {t.currencySuffix}
                         </p>
                         {item.isDiscounted && <span className="text-[8px] font-bold text-amber-500 uppercase bg-amber-100 px-1 rounded">-Promo Pack</span>}
                       </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <button 
                          disabled={!!item.packId}
                          onClick={() => onUpdateQuantity(item.productId, item.store, item.city, -1, item.packId)} 
                          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all touch-target ${item.packId ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900 bg-slate-50'}`}
                        >
                          {item.packId ? <Icons.Lock className="scale-75" /> : <Icons.Minus className="scale-75"/>}
                        </button>
                        
                        <span className="text-xs font-black text-slate-900 w-4 text-center">{item.quantity}</span>
                        
                        <button 
                          disabled={!!item.packId}
                          onClick={() => onUpdateQuantity(item.productId, item.store, item.city, 1, item.packId)} 
                          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all touch-target ${item.packId ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900 bg-slate-50'}`}
                        >
                          {item.packId ? <Icons.Lock className="scale-75" /> : <Icons.Plus className="scale-75"/>}
                        </button>
                      </div>
                      <button 
                        onClick={() => setDeletingItem({id: item.productId, store: item.store as string, city: item.city, packId: item.packId, packName: item.packName})}
                        className={`text-[10px] font-black uppercase hover:underline py-2 px-3 ${item.packId ? 'text-amber-600' : 'text-rose-500'}`}
                      >
                        {isRTL ? 'إزالة' : (item.packId ? 'Retirer Pack' : 'Retirer')}
                      </button>
                    </div>
                 </div>
               ))}
               
               <div className="mt-8 pt-8 border-t border-slate-100">
                 {!appliedPromo ? (
                    <form onSubmit={handlePromoSubmit} className="flex gap-2">
                       <input 
                         type="text" 
                         value={promoInput} 
                         onChange={e => setPromoInput(e.target.value.toUpperCase())}
                         placeholder={t.promoCode}
                         className={`flex-1 bg-slate-50 border ${promoError ? 'border-rose-500' : 'border-slate-200'} rounded-2xl px-5 py-3 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900/5 transition-all`}
                       />
                       <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">{t.apply}</button>
                    </form>
                 ) : (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Icons.Check className="text-emerald-500"/>
                          <div>
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Code Actif: {appliedPromo.code}</p>
                             <p className="text-[8px] font-bold text-emerald-400 uppercase">-{appliedPromo.discountValue}{appliedPromo.discountType === 'percent' ? '%' : ` ${t.currencySuffix}`}</p>
                          </div>
                       </div>
                       <button onClick={onRemovePromo} className="text-rose-400 hover:text-rose-600 p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center"><Icons.Minus className="scale-75"/></button>
                    </div>
                 )}
                 {promoError && <p className="text-[9px] font-black text-rose-500 uppercase mt-2 ml-4">{t.invalidCode}</p>}
               </div>
             </>
          )}
        </div>

        <footer className="p-4 sm:p-8 bg-slate-50 border-t border-slate-200">
           <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                 <span>Sous-total</span>
                 <span dir="ltr">{subtotal.toFixed(2)} {t.currencySuffix}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-xs font-black text-emerald-500 uppercase tracking-widest">
                   <span>{t.promoDiscount}</span>
                   <span dir="ltr">-{discountAmount.toFixed(2)} {t.currencySuffix}</span>
                </div>
              )}
           </div>
           
           <div className={`flex justify-between text-3xl font-black text-slate-900 mb-8 pt-5 border-t border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>Total</span>
              <span dir="ltr">{totalCost.toFixed(2)} {t.currencySuffix}</span>
           </div>

           {!isLoggedIn ? (
             <button onClick={onOpenAuth} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all">{t.login}</button>
           ) : (
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onPlaceOrder('roadmap', 'cod')} 
                  disabled={cartData.length === 0} 
                  className="w-full py-5 bg-white border border-slate-200 text-slate-900 font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                >
                   {language === 'ar' ? 'مسار المتجر' : 'Ma Roadmap'}
                </button>
                <button 
                  onClick={() => onPlaceOrder('delivery', 'cod')} 
                  disabled={cartData.length === 0} 
                  className="w-full py-5 bg-emerald-500 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-30"
                >
                   {language === 'ar' ? 'توصيل' : 'Livraison'}
                </button>
             </div>
           )}
        </footer>
      </div>

      {deletingItem?.packId ? (
        <AdminModal title="Retirer le Pack ?" isOpen={!!deletingItem} onClose={() => setDeletingItem(null)}>
           <div className="text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <Icons.Box className="scale-150"/>
              </div>
              <h4 className="text-lg font-black text-slate-900 uppercase mb-2">{deletingItem.packName}</h4>
              <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed px-4">
                 Attention : Ce produit fait partie d'une offre groupée. Si vous le retirez, **l'ensemble du pack** sera supprimé du panier et vous perdrez la remise associée.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if(deletingItem) {
                      onRemove(deletingItem.id, deletingItem.store, deletingItem.city, deletingItem.packId);
                      setDeletingItem(null);
                    }
                  }} 
                  className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-amber-600 transition-all"
                >
                  Je comprends, tout retirer
                </button>
                <button onClick={() => setDeletingItem(null)} className="w-full py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Garder le pack</button>
              </div>
           </div>
        </AdminModal>
      ) : (
        <DeleteConfirmation 
          isOpen={!!deletingItem} 
          onCancel={() => setDeletingItem(null)} 
          onConfirm={() => {
            if(deletingItem) {
              onRemove(deletingItem.id, deletingItem.store, deletingItem.city);
              setDeletingItem(null);
            }
          }} 
        />
      )}
    </div>
  );
};
