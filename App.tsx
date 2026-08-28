
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Product, StoreName, User, CartItem, Order, Pack, 
  Language, PromoCode, Store, Brand, PriceReport, 
  AuditLog, PlatformConfig
} from './types';
import { TRANSLATIONS, Icons, STORES } from './constants';
import { MOCK_PRODUCTS, MOCK_PACKS, MOCK_USERS, MOCK_ORDERS, MOCK_PROMO_CODES, MOCK_PRICE_REPORTS, MOCK_AUDIT_LOGS } from './data/mockData';
import { parseGroceryList, getSmartSearchSuggestions } from './services/geminiService';
import { addToCart, updateCartQuantity, removeFromCart, cartTotalItems, computeSubtotal, snapshotCartPrices, computeOrderSavings } from './lib/cart';
import { validatePromo } from './lib/promo';
import * as api from './lib/api';

import { ProductBrowserModule } from './components/ProductBrowserModule';
import { PackBrowserModule } from './components/PackBrowserModule';
import { CartDrawer } from './components/CartDrawer';
import { ShoppingRoadmap } from './components/ShoppingRoadmap';
import { AuthModal } from './components/AuthModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PackDetailsModal } from './components/PackDetailsModal';
import { ComparisonModal } from './components/ComparisonModal';
import { OrderSummaryModal } from './components/OrderSummaryModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { BrandBrowserModule } from './components/BrandBrowserModule';
import { LegalView } from './components/LegalView';
import { AdUnit } from './components/AdUnit';
import { UserProfileModule } from './components/UserProfileModule';
import { ProductDetailsModal } from './components/ProductDetailsModal';

// Initial Admin Data
const INITIAL_STORES: Store[] = Object.values(StoreName).map(name => ({
  id: `STR-${name}`, name, logo: STORES[name]?.logo || '', color: STORES[name]?.color || 'bg-gray-500', isActive: true
}));

const INITIAL_CONFIG: PlatformConfig = {
  tiers: {
    free: { label: 'Gratuit', price: 0, limit: 5, features: ['Comparaison simple'] },
    pack1: { label: 'Essentiel', price: 29, limit: 20, features: ['Roadmap GPS', 'Sans pub'] },
    pack2: { label: 'Premium', price: 49, limit: 100, features: ['IA illimitée', 'Support prioritaire'] },
    unlimited: { label: 'Business', price: 199, limit: 1000, features: ['API Access', 'Multi-comptes'] }
  },
  activeMaintenance: false
};

export default function App() {
  // --- STATE ---
  const [language, setLanguage] = useState<Language>('fr');
  
  // Utilisation de MOCK_USERS comme base de données initiale
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  // @security Aucun auto-login : l'utilisateur démarre toujours non connecté.
  // L'admin (et tout rôle) ne s'obtient que via l'authentification (backend v0.2)
  // ou la liste d'auto-connexion de test (DEV_BYPASS uniquement).
  const [user, setUser] = useState<User | null>(null);

  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [packs, setPacks] = useState<Pack[]>(MOCK_PACKS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(MOCK_PROMO_CODES);
  const [brands, setBrands] = useState<Brand[]>(Array.from(new Set(MOCK_PRODUCTS.map(p => p.brand))).map(b => ({ id: `BRD-${b}`, name: b })));
  const [priceReports, setPriceReports] = useState<PriceReport[]>(MOCK_PRICE_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(INITIAL_CONFIG);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null); // New state for product details
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [legalView, setLegalView] = useState<'notice' | 'privacy' | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const [magicInput, setMagicInput] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  // Pagination for main product browser
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // --- API BACKEND SYNC ---
  // Au montage : on tente de charger les données depuis l'API backend.
  // Si l'API n'est pas joignable, on garde les mockData (fallback transparent).
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const healthy = await api.checkApiHealth();
      if (cancelled) return;
      if (!healthy) { setApiAvailable(false); return; }
      setApiAvailable(true);
      try {
        const [prods, pks, strs, brs, promos, cfg] = await Promise.all([
          api.fetchProducts(),
          api.fetchPacks(),
          api.fetchStores(),
          api.fetchBrands(),
          api.fetchPromoCodes(),
          api.fetchConfig(),
        ]);
        if (cancelled) return;
        if (prods.length) setProducts(prods);
        if (pks.length) setPacks(pks);
        if (strs.length) setStores(strs);
        if (brs.length) setBrands(brs);
        if (promos.length) setPromoCodes(promos);
        if (cfg) setPlatformConfig(cfg);
      } catch (e) {
        console.warn('[api] chargement initial partiel, fallback mockData:', e);
      }
      // Restauration de session si un token JWT est présent
      const token = api.getToken();
      if (token) {
        const me = await api.fetchMe();
        if (me && !cancelled) setUser(me);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  // --- DERIVED DATA ---
  const activeProducts = useMemo(() => {
    return products.filter(p => !p.isDeleted && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    ));
  }, [products, searchQuery]);

  const activePacks = useMemo(() => packs.filter(p => !p.isDeleted), [packs]);

  const totalPages = Math.ceil(activeProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = activeProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const cartTotal = cartTotalItems(cart);

  // --- ACTIONS ---

  const addAuditLog = (action: string, details: string, type: AuditLog['type'] = 'info') => {
    setAuditLogs(prev => [{
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.name || 'Visiteur',
      userEmail: user?.email || 'N/A',
      action,
      details,
      type
    }, ...prev]);
  };

  const handleAddToCart = (productId: string, store?: StoreName | string, city?: string, isPreference = false, packId?: string) => {
    setCart(prev => addToCart(prev, { productId, store, city, isPreference, packId }));
    setIsCartOpen(true);
  };

  const updateCartQuantityHandler = (productId: string, store: StoreName | string | undefined, city: string | undefined, delta: number, packId?: string) => {
    setCart(prev => updateCartQuantity(prev, productId, store, city, delta, packId));
  };

  const removeFromCartHandler = (productId: string, store: StoreName | string | undefined, city: string | undefined, packId?: string) => {
    setCart(prev => removeFromCart(prev, productId, store, city, packId));
  };

  const handleMagicImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicInput.trim()) return;
    setIsMagicLoading(true);
    
    // 1. Parse list
    const items = await parseGroceryList(magicInput);
    
    // 2. Find matches
    let addedCount = 0;
    items.forEach((term: string) => {
      const match = products.find(p => p.name.toLowerCase().includes(term.toLowerCase()));
      if (match) {
        handleAddToCart(match.id);
        addedCount++;
      }
    });

    setMagicInput('');
    setIsMagicLoading(false);
    if (addedCount > 0) addAuditLog('MAGIC_IMPORT', `${addedCount} produits importés via IA`, 'success');
  };

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 2) {
      const sugs = await getSmartSearchSuggestions(val);
      setSuggestions(sugs);
    } else {
      setSuggestions([]);
    }
  };

  const handleApplyPromo = (code: string) => {
    const subtotal = computeSubtotal(cart, products);
    const result = validatePromo(code, promoCodes, subtotal);
    if (!result.ok) return false;
    setAppliedPromo(result.promo);
    return true;
  };

  const finalizeOrder = async (mode: 'delivery' | 'roadmap') => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const subtotal = computeSubtotal(cart, products);
    const itemsWithSnapshot = snapshotCartPrices(cart, products);

    // Si l'API est disponible, on crée la commande côté backend (persistée).
    if (apiAvailable) {
      try {
        const created = await api.createOrder({
          items: cart.map(item => ({
            ...item,
            storeId: stores.find(s => s.name === item.store)?.id,
          })),
          mode,
          paymentMethod: 'cod',
          promoCodeId: appliedPromo?.id,
        });
        setOrders([created, ...orders]);
        setCart([]);
        setIsSummaryOpen(false);
        setIsRoadmapOpen(false);
        setAppliedPromo(null);
        addAuditLog('ORDER_CREATED', `Commande ${created.id} créée (${mode})`, 'success');
        const savings = computeOrderSavings(cart, products);
        setUser({ ...user, savingsScore: user.savingsScore + savings });
        return;
      } catch (e) {
        console.error('[api] erreur création commande, fallback local:', e);
      }
    }

    // Fallback local (mockData)
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      userId: user.id,
      items: itemsWithSnapshot,
      total: subtotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      mode,
      deliveryFee: mode === 'delivery' ? 20 : 0,
      paymentMethod: 'cod'
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setIsSummaryOpen(false);
    setIsRoadmapOpen(false);
    setAppliedPromo(null);
    addAuditLog('ORDER_CREATED', `Commande ${newOrder.id} créée (${mode})`, 'success');
    
    if (user) {
        const savings = computeOrderSavings(cart, products);
        setUser({ ...user, savingsScore: user.savingsScore + savings });
    }
  };

  return (
    <div className={`min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
         <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
            
            {/* Left: Logo & Search */}
            <div className="flex items-center gap-8 flex-1">
               <div className="cursor-pointer" onClick={() => { setSearchQuery(''); setSelectedBrand(null); setLegalView(null); setShowProfile(false); }}>
                  <Icons.Logo />
               </div>

               <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xl relative">
                  <div className="absolute left-4 text-slate-400"><Icons.Search className="scale-75" /></div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                       {suggestions.map((s, i) => (
                         <button key={i} onClick={() => { setSearchQuery(s); setSuggestions([]); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0">
                           {s}
                         </button>
                       ))}
                    </div>
                  )}
               </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
               {/* Admin Button in Header */}
               {user?.role === 'admin' && (
                 <button onClick={() => setIsAdminOpen(true)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                   <Icons.Stats className="scale-75" />
                   Console
                 </button>
               )}

               <button onClick={() => setLanguage(l => l === 'fr' ? 'ar' : 'fr')} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black uppercase">
                  {language === 'fr' ? 'AR' : 'FR'}
               </button>
               
               <button onClick={() => setIsCartOpen(true)} className="relative w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-slate-900/20">
                  <Icons.Cart />
                  {cartTotal > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                       {cartTotal}
                    </span>
                  )}
               </button>

               {user ? (
                 <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-all">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                       {user.name[0]}
                    </div>
                    <span className="text-xs font-bold text-slate-700 hidden sm:block truncate max-w-[100px]">{user.name}</span>
                 </button>
               ) : (
                 <button onClick={() => setIsAuthOpen(true)} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">
                    {t.login}
                 </button>
               )}
            </div>
         </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-8 py-8 min-h-[calc(100vh-80px)]">
         
         {/* Top Banner: Magic Import */}
         {!selectedBrand && !legalView && !showProfile && (
           <div className="mb-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[3rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="relative z-10 max-w-2xl">
                 <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-white/10">
                    <Icons.Magic className="text-emerald-400 scale-75" />
                    {t.magicImport}
                 </div>
                 <h1 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                    {language === 'ar' ? 'لديك قائمة تسوق جاهزة؟' : 'Vous avez une liste de courses ?'}
                    <br/>
                    <span className="text-emerald-400">{language === 'ar' ? 'دع الذكاء الاصطناعي يملأ سلتك.' : 'Laissez l\'IA remplir votre panier.'}</span>
                 </h1>
                 
                 <form onSubmit={handleMagicImport} className="relative max-w-lg">
                    <input 
                       value={magicInput}
                       onChange={e => setMagicInput(e.target.value)}
                       placeholder={t.magicPlaceholder}
                       className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-6 pr-32 text-white placeholder-slate-400 outline-none focus:bg-white/20 transition-all backdrop-blur-sm"
                    />
                    <button disabled={isMagicLoading} type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-colors disabled:opacity-50">
                       {isMagicLoading ? '...' : t.addToCart}
                    </button>
                 </form>
              </div>
           </div>
         )}

         {/* Views Logic */}
         {legalView ? (
            <LegalView type={legalView} language={language} onClose={() => setLegalView(null)} />
         ) : showProfile && user ? (
            <UserProfileModule 
              user={user} 
              orders={orders} 
              savedIds={savedIds} 
              products={products} 
              language={language}
              onUpdateUser={(u) => { setUser({ ...user, ...u }); addAuditLog('USER_UPDATE', 'Mise à jour profil', 'info'); }}
              onDeleteAccount={() => { api.clearToken(); setUser(null); setShowProfile(false); addAuditLog('USER_DELETE', 'Compte supprimé', 'danger'); }}
              onClose={() => setShowProfile(false)}
              onViewOrder={(o) => setSelectedOrder(o)}
            />
         ) : selectedBrand ? (
            <BrandBrowserModule 
              brandName={selectedBrand} 
              products={activeProducts} 
              language={language} 
              onAddToCart={handleAddToCart} 
              onClose={() => setSelectedBrand(null)} 
            />
         ) : (
            <div className="space-y-16">
               <PackBrowserModule 
                 packs={activePacks} 
                 products={products} 
                 language={language} 
                 onPackClick={setSelectedPack} 
               />
               
               <AdUnit language={language} slot="1234567890" />
               
               <ProductBrowserModule 
                 products={paginatedProducts} 
                 language={language} 
                 onAddToCart={handleAddToCart}
                 onToggleCompare={(id) => setComparisonIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                 onToggleSave={(id) => setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                 onBrandClick={setSelectedBrand}
                 onProductClick={setViewingProduct}
                 comparisonIds={comparisonIds}
                 savedIds={savedIds}
                 currentPage={currentPage}
                 totalPages={totalPages}
                 onPageChange={setCurrentPage}
               />
            </div>
         )}

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-8">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-slate-300">
               <Icons.Logo className="scale-150 opacity-20" />
               <span className="text-xs font-black uppercase tracking-widest">{t.copyright}</span>
            </div>
            <div className="flex gap-6 text-[10px] font-black uppercase text-slate-400">
               <button onClick={() => setLegalView('notice')} className="hover:text-slate-900">{t.legalNotice}</button>
               <button onClick={() => setLegalView('privacy')} className="hover:text-slate-900">{t.privacyPolicy}</button>
               {user?.role === 'admin' && (
                 <button onClick={() => setIsAdminOpen(true)} className="text-emerald-600 hover:text-emerald-700">Admin</button>
               )}
            </div>
         </div>
      </footer>

      {/* --- FLOATING ACTIONS --- */}
      <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-4">
         {comparisonIds.length > 0 && (
           <button onClick={() => setIsComparisonOpen(true)} className="w-14 h-14 bg-white border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform animate-in zoom-in">
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{comparisonIds.length}</span>
              <Icons.Compare />
           </button>
         )}
         {cart.length > 0 && (
           <button onClick={() => setIsRoadmapOpen(true)} className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/30 hover:scale-110 transition-transform animate-in zoom-in">
              <Icons.Lightning />
           </button>
         )}
      </div>

      {/* --- MODALS --- */}
      <CartDrawer 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} 
        cart={cart} products={products} packs={packs} language={language}
        onUpdateQuantity={updateCartQuantityHandler} onRemove={removeFromCartHandler}
        onPlaceOrder={(mode) => { if (mode === 'roadmap') setIsRoadmapOpen(true); else setIsSummaryOpen(true); setIsCartOpen(false); }}
        onOpenRoadmap={() => { setIsCartOpen(false); setIsRoadmapOpen(true); }}
        isLoggedIn={!!user} onOpenAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
        onApplyPromo={handleApplyPromo} appliedPromo={appliedPromo} onRemovePromo={() => setAppliedPromo(null)}
      />

      <AuthModal 
        isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} 
        language={language}
        users={users} // Passons la liste existante pour vérification
        onLogin={(u) => { 
            setUser(u); 
            setIsAuthOpen(false); 
            addAuditLog('LOGIN', `Connexion utilisateur: ${u.email}`, 'info');
            // Mise à jour de la liste seulement si c'est un nouvel utilisateur
            setUsers(prev => {
                if (prev.some(existing => existing.id === u.id)) return prev;
                return [u, ...prev];
            });
        }} 
      />

      <ShoppingRoadmap 
        isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)}
        cart={cart} products={products} language={language}
        onReportPrice={(id, store, city, price, comment) => {
           setPriceReports(prev => [...prev, {
              id: `REP-${Date.now()}`, productId: id, productName: products.find(p=>p.id===id)?.name || '?', store, city, reportedPrice: price, comment, userEmail: user?.email || 'guest', timestamp: new Date().toISOString(), status: 'pending'
           }]);
        }}
      />

      <OrderSummaryModal 
        isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} cart={cart} products={activeProducts} packs={activePacks} language={language}
        onConfirmOrder={() => finalizeOrder('delivery')}
        onConfirmRoadmap={() => finalizeOrder('roadmap')}
        appliedPromo={appliedPromo}
      />

      <OrderDetailsModal 
        isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} 
        order={selectedOrder} products={activeProducts} packs={activePacks} language={language}
      />

      <PackDetailsModal 
        pack={selectedPack} products={products} onClose={() => setSelectedPack(null)}
        onAddAll={(ids, packId) => ids.forEach(id => handleAddToCart(id, undefined, undefined, false, packId))}
      />

      <ProductDetailsModal 
        product={viewingProduct}
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        onAddToCart={(p, store, city) => handleAddToCart(p.id, store, city)}
        language={language}
      />

      <ComparisonModal 
        isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)}
        products={products.filter(p => comparisonIds.includes(p.id))}
        onRemove={(id) => setComparisonIds(prev => prev.filter(i => i !== id))}
        onAddToCart={(id, s, c, pref) => handleAddToCart(id, s, c, pref)}
        language={language}
      />

      <SubscriptionModal 
        isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)}
        language={language} config={platformConfig}
        onSubscribe={() => {
           if(user) setUser({ ...user, isPremium: true, tier: 'pack2' });
           setIsSubModalOpen(false);
           addAuditLog('SUBSCRIPTION', 'Souscription Pack Premium', 'success');
        }}
      />

      <AdminDashboard 
        isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)}
        products={products} packs={packs} users={users} orders={orders} stores={stores} promoCodes={promoCodes} brands={brands} priceReports={priceReports} auditLogs={auditLogs} config={platformConfig}
        language={language} currentUserEmail={user?.email}
        onUpdateProducts={setProducts} onUpdatePacks={setPacks} onUpdateUsers={setUsers} onUpdateStores={setStores} onUpdatePromoCodes={setPromoCodes} onUpdateBrands={setBrands} onUpdatePriceReports={setPriceReports} onAddLog={addAuditLog} onUpdateConfig={setPlatformConfig}
      />
      
    </div>
  );
}
