
import React, { useState, useMemo } from 'react';
import { Product, PlatformConfig, User, Order, Pack, Language, AuditLog, Store, PromoCode, SubscriptionTier, Brand, PriceReport } from '../types';
import { Icons } from '../constants';
import { ProductModule } from './AdminProductModule';
import { UserCRMModule } from './AdminUserModule';
import { StoreModule } from './AdminStoreModule';
import { PackModule } from './AdminPackModule';
import { PromoModule } from './AdminPromoModule';
import { SubscriptionModule } from './AdminSubscriptionModule';
import { BrandModule } from './AdminBrandModule';
import { AdminReportsModule } from './AdminReportsModule';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  packs: Pack[];
  users: User[];
  orders: Order[];
  stores: Store[];
  promoCodes: PromoCode[];
  brands: Brand[];
  priceReports: PriceReport[];
  auditLogs: AuditLog[];
  config: PlatformConfig;
  language: Language;
  onUpdateProducts: (products: Product[]) => void;
  onUpdatePacks: (packs: Pack[]) => void;
  onUpdateUsers: (users: User[]) => void;
  onUpdateStores: (stores: Store[]) => void;
  onUpdatePromoCodes: (codes: PromoCode[]) => void;
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdatePriceReports: (reports: PriceReport[]) => void;
  onUpdateConfig: (config: PlatformConfig) => void;
  onAddLog: (action: string, details: string, type?: AuditLog['type']) => void;
  currentUserEmail?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  isOpen, onClose, products, packs, users, orders, stores, promoCodes, brands, priceReports, auditLogs, config, language, onUpdateProducts, onUpdatePacks, onUpdateUsers, onUpdateStores, onUpdatePromoCodes, onUpdateBrands, onUpdatePriceReports, onAddLog, onUpdateConfig, currentUserEmail
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'users' | 'stores' | 'brands' | 'campaigns' | 'promo' | 'subs' | 'reports' | 'audit'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const statsCalculations = useMemo(() => {
    const totalVolume = orders.reduce((s, o) => s + o.total, 0);
    const activeUserCount = new Set(orders.map(o => o.userId)).size;
    const globalConversion = users.length > 0 ? (activeUserCount / users.length) * 100 : 0;

    const productCounts: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(item => {
      productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
    }));
    
    const popularProds = Object.entries(productCounts)
      .map(([id, count]) => ({
        product: products.find(p => p.id === id),
        count
      }))
      .filter(item => item.product)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const tierConversion = (Object.keys(config.tiers) as SubscriptionTier[]).map(tier => {
      const usersInTier = users.filter(u => u.tier === tier);
      const activeInTier = usersInTier.filter(u => orders.some(o => o.userId === u.id)).length;
      const rate = usersInTier.length > 0 ? (activeInTier / usersInTier.length) * 100 : 0;
      return { tier, rate, count: usersInTier.length };
    });

    return { totalVolume, activeUserCount, globalConversion, popularProds, tierConversion };
  }, [orders, users, products, config.tiers]);

  const stats = useMemo(() => [
    { label: 'Utilisateurs Totaux', value: users.length, icon: <Icons.Lightning />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Membres Actifs', value: statsCalculations.activeUserCount, icon: <Icons.Check />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Volume d\'Affaires', value: `${statsCalculations.totalVolume.toFixed(0)} DH`, icon: <Icons.Stats />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Taux Conversion', value: `${statsCalculations.globalConversion.toFixed(1)}%`, icon: <Icons.Magic />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ], [users, statsCalculations]);

  const pendingReportsCount = useMemo(() => priceReports.filter(r => r.status === 'pending').length, [priceReports]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1400] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden font-sans">
      <header className="bg-white border-b border-slate-200 px-10 py-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-slate-900 rounded-2xl"><Icons.Logo /></div>
          <div><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Qayess Control Tower</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Console de Pilotage 3.0</p></div>
        </div>
        <button onClick={onClose} className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><Icons.Minus /></button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-white border-r border-slate-200 p-4 space-y-2 overflow-y-auto no-scrollbar transition-all duration-300 shrink-0 relative`}>
           <button onClick={() => setSidebarCollapsed(c => !c)} className="w-full mb-4 flex items-center justify-center py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title={sidebarCollapsed ? 'Déplier' : 'Rabattre'}>
              <span className={`text-lg font-black transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}>⌄</span>
           </button>
           {[
             { id: 'overview', label: 'Vue d\'ensemble', icon: <Icons.Stats /> },
             { id: 'reports', label: 'Signalements', icon: <Icons.Bell />, badge: pendingReportsCount },
             { id: 'products', label: 'Catalogue Maître', icon: <Icons.Box /> },
             { id: 'brands', label: 'Marques', icon: <Icons.Magic /> },
             { id: 'users', label: 'CRM Membres', icon: <Icons.Lightning /> },
             { id: 'stores', label: 'Enseignes', icon: <Icons.Tag /> },
             { id: 'campaigns', label: 'Packs Promo', icon: <Icons.Magic /> },
             { id: 'promo', label: 'Codes Coupons', icon: <Icons.Tag /> },
             { id: 'subs', label: 'Abonnements', icon: <Icons.Lightning /> },
             { id: 'audit', label: 'Audit Log', icon: <Icons.Heart /> },
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} title={sidebarCollapsed ? tab.label : undefined} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                <div className={`flex items-center gap-4 ${sidebarCollapsed ? 'gap-0' : ''}`}>
                  {tab.icon} {!sidebarCollapsed && tab.label}
                </div>
                {!sidebarCollapsed && tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-rose-500 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg animate-pulse">{tab.badge}</span>
                )}
             </button>
           ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-12 bg-slate-50/30 no-scrollbar relative">
           {activeTab === 'overview' && (
             <div className="space-y-10 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                   {stats.map((s, i) => (
                     <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-4`}>{s.icon}</div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{s.label}</p>
                        <p className="text-2xl font-black text-slate-900">{s.value}</p>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Conversion par Palier</h3>
                      <Icons.Lightning className="text-amber-500" />
                    </div>
                    <div className="space-y-8 flex-1 flex flex-col justify-center">
                      {statsCalculations.tierConversion.map(tc => (
                        <div key={tc.tier} className="space-y-3">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{config.tiers[tc.tier as SubscriptionTier].label}</span>
                              <span className="text-sm font-black text-slate-900">{tc.rate.toFixed(1)}%</span>
                           </div>
                           <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${tc.tier === 'unlimited' ? 'bg-slate-900' : tc.tier === 'pack2' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${tc.rate}%` }}
                              />
                           </div>
                           <p className="text-[8px] font-bold text-slate-400 uppercase">{tc.count} membres inscrits</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Top 5 Produits (Ventes)</h3>
                      <Icons.Box className="text-blue-500" />
                    </div>
                    <div className="space-y-4">
                      {statsCalculations.popularProds.length === 0 ? (
                        <div className="py-20 text-center opacity-30"><p className="text-xs font-black uppercase">Aucune vente enregistrée</p></div>
                      ) : (
                        statsCalculations.popularProds.map((item, idx) => (
                          <div key={item.product?.id} className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-emerald-200 transition-all">
                             <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">{idx + 1}</div>
                             <img src={item.product?.image} className="w-10 h-10 object-contain mix-blend-multiply" alt="" />
                             <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.product?.name}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase">{item.product?.brand}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-emerald-600">{item.count}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Unités</p>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'reports' && (
             <AdminReportsModule 
               reports={priceReports} 
               onUpdateReports={onUpdatePriceReports}
               products={products}
               onAddLog={onAddLog}
             />
           )}

           {activeTab === 'products' && (
              <ProductModule 
                products={products} 
                brands={brands}
                onSave={(p) => {
                  const exists = products.find(old => old.id === p.id);
                  onUpdateProducts(exists ? products.map(old => old.id === p.id ? p : old) : [...products, p]);
                  onAddLog(exists ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', `Produit : ${p.name}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                  onUpdateProducts(products.map(p => p.id === id ? { ...p, isDeleted: true } : p));
                  onAddLog('PRODUCT_DELETE', `Archivage produit ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'brands' && (
              <BrandModule 
                brands={brands}
                onSave={(b) => {
                   const exists = brands.find(old => old.id === b.id);
                   onUpdateBrands(exists ? brands.map(old => old.id === b.id ? b : old) : [...brands, b]);
                   onAddLog(exists ? 'BRAND_UPDATE' : 'BRAND_CREATE', `Marque : ${b.name}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                   onUpdateBrands(brands.map(b => b.id === id ? { ...b, isDeleted: true } : b));
                   onAddLog('BRAND_DELETE', `Archivage marque ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'users' && (
              <UserCRMModule 
                users={users} 
                onSave={(u) => {
                  const exists = users.find(old => old.id === u.id);
                  onUpdateUsers(exists ? users.map(old => old.id === u.id ? u : old) : [...users, u]);
                  onAddLog(exists ? 'USER_UPDATE' : 'USER_CREATE', `Action sur : ${u.email}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                  onUpdateUsers(users.map(u => u.id === id ? { ...u, isDeleted: true } : u));
                  onAddLog('USER_DELETE', `Archivage membre ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'stores' && (
              <StoreModule 
                stores={stores}
                onSave={(s) => {
                  const exists = stores.find(old => old.id === s.id);
                  onUpdateStores(exists ? stores.map(old => old.id === s.id ? s : old) : [...stores, s]);
                  onAddLog(exists ? 'STORE_UPDATE' : 'STORE_CREATE', `Enseigne : ${s.name}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                  onUpdateStores(stores.map(s => s.id === id ? { ...s, isDeleted: true } : s));
                  onAddLog('STORE_DELETE', `Archivage enseigne ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'campaigns' && (
              <PackModule 
                packs={packs}
                products={products}
                onSave={(p) => {
                  const exists = packs.find(old => old.id === p.id);
                  onUpdatePacks(exists ? packs.map(old => old.id === p.id ? p : old) : [...packs, p]);
                  onAddLog(exists ? 'PACK_UPDATE' : 'PACK_CREATE', `Campagne : ${p.name}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                  onUpdatePacks(packs.map(p => p.id === id ? { ...p, isDeleted: true } : p));
                  onAddLog('PACK_DELETE', `Archivage pack ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'promo' && (
              <PromoModule 
                promoCodes={promoCodes}
                onSave={(p) => {
                  const exists = promoCodes.find(old => old.id === p.id);
                  onUpdatePromoCodes(exists ? promoCodes.map(old => old.id === p.id ? p : old) : [...promoCodes, p]);
                  onAddLog(exists ? 'PROMO_UPDATE' : 'PROMO_CREATE', `Code Promo : ${p.code}`, exists ? 'info' : 'success');
                }}
                onDelete={(id) => {
                  onUpdatePromoCodes(promoCodes.map(p => p.id === id ? { ...p, isDeleted: true } : p));
                  onAddLog('PROMO_DELETE', `Archivage code ID: ${id}`, 'danger');
                }}
              />
           )}

           {activeTab === 'subs' && (
              <SubscriptionModule 
                config={config}
                onUpdateConfig={(newConfig) => {
                  onUpdateConfig(newConfig);
                  onAddLog('CONFIG_UPDATE', 'Mise à jour des paliers d\'abonnement', 'info');
                }}
              />
           )}

           {activeTab === 'audit' && (
              <div className="space-y-8 animate-in fade-in">
                 <h3 className="text-xl font-black text-slate-900 uppercase">Journal d'Audit Complet</h3>
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                          <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Action</th><th className="px-8 py-5">Détails</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {auditLogs.map(log => (
                             <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-8 py-5"><span className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase border border-slate-200">{log.action}</span></td>
                                <td className="px-8 py-5 text-xs text-slate-600 font-medium">{log.details}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
           
        </main>
      </div>
    </div>
  );
};
