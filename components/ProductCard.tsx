
import React, { useState, useEffect } from 'react';
import { Product, Language } from '../types';
import { Icons, TRANSLATIONS } from '../constants';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onClick: (p: Product) => void;
  onAddToCart: (p: Product, store?: string, city?: string) => void;
  onBrandClick: (brand: string) => void;
  onToggleCompare: (productId: string) => void;
  onToggleSave: (productId: string) => void;
  isComparing: boolean;
  isSaved: boolean;
  language: Language;
  comparisonEnabled?: boolean;
}

const CARD_COPY = {
  fr: { unavailable: 'Prix indisponible', offers: 'Autres offres', hide: 'Masquer les offres', details: 'Voir le produit' },
  en: { unavailable: 'Price unavailable', offers: 'Other offers', hide: 'Hide offers', details: 'View product' },
  es: { unavailable: 'Precio no disponible', offers: 'Otras ofertas', hide: 'Ocultar ofertas', details: 'Ver producto' },
  zh: { unavailable: '暂无价格', offers: '其他报价', hide: '收起报价', details: '查看商品' },
  ar: { unavailable: 'السعر غير متوفر', offers: 'عروض أخرى', hide: 'إخفاء العروض', details: 'عرض المنتج' },
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  onAddToCart,
  onBrandClick,
  onToggleCompare,
  onToggleSave,
  isComparing,
  isSaved,
  language,
  comparisonEnabled = false,
}) => {
  const [now, setNow] = useState(Date.now);
  const [showOtherOffers, setShowOtherOffers] = useState(false);
  const t = TRANSLATIONS[language];
  const copy = CARD_COPY[language];
  const sortedPrices = [...product.prices].filter(price => Number.isFinite(price.price) && price.price >= 0).sort((a, b) => a.price - b.price);
  const bestPrice = sortedPrices[0];
  const otherPrices = sortedPrices.slice(1);
  const isPromoActive = !!bestPrice?.originalPrice && bestPrice.originalPrice > bestPrice.price &&
    (!bestPrice.promotionExpiresAt || new Date(bestPrice.promotionExpiresAt).getTime() > now);
  const discountPercent = isPromoActive
    ? Math.round(((bestPrice.originalPrice! - bestPrice.price) / bestPrice.originalPrice!) * 100)
    : 0;

  // --- Remise produit / flash sale (v0.2) ---
  const effectiveDiscount = Math.min(100, Math.max(0, product.effectiveDiscountPercent ?? 0));
  const isFlashSale = !!product.flashSaleActive;
  const hasProductDiscount = effectiveDiscount > 0;
  // Prix de base (meilleur prix enseigne) avant remise produit
  const basePrice = bestPrice?.price ?? 0;
  const discountedPrice = hasProductDiscount ? basePrice * (1 - effectiveDiscount / 100) : basePrice;
  const isFresh = !!bestPrice && new Date(bestPrice.lastUpdated).getTime() > now - 86400000;
  const formatPrice = (value: number) => value.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (!bestPrice?.promotionExpiresAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, [bestPrice?.promotionExpiresAt]);

  useEffect(() => {
    if (!comparisonEnabled) setShowOtherOffers(false);
  }, [comparisonEnabled]);

  return (
    <article className={`product-card ${comparisonEnabled && isComparing ? 'product-card-selected' : ''}`}>
      {/* Glow accent en arrière-plan selon catégorie */}
      <div className="product-card-category">{product.category}</div>

      {/* Top Actions */}
      <div className="product-card-actions">
        {comparisonEnabled && (
          <button type="button" onClick={() => onToggleCompare(product.id)} aria-label={`${t.compare} : ${product.name}`} aria-pressed={isComparing} className="product-icon-button">
            <Icons.Compare className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={() => onToggleSave(product.id)} aria-label={`${t.save} : ${product.name}`} aria-pressed={isSaved} className="product-icon-button">
          <Icons.Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : 'fill-none'}`} />
        </button>
      </div>

      <div className="product-badges">
        {/* Badge Flash si vente flash active */}
        {bestPrice && isFlashSale && <span className="product-badge product-badge-sale"><Icons.Lightning className="w-3 h-3" /> Flash</span>}
        {/* Badge remise (promo enseigne OU remise produit/flash) */}
        {bestPrice && (isPromoActive || hasProductDiscount) && <span className="product-badge product-badge-sale">−{Math.max(discountPercent, effectiveDiscount)}%</span>}
      </div>

      {/* Image Holder */}
      <button type="button" onClick={() => onClick(product)} className="product-image-button" aria-label={`${copy.details} : ${product.name}`}>
        <ProductImage key={product.image} product={product} className="w-full h-full" imgClassName="w-full h-full object-contain mix-blend-multiply" />
      </button>

      {/* Content */}
      <div className="product-card-content">
        <div className="product-meta">
          <button type="button" onClick={() => onBrandClick(product.brand)} className="product-brand">{product.brand}</button>
          <span dir="auto">{product.weight} {product.unit}</span>
        </div>
        <h3 className="product-name"><button type="button" onClick={() => onClick(product)}>{product.name}</button></h3>
        <div className="product-offer">
          {/* Best Price Main Display */}
          <div className="product-price-row">
            <div>
              {/* Prix barré : promo enseigne OU remise produit/flash */}
              {bestPrice && (isPromoActive || hasProductDiscount) && <del className="product-original-price">{formatPrice(isPromoActive ? bestPrice.originalPrice! : basePrice)} {t.currencySuffix}</del>}
              <div className="product-price" dir="auto">
                {bestPrice ? <><strong>{formatPrice(isPromoActive ? bestPrice.price : discountedPrice)}</strong><span>{t.currencySuffix}</span></> : <span className="product-unavailable">{copy.unavailable}</span>}
              </div>
              {/* Libellé flash si présent */}
              {bestPrice && isFlashSale && product.flashSaleLabel && <span className="product-flash-label">{product.flashSaleLabel}</span>}
            </div>
            {bestPrice && <span className="product-store">{bestPrice.store}</span>}
          </div>
          {bestPrice && <p className={`product-freshness ${isFresh ? 'is-fresh' : ''}`}>{isFresh ? t.freshPrice : t.verify}{bestPrice.city ? ` · ${bestPrice.city}` : ''}</p>}
          <button type="button" disabled={!bestPrice} onClick={() => { if (bestPrice) onAddToCart(product, bestPrice.store, bestPrice.city); }} aria-label={`${t.addToCart} : ${product.name}`} className="product-add-button">
            <Icons.Plus className="w-4 h-4" /> {t.addToCart}
          </button>

          {/* Option to view other prices if multiple stores exist */}
          {comparisonEnabled && otherPrices.length > 0 && (
            <div className="product-other-offers">
              <button type="button" onClick={() => setShowOtherOffers(!showOtherOffers)} aria-expanded={showOtherOffers} aria-controls={`offers-${product.id}`} className="product-offers-toggle">
                {showOtherOffers ? copy.hide : `${copy.offers} (${otherPrices.length})`}
                <Icons.ChevronRight className={`w-3 h-3 ${showOtherOffers ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {showOtherOffers && <div id={`offers-${product.id}`} className="product-offers-list">
                {otherPrices.map((price, index) => (
                  <div key={`${price.store}-${price.city}-${index}`} className="product-offer-entry">
                    <div><strong>{price.store}</strong><span>{price.city}</span></div>
                    <span dir="auto">{formatPrice(price.price)} {t.currencySuffix}</span>
                    <button type="button" onClick={() => onAddToCart(product, price.store, price.city)} aria-label={`${t.addToCart} : ${product.name}, ${price.store}, ${price.city || ''}`} className="product-icon-button"><Icons.Plus className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
