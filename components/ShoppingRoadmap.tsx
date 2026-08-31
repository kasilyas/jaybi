
import React, { useState, useMemo } from 'react';
import { Product, CartItem, StoreName, Language } from '../types';
import { Icons, STORES, TRANSLATIONS } from '../constants';

interface ShoppingRoadmapProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  language: Language;
  onReportPrice?: (productId: string, store: string, city: string, reportedPrice: number, comment?: string) => void;
  onItemUnavailable?: (productId: string, store: string, city: string) => void;
}

export const ShoppingRoadmap: React.FC<ShoppingRoadmapProps> = ({ 
  isOpen, onClose, cart, products, language, onReportPrice, onItemUnavailable 
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [unavailableItems, setUnavailableItems] = useState<Set<string>>(new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [tempComment, setTempComment] = useState<string>('');
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  // D14 : géolocalisation pour le mode GPS courses
  const handleLocate = () => {
    if (!navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const roadmapData = useMemo(() => {
    const data = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      let targetStore = item.store;
      let targetCity = item.city;

      if (!targetStore || !targetCity) {
        const best = [...product.prices].sort((a, b) => a.price - b.price)[0];
        targetStore = best.store;
        targetCity = best.city;
      }

      const currentPriceEntry = product.prices.find(p => p.store === targetStore && p.city === targetCity)!;
      return { ...item, product, targetStore, targetCity, currentPrice: currentPriceEntry?.price || 0 };
    });

    const groups: Record<string, typeof data> = {};
    data.forEach(item => {
      const key = `${item.targetStore} - ${item.targetCity}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [cart, products]);

  const toggleCheck = (id: string, groupKey: string) => {
    const key = `${groupKey}-${id}`;
    if (unavailableItems.has(key)) return;
    const next = new Set(checkedItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCheckedItems(next);
  };

  const markUnavailable = (e: React.MouseEvent, id: string, groupKey: string, store: string, city: string) => {
    e.stopPropagation();
    const key = `${groupKey}-${id}`;
    const next = new Set(unavailableItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      const checked = new Set(checkedItems);
      checked.delete(key);
      setCheckedItems(checked);
      onItemUnavailable?.(id, store, city);
    }
    setUnavailableItems(next);
  };

  const handleReport = (e: React.FormEvent, id: string, store: string, city: string, uniqueKey: string) => {
    e.preventDefault();
    const price = parseFloat(tempPrice);
    if (!isNaN(price)) {
      onReportPrice?.(id, store, city, price, tempComment);
      
      setSubmittedIds(prev => new Set(prev).add(uniqueKey));
      setReportingId(null);
      setTempPrice('');
      setTempComment('');

      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSubmittedIds(prev => {
          const n = new Set(prev);
          n.delete(uniqueKey);
          return n;
        });
      }, 3000);
    }
  };

  const handleShare = async () => {
    let text = "🛒 Ma Roadmap Qayess\n\n";
    Object.entries(roadmapData).forEach(([groupKey, itemsVal]) => {
      const items = itemsVal as any[];
      text += `📍 ${groupKey}\n`;
      items.forEach(item => {
        text += `- [ ] ${item.product.name} (${item.quantity})\n`;
      });
      text += "\n";
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma Roadmap Qayess',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Liste copiée dans le presse-papier !');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[1000] bg-slate-50 overflow-y-auto animate-in slide-in-from-bottom duration-500 print:absolute print:inset-auto print:bg-white print:overflow-visible ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Styles d'impression spécifiques */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #roadmap-container, #roadmap-container * {
            visibility: visible;
          }
          #roadmap-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
          .print-hidden {
            display: none !important;
          }
          .print-no-shadow {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
        }
      `}</style>

      <div id="roadmap-container" className="min-h-screen bg-slate-50 print:bg-white">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-6 shadow-sm print:static print:shadow-none print:border-b-2 print:border-black">
          <div className={`max-w-4xl mx-auto flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
             <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-2xl font-black text-slate-900">{t.roadmap}</h2>
                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2 print:text-black">
                  <Icons.Lightning className="scale-75 print:hidden"/> Intelligence Terrain Active
                </p>
             </div>
             <div className="flex items-center gap-3">
               <button onClick={handleLocate} className={`h-11 px-3 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all print-hidden ${geoStatus === 'ok' ? 'bg-emerald-500 text-white' : geoStatus === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="GPS">
                 <Icons.Lightning className="scale-75" />
                 {geoStatus === 'loading' ? '...' : geoStatus === 'ok' ? 'GPS' : geoStatus === 'error' ? 'GPS?' : 'GPS'}
               </button>
               <button onClick={handleShare} className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all print-hidden" title={t.share}>
                  <Icons.Share />
               </button>
               <button onClick={handlePrint} className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all print-hidden" title={t.print}>
                  <Icons.Printer />
               </button>
               <button onClick={onClose} className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl print-hidden">
                  {language === 'ar' ? 'إغلاق' : 'Fermer'}
               </button>
             </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-40 space-y-10 print:pb-0 print:pt-4">
          {Object.keys(roadmapData).length === 0 ? (
            <div className="text-center py-20 opacity-40">
               <p className="font-black uppercase tracking-widest text-sm">{t.emptyCart}</p>
            </div>
          ) : (
            Object.entries(roadmapData).map(([groupKey, itemsVal]) => {
              const items = itemsVal as any[];
              const [storeName, city] = groupKey.split(' - ');
              return (
                <section key={groupKey} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm print-no-shadow print:rounded-none print:border-0 print:border-b print:border-slate-300 print:mb-4 print:p-0">
                   <div className={`flex items-start gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="shrink-0 w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center p-3 print-hidden">
                         <img src={STORES[storeName.trim() as StoreName]?.logo} className="h-full object-contain" alt={storeName} />
                      </div>

                      <div className="flex-1">
                         <div className={`flex items-center justify-between mb-6 pb-4 border-b border-slate-50 ${isRTL ? 'flex-row-reverse' : ''} print:border-none print:mb-2 print:pb-2`}>
                            <div>
                               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{storeName}</h3>
                               <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest print:text-black">📍 {city}</p>
                            </div>
                            <div className={isRTL ? 'text-left' : 'text-right'}>
                               <p className="text-lg font-black text-slate-900" dir="ltr">{items.reduce((s: number, i: any) => s + (i.currentPrice * i.quantity), 0).toFixed(2)} DH</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase">{items.length} articles</p>
                            </div>
                         </div>

                         <div className="space-y-4 print:space-y-2">
                            {items.map((item: any) => {
                              const uniqueKey = `${groupKey}-${item.productId}`;
                              const isChecked = checkedItems.has(uniqueKey);
                              const isUnavailable = unavailableItems.has(uniqueKey);
                              const isSubmitted = submittedIds.has(uniqueKey);
                              
                              return (
                                <div key={item.productId} className="space-y-2">
                                  <div 
                                    onClick={() => toggleCheck(item.productId, groupKey)}
                                    className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center gap-5 ${isChecked ? 'bg-emerald-50 border-emerald-500' : isUnavailable ? 'bg-rose-50 border-rose-100 opacity-60' : 'bg-slate-50 border-slate-100 hover:border-slate-300'} ${isRTL ? 'flex-row-reverse' : ''} print:bg-white print:border-0 print:border-b print:border-dashed print:border-slate-200 print:rounded-none print:p-2`}
                                  >
                                     <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white print:bg-black print:border-black' : isUnavailable ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white print:border-black'}`}>
                                        {isChecked ? <Icons.Check className="scale-75" /> : isUnavailable ? <Icons.Minus className="scale-75" /> : null}
                                     </div>
                                     
                                     <div className="shrink-0 w-12 h-12 bg-white rounded-xl p-2 border border-slate-200 print-hidden">
                                        <img src={item.product.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                                     </div>
                                     
                                     <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <h4 className={`text-xs font-bold text-slate-900 truncate ${isChecked ? 'line-through text-slate-400 font-medium' : isUnavailable ? 'text-rose-400' : ''}`}>
                                          {item.product.name}
                                        </h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mt-0.5" dir="ltr">{item.quantity} × {item.currentPrice.toFixed(2)} DH</p>
                                     </div>

                                     {!isChecked && !isUnavailable && !isSubmitted && (
                                       <div className="flex gap-2 print-hidden">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setReportingId(uniqueKey); setTempPrice(item.currentPrice.toString()); }}
                                            className="p-2.5 min-w-[40px] min-h-[40px] bg-white border border-slate-200 rounded-xl text-amber-500 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm flex items-center justify-center"
                                            title="Signaler erreur prix"
                                          >
                                            <Icons.Tag className="scale-75" />
                                          </button>
                                          <button 
                                            onClick={(e) => markUnavailable(e, item.productId, groupKey, storeName, city)}
                                            className="p-2.5 min-w-[40px] min-h-[40px] bg-white border border-slate-200 rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm flex items-center justify-center"
                                            title="Article indisponible"
                                          >
                                            <Icons.Minus className="scale-75" />
                                          </button>
                                       </div>
                                     )}

                                     {isSubmitted && (
                                       <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 animate-in zoom-in-95 print-hidden">
                                          <Icons.Check className="scale-75" />
                                          {t.reportSent}
                                       </div>
                                     )}
                                  </div>

                                  {reportingId === uniqueKey && (
                                    <form 
                                      onSubmit={(e) => handleReport(e, item.productId, storeName, city, uniqueKey)}
                                      className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] animate-in slide-in-from-top-2 space-y-4 print-hidden"
                                    >
                                      <div className="flex justify-between items-center">
                                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Signalement prix réel au rayon</p>
                                        <button type="button" onClick={() => setReportingId(null)} className="text-amber-400 hover:text-amber-700"><Icons.Minus className="scale-75"/></button>
                                      </div>

                                      <div className="flex gap-3">
                                        <div className="w-24 relative">
                                          <input 
                                            autoFocus
                                            type="number" step="0.01" 
                                            value={tempPrice} 
                                            onChange={e => setTempPrice(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 text-sm font-black text-amber-600 outline-none"
                                          />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-amber-300 uppercase">DH</span>
                                        </div>
                                        <div className="flex-1 relative">
                                          <Icons.MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300 scale-75" />
                                          <input 
                                            type="text"
                                            placeholder={t.addComment}
                                            value={tempComment}
                                            onChange={e => setTempComment(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-xl py-3 pl-10 pr-4 text-[10px] font-bold text-amber-600 outline-none"
                                          />
                                        </div>
                                      </div>
                                      
                                      <button type="submit" className="w-full py-4 bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-amber-600/20 active:scale-[0.98] transition-all">
                                        Envoyer le signalement
                                      </button>
                                    </form>
                                  )}
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   </div>
                </section>
              );
            })
          )}
        </main>
        
        {/* Footer sticky action */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 sm:p-8 bg-white/80 backdrop-blur-md border-t border-slate-200 print-hidden">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
             <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progression</p>
                <p className="text-xl font-black text-slate-900">{checkedItems.size} / {cart.length} collectés</p>
             </div>
             <button 
               onClick={onClose}
               className="px-10 py-4 bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
             >
               {checkedItems.size === cart.length ? 'Finaliser les courses' : 'Quitter la roadmap'}
             </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
