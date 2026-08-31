
import React, { useState, useMemo } from 'react';
import { User, Order, Language, Product } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

interface UserProfileModuleProps {
  user: User;
  orders: Order[];
  savedIds: string[];
  products: Product[];
  language: Language;
  onUpdateUser: (userData: Partial<User>) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  onClose: () => void;
  onViewOrder?: (order: Order) => void;
}

type PasswordStep = 'idle' | 'editing' | 'verifying' | 'success';

export const UserProfileModule: React.FC<UserProfileModuleProps> = ({
  user, orders, savedIds, products, language, onUpdateUser, onDeleteAccount, onLogout, onClose, onViewOrder
}) => {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';
  const [collapsed, setCollapsed] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email
  });

  const [isEditing, setIsEditing] = useState(false);
  
  // Password Modification State
  const [pwdStep, setPwdStep] = useState<PasswordStep>('idle');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Statistiques Personnelles & Historique
  const { stats, history } = useMemo(() => {
    const userOrders = orders.filter(o => o.userId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Calcul de la marque préférée
    const brandCounts: Record<string, number> = {};
    userOrders.forEach(o => {
      o.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          brandCounts[prod.brand] = (brandCounts[prod.brand] || 0) + item.quantity;
        }
      });
    });
    const favBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      stats: {
        orderCount: userOrders.length,
        savings: user.savingsScore,
        favBrand,
        savedCount: savedIds.length
      },
      history: userOrders
    };
  }, [user, orders, savedIds, products]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(formData);
    setIsEditing(false);
  };

  const startPasswordChange = () => {
    setPwdStep('editing');
    setPwdError('');
  };

  const requestVerificationCode = () => {
    if (newPwd !== confirmPwd) {
      setPwdError(isRTL ? 'كلمات المرور غير متطابقة' : 'Les mots de passe ne correspondent pas');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError(isRTL ? 'كلمة المرور قصيرة جداً' : 'Mot de passe trop court (min 6)');
      return;
    }

    // Simulate sending code
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(mockCode);
    console.log("DEBUG: Verification code sent to email:", mockCode);
    setPwdStep('verifying');
    setPwdError('');
  };

  const handleVerifyAndChange = () => {
    if (verifyCode === sentCode) {
      setPwdStep('success');
      setTimeout(() => {
        setPwdStep('idle');
        setNewPwd('');
        setConfirmPwd('');
        setVerifyCode('');
      }, 3000);
    } else {
      setPwdError(isRTL ? 'رمز غير صالح' : 'Code invalide');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-20">
      <header className={`flex items-center justify-between bg-white p-6 rounded-[3rem] border border-slate-200 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-white shadow-lg ${user.role === 'admin' ? 'bg-black' : user.isPremium ? 'bg-amber-500' : 'bg-emerald-600'}`}>
              {user.name[0]}
           </div>
           <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-2xl font-black text-slate-900">{user.name}</h2>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.3em] mt-1">{user.role} • {user.tier}</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setCollapsed(c => !c)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all border border-slate-200" title={collapsed ? (isRTL ? 'توسيع' : 'Déplier') : (isRTL ? 'طي' : 'Rabattre')}>
              <span className={`text-xl font-black transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>⌄</span>
           </button>
           <button onClick={onClose} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200" title={isRTL ? 'إغلاق' : 'Fermer'}>
              ✕
           </button>
        </div>
      </header>

      {collapsed ? (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? 'الملف مطوي — انقر على ⌄ لتوسيعه' : 'Profil rabattu — cliquez sur ⌄ pour déplier'}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche : Infos & Sécurité */}
        <section className="lg:col-span-1 space-y-6">
           {/* Bloc Infos */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase mb-6 flex items-center gap-3">
                 <Icons.User className="text-emerald-500" />
                 {t.personalInfo}
              </h3>

              {!isEditing ? (
                <div className="space-y-4">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nom</p>
                      <p className="text-sm font-bold text-slate-700">{user.name}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm font-bold text-slate-700">{user.email}</p>
                   </div>
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="w-full mt-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all"
                   >
                      Modifier mes infos
                   </button>
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-4">
                   <input 
                     value={formData.name} 
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                     placeholder="Nom"
                   />
                   <input 
                     value={formData.email} 
                     onChange={e => setFormData({...formData, email: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                     placeholder="Email"
                   />
                   <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Sauver</button>
                      <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase">Annuler</button>
                   </div>
                </form>
              )}
           </div>

           {/* Bloc Sécurité / Mot de passe */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
              <h3 className="text-lg font-black text-slate-900 uppercase mb-6 flex items-center gap-3">
                 <Icons.Lock className="text-amber-500" />
                 Sécurité
              </h3>

              {pwdStep === 'idle' && (
                <button 
                  onClick={startPasswordChange}
                  className="w-full py-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-black uppercase text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                >
                  <Icons.Edit className="scale-75" />
                  {t.changePassword}
                </button>
              )}

              {pwdStep === 'editing' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                   <input 
                     type="password"
                     value={newPwd} 
                     onChange={e => setNewPwd(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                     placeholder={t.newPassword}
                   />
                   <input 
                     type="password"
                     value={confirmPwd} 
                     onChange={e => setConfirmPwd(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                     placeholder={t.confirmPassword}
                   />
                   {pwdError && <p className="text-[9px] font-black text-rose-500 uppercase">{pwdError}</p>}
                   <div className="flex gap-2">
                      <button 
                        onClick={requestVerificationCode}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase"
                      >
                        {t.sendCode}
                      </button>
                      <button 
                        onClick={() => setPwdStep('idle')}
                        className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase"
                      >
                        {isRTL ? 'إلغاء' : 'Annuler'}
                      </button>
                   </div>
                </div>
              )}

              {pwdStep === 'verifying' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                   <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-relaxed">
                        {t.codeSentTo} <br/> 
                        <span className="text-emerald-700 lowercase">{user.email}</span>
                      </p>
                   </div>
                   <input 
                     type="text"
                     maxLength={6}
                     value={verifyCode} 
                     onChange={e => setVerifyCode(e.target.value)}
                     className="w-full bg-white border-2 border-slate-900 rounded-xl py-4 px-6 font-black text-2xl tracking-[0.5em] text-center outline-none"
                     placeholder="—— ——"
                   />
                   {pwdError && <p className="text-[9px] font-black text-rose-500 uppercase text-center">{pwdError}</p>}
                   <button 
                     onClick={handleVerifyAndChange}
                     className="w-full py-4 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20"
                   >
                     {t.verifyAndChange}
                   </button>
                </div>
              )}

              {pwdStep === 'success' && (
                <div className="text-center py-6 animate-in zoom-in-95">
                   <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icons.Check />
                   </div>
                   <p className="text-[10px] font-black text-emerald-600 uppercase leading-relaxed px-4">
                      {t.passwordChanged}
                   </p>
                </div>
              )}
           </div>

           <button
             onClick={onLogout}
             className="w-full p-6 bg-slate-50 border border-slate-200 text-slate-700 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3"
           >
              {t.logout}
           </button>

           <button
             onClick={onDeleteAccount}
             className="w-full p-6 bg-rose-50 border border-rose-100 text-rose-500 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3"
           >
              <Icons.Trash className="scale-75" />
              {t.deleteAccount}
           </button>
        </section>

        {/* Colonne Droite : Statistiques et Historique */}
        <section className="lg:col-span-2 space-y-8">
           
           {/* STATS CARDS */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase mb-10 flex items-center gap-4">
                 <Icons.Stats className="text-amber-500" />
                 {t.personalStats}
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-inner group relative overflow-hidden">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">{t.totalSavings}</p>
                    <p className="text-2xl font-black text-emerald-700 flex items-baseline gap-1">
                       {stats.savings} <span className="text-[10px]">DH</span>
                    </p>
                    <Icons.Magic className="text-emerald-200 absolute right-4 top-4 scale-125 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 
                 <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-inner">
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2">Commandes</p>
                    <p className="text-2xl font-black text-blue-700">{stats.orderCount}</p>
                 </div>

                 <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 shadow-inner">
                    <p className="text-[9px] font-black text-amber-600 uppercase mb-2">{t.favoriteBrand}</p>
                    <p className="text-xl font-black text-amber-700 truncate">{stats.favBrand}</p>
                 </div>

                 <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-inner">
                    <p className="text-[9px] font-black text-rose-600 uppercase mb-2">{t.itemsSaved}</p>
                    <p className="text-2xl font-black text-rose-700">{stats.savedCount}</p>
                 </div>
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between">
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest">Membre {user.tier.toUpperCase()}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                       {user.isPremium ? "Moteur IA Illimité activé" : "Passez en Premium pour plus d'économies"}
                    </p>
                 </div>
                 <Icons.Logo className="scale-100" />
              </div>
           </div>

           {/* HISTORY LIST */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase mb-8 flex items-center gap-4">
                 <Icons.History className="text-blue-500" />
                 {language === 'ar' ? 'سجل الطلبات' : 'Historique des Activités'}
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                   <Icons.Box className="mx-auto mb-4 scale-150 text-slate-300" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {history.map(order => (
                     <div key={order.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${order.mode === 'delivery' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                              {order.mode === 'delivery' ? <Icons.Box /> : <Icons.Lightning />}
                           </div>
                           <div>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                 {order.mode === 'delivery' ? (language === 'ar' ? 'توصيل' : 'Livraison') : (language === 'ar' ? 'مسار' : 'Roadmap')}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{order.createdAt} • {order.items.length} articles</p>
                           </div>
                        </div>
                        
                        <div className="text-right flex items-center gap-6">
                           <div>
                              <p className="text-lg font-black text-slate-900">{order.total.toFixed(2)} <span className="text-[9px]">DH</span></p>
                              <span className={`inline-block px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                                order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                              }`}>
                                 {order.status}
                              </span>
                           </div>
                           <button 
                             onClick={() => onViewOrder?.(order)}
                             className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:shadow-md transition-all"
                           >
                              <Icons.ChevronRight />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>

        </section>
      </div>
      )}
    </div>
  );
};
