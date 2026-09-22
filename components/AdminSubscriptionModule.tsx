
import React, { useEffect, useRef, useState } from 'react';
import { PlatformConfig, SubscriptionTier, TierMetadata } from '../types';
import { Icons } from '../constants';

interface AdminSubscriptionModuleProps {
  config: PlatformConfig;
  onUpdateConfig: (config: PlatformConfig) => Promise<void>;
}

export const SubscriptionModule: React.FC<AdminSubscriptionModuleProps> = ({ config: savedConfig, onUpdateConfig }) => {
  const [config, setConfig] = useState(savedConfig);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);

  useEffect(() => { setConfig(savedConfig); }, [savedConfig]);

  const updateDraft = (nextConfig: PlatformConfig) => {
    setConfig(nextConfig);
    setSaved(false);
    setSaveError(null);
  };

  const saveConfig = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await onUpdateConfig({ ...config, comparisonEnabled: config.comparisonEnabled === true });
      setSaved(true);
    } catch {
      setSaveError('Enregistrement impossible. La configuration active reste inchangée. Veuillez réessayer.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const updateTier = (tier: SubscriptionTier, data: Partial<TierMetadata>) => {
    updateDraft({
      ...config,
      tiers: {
        ...config.tiers,
        [tier]: { ...config.tiers[tier], ...data }
      }
    });
  };

  const handleFeatureChange = (tier: SubscriptionTier, index: number, value: string) => {
    const newFeatures = [...config.tiers[tier].features];
    newFeatures[index] = value;
    updateTier(tier, { features: newFeatures });
  };

  const addFeature = (tier: SubscriptionTier) => {
    updateTier(tier, { features: [...config.tiers[tier].features, "Nouvel avantage"] });
  };

  const removeFeature = (tier: SubscriptionTier, index: number) => {
    updateTier(tier, { features: config.tiers[tier].features.filter((_, i) => i !== index) });
  };

  return (
    <fieldset disabled={saving} aria-busy={saving} className="space-y-10 animate-in fade-in min-w-0">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Comparaison de produits</h3>
          <p className="text-sm text-slate-500 mt-2">Active le comparateur explicite. Les prix du catalogue restent accessibles.</p>
          <p className="text-sm font-bold mt-2">État enregistré : {savedConfig.comparisonEnabled === true ? 'Activée' : 'Désactivée'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.comparisonEnabled === true}
          aria-label="Activer la comparaison de produits"
          onClick={() => updateDraft({ ...config, comparisonEnabled: config.comparisonEnabled !== true })}
          className={`px-5 py-3 rounded-xl font-bold transition-all ${config.comparisonEnabled === true ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
          {config.comparisonEnabled === true ? 'Activée' : 'Désactivée'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => void saveConfig()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
        </button>
        {saveError && <p role="alert" className="text-sm font-bold text-rose-600">{saveError}</p>}
        {saved && <p role="status" className="text-sm font-bold text-emerald-600">Configuration enregistrée.</p>}
      </div>
      <div className="flex justify-between items-center">
        <div><h3 className="text-xl font-black text-slate-900 uppercase">Maintenance de la plateforme</h3><p className="text-sm text-slate-500 mt-2">Bloque les parcours publics. Les administrateurs conservent l’accès pour rétablir le service.</p></div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100">
           <span className="text-[10px] font-black uppercase text-slate-400 px-3">{config.activeMaintenance ? 'Active' : 'Inactive'}</span>
           <button 
             onClick={() => updateDraft({...config, activeMaintenance: !config.activeMaintenance})}
             className={`w-12 h-6 rounded-full transition-all relative ${config.activeMaintenance ? 'bg-rose-500' : 'bg-slate-200'}`}
           >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.activeMaintenance ? 'right-1' : 'left-1'}`} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {(Object.keys(config.tiers) as SubscriptionTier[]).map(tierKey => {
          const tier = config.tiers[tierKey];
          return (
            <div key={tierKey} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all ${tier.isRecommended ? 'border-amber-400 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                   <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase rounded-lg mb-2 inline-block tracking-widest">{tierKey}</span>
                   <input 
                     value={tier.label} 
                     onChange={e => updateTier(tierKey, { label: e.target.value })}
                     className="text-2xl font-black text-slate-900 block bg-transparent border-none outline-none focus:ring-0 w-full" 
                   />
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-1 justify-end">
                      <input 
                        type="number" 
                        value={tier.price} 
                        onChange={e => updateTier(tierKey, { price: Number(e.target.value) })}
                        className="w-20 text-xl font-black text-slate-900 bg-slate-50 rounded-lg px-2 py-1 text-right" 
                      />
                      <span className="text-[10px] font-black text-slate-400">DH</span>
                   </div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Par mois</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-3">Quota Articles Panier</label>
                   <input 
                     type="number" 
                     value={tier.limit} 
                     onChange={e => updateTier(tierKey, { limit: Number(e.target.value) })}
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 font-black text-slate-900" 
                   />
                </div>

                <div>
                   <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Avantages inclus</label>
                      <button onClick={() => addFeature(tierKey)} className="text-[8px] font-black text-emerald-600 uppercase hover:underline">+ Ajouter</button>
                   </div>
                   <div className="space-y-2">
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex gap-2 group">
                           <div className="flex-1 relative">
                              <Icons.Check className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 scale-75" />
                              <input 
                                value={feat} 
                                onChange={e => handleFeatureChange(tierKey, idx, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-[10px] font-medium text-slate-600"
                              />
                           </div>
                           <button onClick={() => removeFeature(tierKey, idx)} className="p-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100">
                              <Icons.Minus className="scale-75" />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="pt-4 flex items-center gap-3">
                   <button 
                     onClick={() => updateTier(tierKey, { isRecommended: !tier.isRecommended })}
                     className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${tier.isRecommended ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                   >
                     {tier.isRecommended ? '⭐ Mis en avant' : 'Mettre en avant'}
                   </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};
