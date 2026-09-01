
export enum StoreName {
  MARJANE = 'Marjane',
  CARREFOUR = 'Carrefour',
  BIM = 'BIM',
  ASWAK = 'Aswak Assalam'
}

export type Language = 'fr' | 'en' | 'es' | 'zh' | 'ar';
export type SubscriptionTier = 'free' | 'pack1' | 'pack2' | 'unlimited';

export type CampaignTheme = 'standard' | 'black-friday' | 'white-friday' | 'halloween' | 'ramadan' | 'new-year' | 'flash';
export type PackType = 'bundle' | 'group-buy' | 'sponsored';

/**
 * Représente une marque partenaire gérée dans le système.
 */
export type Brand = {
  id: string;
  name: string;
  logo?: string;
  isDeleted?: boolean;
};

/**
 * Représente une enseigne de distribution (ex: Marjane).
 */
export type Store = {
  id: string;
  name: string;
  logo: string;
  color: string;
  isActive: boolean;
  isDeleted?: boolean;
};

/**
 * Signalement de prix effectué par un utilisateur sur le terrain.
 */
export type PriceReport = {
  id: string;
  productId: string;
  productName: string;
  store: string;
  city: string;
  reportedPrice: number;
  comment?: string;
  userEmail: string;
  timestamp: string;
  status: 'pending' | 'verified' | 'rejected';
};

export type ProductSuggestion = {
  id: string;
  productId: string | null;
  suggestedData: Record<string, any>;
  comment?: string;
  userEmail: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export type PromoCode = {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxUses: number;
  currentUses: number;
  startsAt?: string;
  expiresAt: string;
  isActive: boolean;
  isDeleted?: boolean;
};

/**
 * Un point de prix spécifique pour un produit donné (Combinaison Produit + Enseigne + Ville).
 */
export type PriceEntry = {
  store: StoreName | string;
  city: string; 
  price: number;
  originalPrice?: number;
  promotionExpiresAt?: string;
  lastUpdated: string;
  available: boolean;
};

/**
 * Modèle principal du produit (Catalogue Maître).
 * Contient les métadonnées fixes et une liste de prix variables par enseigne.
 */
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  unit: 'kg' | 'L' | 'unit' | 'g' | 'ml';
  weight: number;
  prices: PriceEntry[];
  isNational?: boolean;
  isDeleted?: boolean;
  // --- Gestion produit (v0.2) : activation, remise, flash sale ---
  isActive?: boolean;
  discountPercent?: number | null;
  flashSalePercent?: number | null;
  flashSaleStartsAt?: string | null;
  flashSaleEndsAt?: string | null;
  flashSaleLabel?: string | null;
  flashSaleActive?: boolean;
  effectiveDiscountPercent?: number;
};

/**
 * Bundle marketing regroupant plusieurs produits avec une remise ou un thème.
 */
export type Pack = {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  price?: number; 
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  startsAt?: string;
  expiresAt?: string;
  theme: CampaignTheme;
  type: PackType;
  isSponsored?: boolean;
  supplierName?: string;
  groupBuyMinParticipants?: number;
  currentParticipants?: number;
  isDeleted?: boolean;
};

export type AuditLog = {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  userEmail: string;
  details: string;
  type: 'info' | 'warning' | 'danger' | 'success';
};

export type CartItem = {
  productId: string;
  quantity: number;
  store?: StoreName | string;
  city?: string;
  isUserPreference?: boolean;
  packId?: string; // ID du pack si l'article fait partie d'un bundle
  unitPrice?: number; // Snapshot du prix unitaire au moment de la commande (audit)
  isDeleted?: boolean;
};

export type UserRole = 'customer' | 'contributor' | 'admin';

/**
 * Profil utilisateur complet.
 */
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  avatar?: string;
  savingsScore: number;
  isPremium: boolean;
  addresses: Address[];
  isDeleted?: boolean;
};

export type Address = {
  id: string;
  label: string;
  details: string;
  city: string;
  isDefault: boolean;
};

export type OrderStatus = 'pending' | 'picking' | 'delivering' | 'completed';

export type Order = {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  discountAmount?: number;
  promoCodeUsed?: string;
  deliveryFee: number;
  status: OrderStatus;
  createdAt: string;
  mode: 'delivery' | 'roadmap';
  paymentMethod?: 'cod' | 'cmi';
};

export type TierMetadata = {
  label: string;
  price: number;
  limit: number;
  features: string[];
  isRecommended?: boolean;
};

export type PlatformConfig = {
  tiers: Record<SubscriptionTier, TierMetadata>;
  activeMaintenance: boolean;
};
