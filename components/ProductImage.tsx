import React, { useState } from 'react';
import { Product } from '../types';
import { CATEGORY_VISUALS } from '../constants';

interface ProductImageProps {
  product: Pick<Product, 'image' | 'name' | 'category' | 'brand'>;
  className?: string;
  imgClassName?: string;
  showBrand?: boolean;
}

/**
 * Affiche l'image d'un produit avec fallback élégant.
 * - Si l'image est vide ou en erreur : emoji catégorie + marque
 * - Sinon : image avec lazy loading
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  className = '',
  imgClassName = '',
  showBrand = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const visual = CATEGORY_VISUALS[product.category] || CATEGORY_VISUALS['default'];
  const hasImage = product.image && product.image.trim() !== '' && !imageError;

  if (!hasImage) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
        <div className="text-4xl drop-shadow-xl">{visual.emoji}</div>
        {showBrand && product.brand && (
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center px-2 line-clamp-1 max-w-[90%]">
            {product.brand}
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={product.image}
      alt={product.name}
      onError={() => setImageError(true)}
      loading="lazy"
      className={imgClassName}
    />
  );
};
