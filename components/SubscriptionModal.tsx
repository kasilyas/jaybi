
import React from 'react';
import { Icons, TRANSLATIONS } from '../constants';
import { Language, PlatformConfig } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  language: Language;
  config: PlatformConfig;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSubscribe, language, config }) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  if (!isOpen) return null;

  // Par défaut, on affiche le pack recommandé ou le pack Premium (pack2)
  const premiumTier = config.tiers.pack2;

  return (
    <div className={`fixed inset-0 z-[1200] flex items-center justify-center p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-amber-200 rounded-[3rem] p-12 shadow-4xl animate-in zoom-in-95 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
        
        <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-10">
           <Icons.Lightning className="text-white scale-125" />
        </div>

        <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">
             {premiumTier.label}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {language === 'ar' 
              ? `لمقارنة أكثر من ${config.tiers.free.limit} منتجات وفتح جميع الميزات، انضم إلى باقة بريميوم.` 
              : `Pour comparer plus de ${config.tiers.free.limit} produits et débloquer les alertes de prix en temps réel, rejoignez le club Premium.`}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 mb-10">
           <div className={`flex items-baseline gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-4xl font-black text-slate-900">{premiumTier.price}</span>
              <span className="text-xl font-bold text-slate-400">DH/mois</span>
           </div>
           <ul className="space-y-4">
              {premiumTier.features.map((text, i) => (
                <li key={i} className="flex items-center gap-4 text-[11px] font-black text-slate-600 uppercase tracking-wide">
                   <div className="text-amber-500"><Icons.Check /></div>
                   {text}
                </li>
              ))}
              <li className="flex items-center gap-4 text-[11px] font-black text-emerald-600 uppercase tracking-wide">
                 <div className="text-emerald-500"><Icons.Check /></div>
                 Limite : {premiumTier.limit} articles
              </li>
           </ul>
        </div>

        <button 
          onClick={onSubscribe}
          className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4"
        >
          {language === 'ar' ? 'اشترك الآن' : 'S\'abonner maintenant'}
          <Icons.ChevronRight />
        </button>
        
        <button onClick={onClose} className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
          Peut-être plus tard
        </button>
      </div>
    </div>
  );
};
