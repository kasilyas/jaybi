
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  activeMaintenance: false,
  comparisonEnabled: false
};

const MARKET_COPY = {
  fr: { eyebrow: 'Votre marché du quotidien', title: 'Bien choisir.\nSimplement.', intro: 'Retrouvez vos produits, explorez les marques et préparez votre panier en un seul endroit.', browse: 'Explorer le catalogue', listTitle: 'Votre liste, un bon départ.', listHint: 'Collez vos envies et retrouvez les produits du catalogue.', catalogue: 'Catalogue', skip: 'Aller au catalogue', close: 'Fermer', language: 'Langue', home: 'Jaybi — Accueil', demo: 'Catalogue indisponible. Veuillez réessayer plus tard.', live: 'Catalogue connecté', note: 'Disponibilités et prix à confirmer en magasin.', comparisonError: 'La comparaison est indisponible. Veuillez réessayer plus tard.', loading: 'Chargement…', listCta: 'Accéder à la liste complète', listPanelTitle: 'Votre liste de courses', listPanelHint: 'Ajoutez les produits recherchés. Jaybi vous aide à les retrouver dans le catalogue.', listPlaceholder: 'Ex. lait, pâtes, tomates, huile d’olive', listSearch: 'Rechercher ma liste', fullList: 'Liste complète', discoverAria: 'Découvrir Jaybi', feat1Title: 'Comparez simplement', feat1Text: 'Retrouvez les prix et disponibilités de plusieurs enseignes au même endroit.', feat2Title: 'Préparez votre liste', feat2Text: 'Transformez une liste de courses en panier prêt à organiser.', feat3Title: 'Achetez au bon moment', feat3Text: 'Repérez les promotions et gardez une vision claire de vos économies.', statProducts: 'produits à explorer', statStores: 'enseignes suivies', statCartValue: '1 panier', statCart: 'pour préparer vos courses' },
  en: { eyebrow: 'Your everyday grocery market', title: 'Choose well.\nKeep it simple.', intro: 'Find your essentials, explore brands and prepare your basket in one place.', browse: 'Explore the catalogue', listTitle: 'Start with your list.', listHint: 'Paste your shopping list to find products in the catalogue.', catalogue: 'Catalogue', skip: 'Skip to catalogue', close: 'Close', language: 'Language', home: 'Jaybi — Home', demo: 'Catalogue unavailable. Please try again later.', live: 'Connected catalogue', note: 'Confirm prices and availability in store.', comparisonError: 'Comparison is unavailable. Please try again later.', loading: 'Loading…', listCta: 'Access the full list', listPanelTitle: 'Your grocery list', listPanelHint: 'Add the products you are looking for. Jaybi helps you find them in the catalogue.', listPlaceholder: 'E.g. milk, pasta, tomatoes, olive oil', listSearch: 'Search my list', fullList: 'Full list', discoverAria: 'Discover Jaybi', feat1Title: 'Compare simply', feat1Text: 'See prices and availability from several retailers in one place.', feat2Title: 'Prepare your list', feat2Text: 'Turn a grocery list into a basket ready to organize.', feat3Title: 'Buy at the right time', feat3Text: 'Spot promotions and keep a clear view of your savings.', statProducts: 'products to explore', statStores: 'retailers tracked', statCartValue: '1 basket', statCart: 'to prepare your groceries' },
  es: { eyebrow: 'Tu mercado de cada día', title: 'Elige bien.\nSin complicaciones.', intro: 'Encuentra tus productos, descubre marcas y prepara tu cesta en un solo lugar.', browse: 'Explorar el catálogo', listTitle: 'Empieza con tu lista.', listHint: 'Pega tu lista para encontrar productos del catálogo.', catalogue: 'Catálogo', skip: 'Ir al catálogo', close: 'Cerrar', language: 'Idioma', home: 'Jaybi — Inicio', demo: 'Catálogo no disponible. Inténtalo más tarde.', live: 'Catálogo conectado', note: 'Confirma precios y disponibilidad en la tienda.', comparisonError: 'La comparación no está disponible. Inténtalo más tarde.', loading: 'Cargando…', listCta: 'Acceder a la lista completa', listPanelTitle: 'Tu lista de compras', listPanelHint: 'Añade los productos que buscas. Jaybi te ayuda a encontrarlos en el catálogo.', listPlaceholder: 'Ej. leche, pasta, tomates, aceite de oliva', listSearch: 'Buscar mi lista', fullList: 'Lista completa', discoverAria: 'Descubre Jaybi', feat1Title: 'Compara fácilmente', feat1Text: 'Consulta precios y disponibilidad de varias tiendas en un solo lugar.', feat2Title: 'Prepara tu lista', feat2Text: 'Convierte una lista de compras en una cesta lista para organizar.', feat3Title: 'Compra en el momento justo', feat3Text: 'Detecta promociones y mantén una visión clara de tus ahorros.', statProducts: 'productos para explorar', statStores: 'tiendas seguidas', statCartValue: '1 cesta', statCart: 'para preparar tu compra' },
  zh: { eyebrow: '您的日常生活市场', title: '精心挑选。\n简单购物。', intro: '查找日常所需，探索品牌，在一个地方准备您的购物篮。', browse: '浏览商品目录', listTitle: '从购物清单开始。', listHint: '粘贴购物清单，查找目录中的商品。', catalogue: '商品目录', skip: '跳至商品目录', close: '关闭', language: '语言', home: 'Jaybi — 首页', demo: '商品目录暂不可用，请稍后重试。', live: '在线目录', note: '请在门店确认价格和库存。', comparisonError: '暂时无法比较，请稍后重试。', loading: '加载中…', listCta: '查看完整列表', listPanelTitle: '您的购物清单', listPanelHint: '添加您要找的商品，Jaybi 帮您在产品目录中找到它们。', listPlaceholder: '例如：牛奶、意大利面、番茄、橄榄油', listSearch: '搜索我的清单', fullList: '完整列表', discoverAria: '了解 Jaybi', feat1Title: '轻松比价', feat1Text: '在同一位置查看多家零售商的价格和库存。', feat2Title: '准备您的清单', feat2Text: '将购物清单变成可整理的购物篮。', feat3Title: '在对的时间购买', feat3Text: '发现促销信息，清楚了解您的节省。', statProducts: '件商品可供浏览', statStores: '家零售商', statCartValue: '1 个购物篮', statCart: '助您准备购物' },
  ar: { eyebrow: 'سوقك لاحتياجات كل يوم', title: 'اختيار أفضل.\nبكل بساطة.', intro: 'اعثر على منتجاتك واكتشف العلامات وجهّز سلتك في مكان واحد.', browse: 'تصفح الكتالوج', listTitle: 'ابدأ بقائمة مشترياتك.', listHint: 'الصق قائمتك للعثور على منتجات من الكتالوج.', catalogue: 'الكتالوج', skip: 'انتقل إلى الكتالوج', close: 'إغلاق', language: 'اللغة', home: 'جايبي — الرئيسية', demo: 'الكتالوج غير متاح. يرجى المحاولة لاحقاً.', live: 'كتالوج متصل', note: 'يرجى تأكيد الأسعار والتوفر في المتجر.', comparisonError: 'المقارنة غير متاحة. يرجى المحاولة لاحقاً.', loading: 'جارٍ التحميل…', listCta: 'الوصول إلى القائمة الكاملة', listPanelTitle: 'قائمة مشترياتك', listPanelHint: 'أضف المنتجات التي تبحث عنها. يساعدك جايبي في العثور عليها في الكتالوج.', listPlaceholder: 'مثال: حليب، معكرونة، طماطم، زيت زيتون', listSearch: 'ابحث في قائمتي', fullList: 'القائمة الكاملة', discoverAria: 'اكتشف جايبي', feat1Title: 'قارن ببساطة', feat1Text: 'اطّلع على الأسعار والتوفر لدى عدة متاجر في مكان واحد.', feat2Title: 'جهّز قائمتك', feat2Text: 'حوّل قائمة المشتريات إلى سلة جاهزة للتنظيم.', feat3Title: 'اشترِ في الوقت المناسب', feat3Text: 'رصد العروض وحافظ على رؤية واضحة لمدخراتك.', statProducts: 'منتجات للاستكشاف', statStores: 'متاجر متابعة', statCartValue: 'سلة واحدة', statCart: 'لتحضير مشترياتك' },
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

  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(MOCK_PROMO_CODES);
  const [brands, setBrands] = useState<Brand[]>(Array.from(new Set(MOCK_PRODUCTS.map(p => p.brand))).map(b => ({ id: `BRD-${b}`, name: b })));
  const [priceReports, setPriceReports] = useState<PriceReport[]>(MOCK_PRICE_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(INITIAL_CONFIG);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('relevance');
  const searchVersion = useRef(0);
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
  const [comparisonProducts, setComparisonProducts] = useState<Product[]>([]);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(false);
  const comparisonRequest = useRef(0);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null); // New state for product details
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [legalView, setLegalView] = useState<'notice' | 'privacy' | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const [magicInput, setMagicInput] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Pagination for main product browser
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // --- API BACKEND SYNC ---
  // Au montage : on tente de charger les données depuis l'API backend.
  // Si l'API n'est pas joignable, on garde les mockData (fallback transparent).
  const [apiAvailable, setApiAvailable] = useState(false);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const healthy = await api.checkApiHealth();
      if (cancelled) return;
      if (!healthy) { setApiAvailable(false); setCatalogueLoading(false); return; }
      try {
        const [prods, pks, strs, brs, promos] = await Promise.all([
          api.fetchProducts(),
          api.fetchPacks(),
          api.fetchStores(),
          api.fetchBrands(),
          api.fetchPromoCodes(),
        ]);
        if (cancelled) return;
        setProducts(prods);
        setPacks(pks);
        setStores(strs);
        setBrands(brs);
        setPromoCodes(promos);
        setApiAvailable(true);
      } catch {
        if (!cancelled) setApiAvailable(false);
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
      // Restauration de session si un token JWT est présent
      const token = api.getToken();
      if (token) {
        const me = await api.fetchMe();
        if (me && !cancelled) {
          setUser(me);
          // Charge les commandes et signalements de l'utilisateur depuis l'API
          try {
            const [myOrders, reports] = await Promise.all([
              api.fetchMyOrders(),
              me.role === 'admin' ? api.fetchReports() : Promise.resolve([]),
            ]);
            if (!cancelled) {
              setOrders(myOrders);
              if (me.role === 'admin') setPriceReports(reports);
            }
          } catch (e) {
            console.warn('[api] chargement commandes/reports partiel:', e);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const t = TRANSLATIONS[language];
  const copy = MARKET_COPY[language];
  const isRTL = language === 'ar';
  const comparisonEnabled = platformConfig.comparisonEnabled === true;
  const comparisonAllowed = useRef(comparisonEnabled);
  comparisonAllowed.current = comparisonEnabled;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  useEffect(() => {
    let cancelled = false;
    let version = 0;
    const refreshConfig = async () => {
      const request = ++version;
      try {
        const config = await api.fetchConfig();
        if (!cancelled && request === version) setPlatformConfig(config ? { ...config, comparisonEnabled: config.comparisonEnabled === true } : { ...INITIAL_CONFIG, comparisonEnabled: false });
      } catch {
        if (!cancelled && request === version) setPlatformConfig(previous => ({ ...previous, comparisonEnabled: false }));
      }
    };
    const onFocus = () => { void refreshConfig(); };
    void refreshConfig();
    const interval = window.setInterval(onFocus, 30000);
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => {
    if (!comparisonEnabled) {
      comparisonRequest.current++;
      setComparisonIds([]);
      setComparisonProducts([]);
      setIsComparisonOpen(false);
      setIsComparisonLoading(false);
    }
  }, [comparisonEnabled]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortOrder]);

  // --- DERIVED DATA ---
  const categories = useMemo(() => Array.from(new Set(products.filter(p => !p.isDeleted).map(p => p.category))), [products]);
  const activeProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(language);
    const filtered = products.filter(p => !p.isDeleted && (!selectedCategory || p.category === selectedCategory) && (
      p.name.toLocaleLowerCase(language).includes(query) ||
      p.brand.toLocaleLowerCase(language).includes(query) ||
      p.category.toLocaleLowerCase(language).includes(query)
    ));
    const price = (p: Product) => Math.min(...p.prices.filter(entry => Number.isFinite(entry.price) && entry.price >= 0).map(entry => entry.price));
    if (sortOrder === 'priceAsc' || sortOrder === 'priceDesc') filtered.sort((a, b) => {
      const aPrice = price(a), bPrice = price(b);
      if (!Number.isFinite(aPrice)) return Number.isFinite(bPrice) ? 1 : 0;
      if (!Number.isFinite(bPrice)) return -1;
      return sortOrder === 'priceAsc' ? aPrice - bPrice : bPrice - aPrice;
    });
    if (sortOrder === 'nameAsc') filtered.sort((a, b) => a.name.localeCompare(b.name, language));
    return filtered;
  }, [products, searchQuery, selectedCategory, sortOrder, language]);

  const activePacks = useMemo(() => packs.filter(p => !p.isDeleted), [packs]);

  const totalPages = Math.ceil(activeProducts.length / ITEMS_PER_PAGE);
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const paginatedProducts = activeProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

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
    if (!user) {
      setMagicError('Connectez-vous pour utiliser l’importation intelligente.');
      setIsAuthOpen(true);
      return;
    }
    setMagicError('');
    setIsMagicLoading(true);
    try {
      const items = await parseGroceryList(magicInput);
      let addedCount = 0;
      items.forEach((term: string) => {
        const match = products.find(p => p.name.toLowerCase().includes(term.toLowerCase()));
        if (match) { handleAddToCart(match.id); addedCount++; }
      });
      setMagicInput('');
      if (addedCount > 0) addAuditLog('MAGIC_IMPORT', `${addedCount} produits importés via IA`, 'success');
      else setMagicError('Aucun produit du catalogue ne correspond à cette liste.');
    } catch {
      setMagicError('Importation intelligente indisponible. Réessayez plus tard.');
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    const version = ++searchVersion.current;
    if (val.trim().length > 2) {
      try {
        const sugs = await getSmartSearchSuggestions(val);
        if (version === searchVersion.current) setSuggestions(sugs);
      } catch { if (version === searchVersion.current) setSuggestions([]); }
    } else {
      setSuggestions([]);
    }
  };

  const resetCatalogue = () => {
    searchVersion.current++;
    setSearchQuery(''); setSelectedCategory(''); setSuggestions([]); setSelectedBrand(null); setLegalView(null); setShowProfile(false); setCurrentPage(1);
  };

  const toggleComparison = (id: string) => {
    if (!comparisonAllowed.current) return;
    setComparisonError(false);
    setComparisonIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : previous.length < 4 ? [...previous, id] : previous);
  };

  const openComparison = async () => {
    if (!comparisonAllowed.current || comparisonIds.length < 2 || isComparisonLoading) return;
    const request = ++comparisonRequest.current;
    setIsComparisonLoading(true);
    setComparisonError(false);
    try {
      const authoritativeProducts = await api.fetchComparison(comparisonIds);
      if (request !== comparisonRequest.current || !comparisonAllowed.current) return;
      setComparisonProducts(authoritativeProducts);
      setIsComparisonOpen(true);
    } catch {
      if (request !== comparisonRequest.current) return;
      setComparisonProducts([]);
      setIsComparisonOpen(false);
      setComparisonError(true);
      try {
        const config = await api.fetchConfig();
        if (request === comparisonRequest.current) setPlatformConfig({ ...config, comparisonEnabled: config?.comparisonEnabled === true });
      } catch {
        if (request === comparisonRequest.current) setPlatformConfig(previous => ({ ...previous, comparisonEnabled: false }));
      }
    } finally {
      if (request === comparisonRequest.current) setIsComparisonLoading(false);
    }
  };

  const handleApplyPromo = (code: string) => {
    const subtotal = computeSubtotal(cart, products, packs);
    const result = validatePromo(code, promoCodes, subtotal);
    if (!result.ok) return false;
    setAppliedPromo(result.promo);
    return true;
  };

  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const submittingOrder = useRef(false);
  const pendingOrder = useRef<{ fingerprint: string; key: string } | null>(null);
  const finalizeOrder = async (mode: 'delivery' | 'roadmap') => {
    if (!user) { setIsAuthOpen(true); return; }
    if (submittingOrder.current) return;
    submittingOrder.current = true; setCheckoutPending(true); setCheckoutError('');
    const data = { items: cart.map(item => ({ ...item, storeId: stores.find(s => s.name === item.store)?.id })), mode, paymentMethod: 'cod' as const, promoCodeId: appliedPromo?.id };
    const fingerprint = JSON.stringify({ user: user.id, data });
    if (pendingOrder.current?.fingerprint !== fingerprint) pendingOrder.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const created = await api.createOrder(data, pendingOrder.current.key);
      setOrders(previous => [created, ...previous.filter(o => o.id !== created.id)]);
      setCart([]); setIsSummaryOpen(false); setIsRoadmapOpen(false); setAppliedPromo(null);
      pendingOrder.current = null;
      const me = await api.fetchMe(); if (me) setUser(me);
    } catch (error: any) {
      const messages = {
        fr: ['Connexion interrompue. Votre panier est conservé. Réessayez.', 'Commande refusée. Votre panier est conservé. Vérifiez les offres et votre connexion.'],
        en: ['Connection interrupted. Your cart is saved. Please retry.', 'Order rejected. Your cart is saved. Check the offers and your session.'],
        ar: ['انقطع الاتصال. تم الاحتفاظ بسلتك. أعد المحاولة.', 'تم رفض الطلب. سلتك محفوظة. تحقق من العروض وحسابك.'],
        es: ['Conexión interrumpida. Tu cesta se conserva. Reintenta.', 'Pedido rechazado. Tu cesta se conserva. Revisa las ofertas y tu sesión.'],
        zh: ['连接中断，购物车已保留。请重试。', '订单被拒绝，购物车已保留。请检查优惠和登录状态。'],
      };
      setCheckoutError(messages[language][error?.status ? 1 : 0]);
    } finally { submittingOrder.current = false; setCheckoutPending(false); }
  };

  return (
    <div className={`marketplace min-h-screen font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {platformConfig.activeMaintenance && user?.role !== 'admin' && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950 px-6 text-center text-white"><div><Icons.Logo /><h1 className="mt-6 text-3xl font-black">Plateforme en maintenance</h1><p className="mt-3 text-slate-300">Nous revenons dès que possible. Merci de votre patience.</p><button onClick={() => setIsAuthOpen(true)} className="mt-8 rounded-xl border border-slate-500 px-5 py-3 text-xs font-black uppercase">Accès administrateur</button></div></div>}
      <a className="skip-link" href="#main-content">{copy.skip}</a>
      
      {/* --- HEADER --- */}
      <header className="market-header safe-top">
         <div className="market-header-inner">

            {/* Left: Logo & Search */}
            <div className="flex items-center gap-4 sm:gap-8 flex-1 min-w-0">
               <button type="button" className="market-wordmark" onClick={resetCatalogue} aria-label={copy.home}>jaybi<span aria-hidden="true">.</span></button>

               {/* Search desktop */}
               <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xl relative">
                  <div className="search-icon" aria-hidden="true"><Icons.Search className="w-5 h-5" /></div>
                  <input
                    type="search"
                    aria-label={t.searchPlaceholder}
                    onKeyDown={e => { if (e.key === 'Escape') { searchVersion.current++; setSuggestions([]); } }}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="market-search-input"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                       {suggestions.map((s, i) => (
                         <button key={i} onClick={() => { setSearchQuery(s); setSuggestions([]); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0">
                           {s}
                         </button>
                       ))}
                    </div>
                  )}
               </div>

               {/* Search mobile toggle */}
               <button onClick={() => setMobileSearchOpen(o => !o)} className="market-icon-button lg:hidden" aria-label={t.searchPlaceholder} aria-expanded={mobileSearchOpen} aria-controls="mobile-search">
                  <Icons.Search className="scale-75" />
               </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
               {/* Admin Button in Header */}
               {user?.role === 'admin' && (
                 <button onClick={() => setIsAdminOpen(true)} aria-label={t.admin} className="market-admin-button">
                   <Icons.Stats className="scale-75" />
                   <span className="hidden sm:inline">Console</span>
                 </button>
               )}

               <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="market-language"
                  aria-label={copy.language}
               >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="zh">ZH</option>
                  <option value="ar">AR</option>
               </select>

               <button onClick={() => setIsCartOpen(true)} aria-label={`${t.cart} (${cartTotal})`} className="market-cart-button">
                  <Icons.Cart />
                  {cartTotal > 0 && (
                    <span className="market-cart-count">
                       {cartTotal}
                    </span>
                  )}
               </button>

               {user ? (
                 <button onClick={() => setShowProfile(true)} aria-label={t.myProfile} className="market-profile-button">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                       {user.name[0]}
                    </div>
                    <span className="text-xs font-bold text-slate-700 hidden sm:block truncate max-w-[100px]">{user.name}</span>
                 </button>
               ) : (
                 <button onClick={() => setIsAuthOpen(true)} className="market-login-button">
                    {t.login}
                 </button>
               )}
            </div>
         </div>
      </header>

      {/* --- SEARCH MOBILE --- */}
      {mobileSearchOpen && (
        <div id="mobile-search" className="market-mobile-search lg:hidden">
          <div className="flex items-center gap-2 relative">
            <div className="search-icon" aria-hidden="true"><Icons.Search className="w-5 h-5" /></div>
            <input
              type="search"
              aria-label={t.searchPlaceholder}
              onKeyDown={e => { if (e.key === 'Escape') { searchVersion.current++; setMobileSearchOpen(false); setSuggestions([]); } }}
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="market-search-input mobile-search-input"
            />
            <button onClick={() => { searchVersion.current++; setMobileSearchOpen(false); setSuggestions([]); }} aria-label={copy.close} className="mobile-search-close market-icon-button">
              ✕
            </button>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setSearchQuery(s); setSuggestions([]); setMobileSearchOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main id="main-content" tabIndex={-1} className="market-main">
         
         {/* Top Banner: Magic Import */}
         {!selectedBrand && !legalView && !showProfile && (
           <section className="market-hero" aria-labelledby="hero-title">
              <div className="market-hero-copy">
                 <p className="market-eyebrow"><span aria-hidden="true" />{copy.eyebrow}</p>
                 <h1 id="hero-title">{copy.title}</h1>
                 <p className="market-intro">{copy.intro}</p>
                 <a href="#catalogue" className="market-primary-button">{copy.listCta}<Icons.ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} /></a>
                 <p className="market-catalogue-status"><span className={apiAvailable ? 'status-live' : ''} aria-hidden="true" />{catalogueLoading ? copy.loading : apiAvailable ? copy.live : copy.demo}</p>
              </div>
              <div className="market-list-panel">
                 <div className="market-list-heading"><Icons.Magic className="w-5 h-5" /><span>{t.magicImport}</span></div>
                 <h2>{copy.listPanelTitle}</h2>
                 <p>{copy.listPanelHint}</p>
                 <form onSubmit={handleMagicImport} className="market-list-form" aria-busy={isMagicLoading}>
                    <label htmlFor="grocery-list" className="sr-only">{t.magicPlaceholder}</label>
                    <textarea id="grocery-list" value={magicInput} onChange={e => setMagicInput(e.target.value)} placeholder={copy.listPlaceholder} rows={3} />
                    <div className="flex flex-wrap gap-3"><button disabled={isMagicLoading || !magicInput.trim()} type="submit" className="market-primary-button">{isMagicLoading ? copy.loading : copy.listSearch}<Icons.Search className="w-4 h-4" /></button><a href="#catalogue" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50">{copy.fullList}</a></div>
                 </form>
                 {magicError && <p role="alert" className="text-sm text-red-700 mt-2">{magicError}</p>}
              </div>
           </section>
         )}

         {!selectedBrand && !legalView && !showProfile && (
           <section className="mx-auto mb-14 max-w-7xl px-1" aria-label={copy.discoverAria}>
             <div className="grid gap-4 md:grid-cols-3">
               {[
                 [copy.feat1Title, copy.feat1Text, <Icons.Compare className="h-5 w-5" />],
                 [copy.feat2Title, copy.feat2Text, <Icons.Magic className="h-5 w-5" />],
                 [copy.feat3Title, copy.feat3Text, <Icons.TrendingUp className="h-5 w-5" />],
               ].map(([title, text, icon]) => <article key={title as string} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm"><div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700">{icon as React.ReactNode}</div><h2 className="text-lg font-black text-slate-900">{title as string}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p></article>)}
             </div>
             <div className="mt-6 grid gap-4 rounded-3xl bg-slate-900 p-8 text-white md:grid-cols-3">
               <div><p className="text-3xl font-black">{products.length || '—'}</p><p className="mt-1 text-sm text-slate-300">{copy.statProducts}</p></div>
               <div><p className="text-3xl font-black">{stores.filter(store => store.isActive).length}</p><p className="mt-1 text-sm text-slate-300">{copy.statStores}</p></div>
               <div><p className="text-3xl font-black">{copy.statCartValue}</p><p className="mt-1 text-sm text-slate-300">{copy.statCart}</p></div>
             </div>
           </section>
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
              onUpdateUser={async (u) => { setUser(await api.updateMyProfile(u.name ?? user.name)); }}
              onRequestPasswordCode={() => api.requestPasswordChangeCode()}
              onConfirmPasswordChange={async (code, newPassword) => { await api.confirmPasswordChange(code, newPassword); }}
              onCreateAddress={async (address) => { setUser(await api.createMyAddress(address)); }}
              onDeleteAddress={async (id) => { setUser(await api.deleteMyAddress(id)); }}
              onLogout={() => { api.clearToken(); setUser(null); setShowProfile(false); addAuditLog('LOGOUT', 'Déconnexion', 'info'); }}
              onDeleteAccount={async () => { await api.disableMyAccount(); api.clearToken(); setUser(null); setOrders([]); setShowProfile(false); }}
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
            <div className="market-catalogue-layout">
               <div className="market-filter-bar">
                 <div className="market-category-tabs" role="group" aria-label={t.filterBy}>
                   <button type="button" aria-pressed={!selectedCategory} onClick={() => setSelectedCategory('')}>{t.categoryAll}</button>
                   {categories.map(category => <button type="button" key={category} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}</button>)}
                 </div>
                 <label className="market-sort"><span>{t.sortBy}</span><select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                   <option value="relevance">{t.relevance}</option><option value="priceAsc">{t.priceAsc}</option><option value="priceDesc">{t.priceDesc}</option><option value="nameAsc">{t.nameAsc}</option>
                 </select></label>
               </div>
               {(searchQuery || selectedCategory) && <div className="market-filter-summary"><span>{searchQuery ? `“${searchQuery}”` : selectedCategory}</span><button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory(''); setSuggestions([]); searchVersion.current++; }}>{t.reset}</button></div>}
               <ProductBrowserModule 
                 products={paginatedProducts} 
                 language={language} 
                 onAddToCart={handleAddToCart}
                 onToggleCompare={toggleComparison}
                 comparisonEnabled={comparisonEnabled}
                 onToggleSave={(id) => setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                 onBrandClick={setSelectedBrand}
                 onProductClick={setViewingProduct}
                 comparisonIds={comparisonIds}
                 savedIds={savedIds}
                 currentPage={safePage}
                 totalPages={totalPages}
                 totalItems={activeProducts.length}
                 onPageChange={setCurrentPage}
               />
               <p className="market-price-note">{copy.note}</p>
               {activePacks.length > 0 && <div className="market-packs"><PackBrowserModule packs={activePacks} products={products} language={language} onPackClick={setSelectedPack} /></div>}
            </div>
         )}

      </main>

      {/* --- FOOTER --- */}
      <footer className="market-footer">
         <div className="market-footer-inner">
            <div className="market-footer-brand">
               <button type="button" className="market-wordmark" onClick={resetCatalogue} aria-label={copy.home}>jaybi<span aria-hidden="true">.</span></button>
               <span>{t.copyright}</span>
            </div>
            <div className="market-footer-links">
               <button onClick={() => setLegalView('notice')} className="hover:text-slate-900">{t.legalNotice}</button>
               <button onClick={() => setLegalView('privacy')} className="hover:text-slate-900">{t.privacyPolicy}</button>
               {user?.role === 'admin' && (
                 <button onClick={() => setIsAdminOpen(true)} className="text-emerald-600 hover:text-emerald-700">Admin</button>
               )}
            </div>
         </div>
      </footer>

      {/* --- FLOATING ACTIONS --- */}
      <div className="market-floating-actions safe-bottom">
         {comparisonError && <p role="alert" className="market-comparison-error">{copy.comparisonError}<button type="button" aria-label={copy.close} onClick={() => setComparisonError(false)}>×</button></p>}
         {comparisonEnabled && comparisonIds.length > 0 && (
           <button onClick={openComparison} disabled={isComparisonLoading || comparisonIds.length < 2} aria-busy={isComparisonLoading} className="market-compare-button">
              <Icons.Compare className="w-5 h-5" /><span>{isComparisonLoading ? copy.loading : t.compare}</span><span className="market-compare-count">{comparisonIds.length}</span>
           </button>
         )}
         {cart.length > 0 && (
           <button onClick={() => setIsRoadmapOpen(true)} aria-label={t.roadmap} className="market-roadmap-button"><Icons.Lightning className="w-5 h-5" /><span>{t.roadmap}</span></button>
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
        onReportPrice={async (id, store, city, price, comment) => {
           // Tentative d'envoi au backend
           if (apiAvailable && user) {
             try {
               const created = await api.createReport({ productId: id, storeName: store, city, reportedPrice: price, comment });
               setPriceReports(prev => [created, ...prev]);
               return;
             } catch (e) {
               console.warn('[api] signalement prix échoué, fallback local:', e);
             }
           }
           // Fallback local
           setPriceReports(prev => [...prev, {
              id: `REP-${Date.now()}`, productId: id, productName: products.find(p=>p.id===id)?.name || '?', store, city, reportedPrice: price, comment, userEmail: user?.email || 'guest', timestamp: new Date().toISOString(), status: 'pending'
           }]);
        }}
      />

      <OrderSummaryModal error={checkoutError} pending={checkoutPending}
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

      {comparisonEnabled && <ComparisonModal
        isOpen={isComparisonOpen && comparisonProducts.length > 0} onClose={() => setIsComparisonOpen(false)}
        products={comparisonProducts}
        onRemove={(id) => { if (!comparisonAllowed.current) return; setComparisonIds(prev => prev.filter(i => i !== id)); setComparisonProducts(prev => prev.filter(p => p.id !== id)); }}
        onAddToCart={(id, s, c, pref) => { if (comparisonAllowed.current) handleAddToCart(id, s, c, pref); }}
        language={language}
      />}

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
