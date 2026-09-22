
import React from 'react';
import { Product, Language, StoreName } from '../types';
import { ProductCard } from './ProductCard';
import { TRANSLATIONS, Icons } from '../constants';

interface ProductBrowserModuleProps {
  products: Product[];
  language: Language;
  onAddToCart: (id: string, store?: StoreName | string, city?: string, isUserPreference?: boolean) => void;
  onToggleCompare: (id: string) => void;
  onToggleSave: (id: string) => void;
  onBrandClick: (brand: string) => void;
  onProductClick: (product: Product) => void;
  comparisonIds: string[];
  comparisonEnabled?: boolean;
  savedIds: string[];
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

const BROWSER_COPY = {
  fr: { title: 'Le catalogue', subtitle: 'Les essentiels, à votre rythme.', empty: 'Aucun produit trouvé', hint: 'Essayez un autre mot-clé ou une autre catégorie.', previous: 'Page précédente', next: 'Page suivante', page: 'Page', navigation: 'Pagination du catalogue' },
  en: { title: 'The grocery catalogue', subtitle: 'Everyday essentials, at your pace.', empty: 'No products found', hint: 'Try a different search or category.', previous: 'Previous page', next: 'Next page', page: 'Page', navigation: 'Catalogue pagination' },
  es: { title: 'El catálogo', subtitle: 'Lo esencial, a tu ritmo.', empty: 'No se encontraron productos', hint: 'Prueba otra búsqueda o categoría.', previous: 'Página anterior', next: 'Página siguiente', page: 'Página', navigation: 'Paginación del catálogo' },
  zh: { title: '商品目录', subtitle: '日常所需，随心选购。', empty: '未找到商品', hint: '请尝试其他关键词或分类。', previous: '上一页', next: '下一页', page: '页', navigation: '目录分页' },
  ar: { title: 'كتالوج المنتجات', subtitle: 'احتياجاتك اليومية، على راحتك.', empty: 'لم يتم العثور على منتجات', hint: 'جرّب كلمة بحث أو فئة أخرى.', previous: 'الصفحة السابقة', next: 'الصفحة التالية', page: 'صفحة', navigation: 'صفحات الكتالوج' },
};

export const ProductBrowserModule: React.FC<ProductBrowserModuleProps> = ({
  products, language, onAddToCart, onToggleCompare, onToggleSave, onBrandClick, onProductClick, comparisonIds, comparisonEnabled = false, savedIds, currentPage, totalPages, totalItems, onPageChange,
}) => {
  const t = TRANSLATIONS[language];
  const copy = BROWSER_COPY[language];
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);
  const changePage = (page: number) => {
    onPageChange(page);
    document.getElementById('catalogue')?.scrollIntoView({ block: 'start' });
  };

  return (
    <section id="catalogue" aria-labelledby="catalogue-title" className="catalogue-section">
      <div className="catalogue-heading">
        <div><h2 id="catalogue-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
        <span className="catalogue-count" role="status">{totalItems ?? products.length} {t.itemsFound}</span>
      </div>
      {products.length ? (
        <div className="catalogue-grid">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onClick={onProductClick}
              onAddToCart={(product, store, city) => onAddToCart(product.id, store, city)}
              onToggleCompare={onToggleCompare} onToggleSave={onToggleSave}
              isComparing={comparisonEnabled && comparisonIds.includes(p.id)} comparisonEnabled={comparisonEnabled}
              isSaved={savedIds.includes(p.id)} onBrandClick={onBrandClick} language={language}
            />
          ))}
        </div>
      ) : <div className="catalogue-empty" role="status"><Icons.Search className="w-7 h-7" /><h3>{copy.empty}</h3><p>{copy.hint}</p></div>}
      {totalPages > 1 && (
        <nav className="catalogue-pagination" aria-label={copy.navigation}>
          <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1} aria-label={copy.previous}><Icons.ChevronRight className={`w-4 h-4 ${language === 'ar' ? '' : 'rotate-180'}`} /></button>
          {visiblePages.map((page, index) => <React.Fragment key={page}>
            {index > 0 && page - visiblePages[index - 1] > 1 && <span aria-hidden="true">…</span>}
            <button type="button" onClick={() => changePage(page)} aria-label={`${copy.page} ${page}`} aria-current={currentPage === page ? 'page' : undefined}>{page}</button>
          </React.Fragment>)}
          <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label={copy.next}><Icons.ChevronRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} /></button>
        </nav>
      )}
    </section>
  );
};
