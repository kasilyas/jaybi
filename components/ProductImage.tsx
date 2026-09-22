import React, { useState } from 'react';
import { Product } from '../types';
import { Icons } from '../constants';

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
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const hasImage = product.image && product.image.trim() !== '' && failedImage !== product.image;

  if (!hasImage) {
    return (
      <div role="img" aria-label={product.name} className={`flex flex-col items-center justify-center gap-2 text-slate-400 ${className}`}>
        <Icons.Box className="w-8 h-8" />
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
      onError={() => setFailedImage(product.image)}
      loading="lazy"
      className={imgClassName}
    />
  );
};
