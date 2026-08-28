
import React from 'react';
import { Language } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

interface LegalViewProps {
  type: 'notice' | 'privacy';
  language: Language;
  onClose: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ type, language, onClose }) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const content = {
    notice: {
      title: t.legalNotice,
      text: language === 'fr' ? `
        <h3>1. Éditeur du Site</h3>
        <p>Le site Qayess est édité par l'agence Qayess Data Intelligence, immatriculée au Registre du Commerce de Casablanca sous le numéro RC-123456.</p>
        
        <h3>2. Hébergement</h3>
        <p>Ce site est hébergé sur des infrastructures cloud hautement sécurisées conformes aux standards internationaux.</p>
        
        <h3>3. Propriété Intellectuelle</h3>
        <p>L'ensemble des contenus (logos, textes, algorithmes de comparaison) sont la propriété exclusive de Qayess. Toute reproduction est interdite sans accord préalable.</p>
        
        <h3>4. Limitation de Responsabilité</h3>
        <p>Qayess s'efforce de fournir des prix à jour. Toutefois, les prix réels en magasin peuvent varier. Qayess ne peut être tenu responsable des écarts constatés sur le terrain.</p>
      ` : `Detailed legal information for ${language} version...`
    },
    privacy: {
      title: t.privacyPolicy,
      text: language === 'fr' ? `
        <h3>1. Collecte des Données</h3>
        <p>Nous collectons votre email et vos préférences d'achat pour optimiser vos roadmaps et vous proposer les meilleures offres.</p>
        
        <h3>2. Utilisation des Données</h3>
        <p>Vos données ne sont jamais vendues à des tiers. Elles servent uniquement à améliorer l'intelligence de l'application Qayess.</p>
        
        <h3>3. Cookies</h3>
        <p>Nous utilisons des cookies techniques et publicitaires (Google AdSense) pour assurer le bon fonctionnement du site et sa gratuité.</p>
        
        <h3>4. Vos Droits</h3>
        <p>Conformément à la loi marocaine 09-08 (CNDP), vous disposez d'un droit d'accès, de rectification et d'opposition au traitement de vos données personnelles depuis votre profil.</p>
      ` : `Detailed privacy information for ${language} version...`
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl mx-auto pb-20">
      <header className={`flex items-center justify-between bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-lg">
              <Icons.Shield />
           </div>
           <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-3xl font-black text-slate-900">{type === 'notice' ? content.notice.title : content.privacy.title}</h2>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.3em] mt-1">Protection & Transparence</p>
           </div>
        </div>
        <button onClick={onClose} className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-200">
           <Icons.Minus />
        </button>
      </header>

      <article className={`bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm prose prose-slate max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
         <div 
           className="legal-content text-slate-600 leading-relaxed space-y-8"
           dangerouslySetInnerHTML={{ __html: type === 'notice' ? content.notice.text : content.privacy.text }}
         />
      </article>
      
      <style>{`
        .legal-content h3 { font-weight: 900; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: #1e293b; margin-top: 2rem; }
        .legal-content p { font-size: 0.875rem; margin-top: 0.5rem; }
      `}</style>
    </div>
  );
};
