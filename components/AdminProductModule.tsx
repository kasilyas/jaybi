
import React, { useState, useEffect, useCallback } from 'react';
import { Product, StoreName, Brand, PriceEntry } from '../types';
import { Icons, CATEGORY_VISUALS } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';
import {
  fetchDeletedProducts,
  activateProduct as apiActivateProduct,
  deactivateProduct as apiDeactivateProduct,
  restoreProduct as apiRestoreProduct,
} from '../lib/api';

interface ProductModuleProps {
  products: Product[];
  brands: Brand[];
  onSave: (p: Product) => void;
  onDelete: (id: string) => void;
  /** Active un produit (PATCH /products/:id/activate). Optionnel — sinon appel API direct. */
  onActivate?: (id: string) => Promise<void> | void;
  /** Désactive un produit (PATCH /products/:id/deactivate). Optionnel — sinon appel API direct. */
  onDeactivate?: (id: string) => Promise<void> | void;
  /** Restaure un produit supprimé (POST /products/:id/restore). Optionnel — sinon appel API direct. */
  onRestore?: (id: string) => Promise<void> | void;
}

/** Convertit une chaîne ISO en valeur pour un input datetime-local (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convertit une valeur datetime-local en chaîne ISO. Retourne null si vide. */
function toIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const ProductModule: React.FC<ProductModuleProps> = ({
  products,
  brands,
  onSave,
  onDelete,
  onActivate,
  onDeactivate,
  onRestore,
}) => {
  const [editing, setEditing] = useState<Product | null>(null);
  const [quickPricing, setQuickPricing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Vue : 'active' = produits actifs/inactifs (non supprimés), 'deleted' = corbeille
  const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const activeBrands = brands.filter(b => !b.isDeleted);

  const emptyProduct = (): Product => ({
    id: `PRD-${Date.now()}`,
    name: '',
    brand: activeBrands.length > 0 ? activeBrands[0].name : '',
    category: 'Epicerie',
    image: '',
    unit: 'unit',
    weight: 1,
    prices: [],
    isActive: true,
    discountPercent: null,
    flashSalePercent: null,
    flashSaleStartsAt: null,
    flashSaleEndsAt: null,
    flashSaleLabel: null,
    flashSaleActive: false,
    effectiveDiscountPercent: 0,
  });

  // Produits non supprimés (actifs + inactifs) pour la vue principale.
  const filtered = products.filter(
    p => !p.isDeleted && (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  // --- Chargement des produits supprimés (corbeille) ---
  const loadDeletedProducts = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const deleted = await fetchDeletedProducts();
      setDeletedProducts(deleted);
    } catch {
      // L'API peut être indisponible (dev sans backend) — on reste silencieux.
      setDeletedProducts([]);
    } finally {
      setLoadingDeleted(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'deleted') {
      loadDeletedProducts();
    }
  }, [viewMode, loadDeletedProducts]);

  const handleQuickPriceUpdate = (newPrices: PriceEntry[]) => {
    if (quickPricing) {
      onSave({ ...quickPricing, prices: newPrices });
      setQuickPricing(null);
    }
  };

  // --- Actions activate / deactivate / restore ---
  const handleActivate = async (p: Product) => {
    setActionLoadingId(p.id);
    try {
      if (onActivate) {
        await onActivate(p.id);
      } else {
        await apiActivateProduct(p.id);
      }
    } catch {
      /* silencieux : l'UI reste cohérente avec l'état parent */
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivate = async (p: Product) => {
    setActionLoadingId(p.id);
    try {
      if (onDeactivate) {
        await onDeactivate(p.id);
      } else {
        await apiDeactivateProduct(p.id);
      }
    } catch {
      /* silencieux */
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (p: Product) => {
    setActionLoadingId(p.id);
    try {
      if (onRestore) {
        await onRestore(p.id);
      } else {
        await apiRestoreProduct(p.id);
      }
      // Retirer de la liste locale des supprimés
      setDeletedProducts(prev => prev.filter(item => item.id !== p.id));
    } catch {
      /* silencieux */
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- Sauvegarde : conversion datetime-local -> ISO + inclusion des nouveaux champs ---
  const handleSave = () => {
    if (!editing) return;
    const payload: Product = {
      ...editing,
      isActive: editing.isActive ?? true,
      discountPercent: editing.discountPercent ?? null,
      flashSalePercent: editing.flashSalePercent ?? null,
      flashSaleStartsAt: toIso(toDatetimeLocal(editing.flashSaleStartsAt)),
      flashSaleEndsAt: toIso(toDatetimeLocal(editing.flashSaleEndsAt)),
      flashSaleLabel: editing.flashSaleLabel?.trim() || null,
      flashSaleActive: !!(editing.flashSalePercent && editing.flashSalePercent > 0),
      effectiveDiscountPercent: editing.effectiveDiscountPercent ?? 0,
    };
    onSave(payload);
    setEditing(null);
  };

  // --- Badges helpers ---
  const renderStatusBadge = (p: Product) => {
    if (p.isDeleted) {
      return (
        <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase border border-rose-100">
          Supprimé
        </span>
      );
    }
    if (p.isActive === false) {
      return (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase border border-slate-200">
          Inactif
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">
        Actif
      </span>
    );
  };

  const renderDiscountBadge = (p: Product) => {
    if (p.discountPercent && p.discountPercent > 0) {
      return (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase border border-amber-100">
          -{p.discountPercent}%
        </span>
      );
    }
    return null;
  };

  const renderFlashBadge = (p: Product) => {
    if (p.flashSaleActive && p.flashSalePercent && p.flashSalePercent > 0) {
      return (
        <span className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg text-[9px] font-black uppercase border border-rose-600 flex items-center gap-1">
          <Icons.Lightning className="scale-50" />
          Flash -{p.flashSalePercent}%
          {p.flashSaleLabel && <span className="opacity-80 normal-case">· {p.flashSaleLabel}</span>}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Toggle vue active / corbeille */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5">
            <button
              onClick={() => setViewMode('active')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Catalogue
            </button>
            <button
              onClick={() => setViewMode('deleted')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                viewMode === 'deleted' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-rose-500'
              }`}
            >
              <Icons.Trash className="scale-50" />
              Corbeille
              {deletedProducts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md text-[8px]">{deletedProducts.length}</span>
              )}
            </button>
          </div>
        </div>

        {viewMode === 'active' ? (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full max-w-md">
              <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 scale-75" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou marque..."
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none shadow-sm focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setEditing(emptyProduct())}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Icons.Plus className="scale-75" />
              Ajouter au Catalogue
            </button>
          </div>
        ) : (
          <button
            onClick={loadDeletedProducts}
            disabled={loadingDeleted}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-slate-400 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Icons.History className="scale-75" />
            {loadingDeleted ? 'Chargement...' : 'Rafraîchir la corbeille'}
          </button>
        )}
      </div>

      {/* ===================== VUE CATALOGUE (actifs + inactifs) ===================== */}
      {viewMode === 'active' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Produit Principal</th>
                <th className="px-8 py-5">Marque</th>
                <th className="px-8 py-5">Secteur</th>
                <th className="px-8 py-5">Statut & Promos</th>
                <th className="px-8 py-5">Points de Prix</th>
                <th className="px-8 py-5 text-right">Pilotage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-2 shadow-inner group-hover:scale-110 transition-transform">
                        <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.weight} {p.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 shadow-sm">
                      {p.brand}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderStatusBadge(p)}
                      {renderDiscountBadge(p)}
                      {renderFlashBadge(p)}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button onClick={() => setQuickPricing(p)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-all group/price">
                      <span className="text-xs font-black text-slate-900">{p.prices.length}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover/price:text-emerald-600">Points</span>
                      <Icons.Tag className="scale-50 text-slate-300 group-hover/price:text-emerald-500" />
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      {/* Activate / Deactivate */}
                      {p.isActive === false ? (
                        <button
                          onClick={() => handleActivate(p)}
                          disabled={actionLoadingId === p.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
                          title="Activer le produit"
                        >
                          <Icons.Check className="scale-75" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(p)}
                          disabled={actionLoadingId === p.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm disabled:opacity-50"
                          title="Désactiver le produit"
                        >
                          <Icons.Lock className="scale-75" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(p)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                        title="Modifier les données maître"
                      >
                        <Icons.Edit className="scale-75" />
                      </button>
                      <button
                        onClick={() => setDeletingId(p.id)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-rose-300 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                        title="Archiver ce produit"
                      >
                        <Icons.Trash className="scale-75" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest">Aucun produit trouvé dans le catalogue</p>
            </div>
          )}
        </div>
      )}

      {/* ===================== VUE CORBEILLE (produits supprimés) ===================== */}
      {viewMode === 'deleted' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-rose-50/50 text-[9px] font-black text-rose-400 uppercase border-b border-rose-100">
              <tr>
                <th className="px-8 py-5">Produit Supprimé</th>
                <th className="px-8 py-5">Marque</th>
                <th className="px-8 py-5">Secteur</th>
                <th className="px-8 py-5 text-right">Restauration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deletedProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-2 shadow-inner opacity-60">
                        <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-500 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase">{p.weight} {p.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-400 shadow-sm">
                      {p.brand}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase border border-slate-100">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button
                      onClick={() => handleRestore(p)}
                      disabled={actionLoadingId === p.id}
                      className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 ml-auto"
                      title="Restaurer ce produit"
                    >
                      <Icons.History className="scale-75" />
                      Restaurer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deletedProducts.length === 0 && !loadingDeleted && (
            <div className="p-20 text-center">
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest">Aucun produit supprimé — la corbeille est vide</p>
            </div>
          )}
          {loadingDeleted && deletedProducts.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest">Chargement des produits supprimés...</p>
            </div>
          )}
        </div>
      )}

      <AdminModal title="Fiche Master Produit" isOpen={!!editing} onClose={() => setEditing(null)} width="max-w-4xl">
        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Nom Commercial</label>
                <input
                  placeholder="Ex: Huile de Table Lesieur 5L"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Marque Partenaire</label>
                <select
                  value={editing.brand}
                  onChange={e => setEditing({ ...editing, brand: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold text-sm outline-none appearance-none"
                >
                  {activeBrands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  {activeBrands.length === 0 && <option value="">Aucune marque configurée</option>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Catégorie</label>
                  <select
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-black uppercase text-[10px] outline-none"
                  >
                    {Object.keys(CATEGORY_VISUALS).filter(k => k !== 'default').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Unité de mesure</label>
                  <select
                    value={editing.unit}
                    onChange={e => setEditing({ ...editing, unit: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-black uppercase text-[10px] outline-none"
                  >
                    <option value="unit">Unité</option><option value="kg">KG</option><option value="L">Litre</option><option value="g">Gramme</option><option value="ml">ML</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Visual (URL)</label>
                <input
                  placeholder="https://..."
                  value={editing.image}
                  onChange={e => setEditing({ ...editing, image: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[10px] font-mono outline-none"
                />
              </div>

              {/* --- Activation toggle --- */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div>
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Statut du produit</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    {(editing.isActive ?? true) ? 'Visible côté client' : 'Masqué côté client'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, isActive: !(editing.isActive ?? true) })}
                  className={`relative w-14 h-8 rounded-full transition-colors ${(editing.isActive ?? true) ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  title="Activer / désactiver"
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${(editing.isActive ?? true) ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* --- Remise générale --- */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Remise générale (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={editing.discountPercent ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                    setEditing({ ...editing, discountPercent: val });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold focus:bg-white focus:border-amber-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* --- Section Vente Flash (groupée) --- */}
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-[2rem] p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Icons.Lightning className="scale-75 text-rose-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Vente Flash</h4>
                </div>

                <div>
                  <label className="text-[9px] font-black text-rose-400 uppercase block mb-2 tracking-widest">Réduction flash (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={editing.flashSalePercent ?? ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                      setEditing({ ...editing, flashSalePercent: val });
                    }}
                    className="w-full bg-white border border-rose-200 rounded-xl py-4 px-6 font-bold focus:border-rose-400 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-rose-400 uppercase block mb-2 tracking-widest">Début flash vente</label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(editing.flashSaleStartsAt)}
                      onChange={e => setEditing({ ...editing, flashSaleStartsAt: e.target.value ? toIso(e.target.value) : null })}
                      className="w-full bg-white border border-rose-200 rounded-xl py-4 px-4 text-[10px] font-bold focus:border-rose-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-rose-400 uppercase block mb-2 tracking-widest">Fin flash vente</label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(editing.flashSaleEndsAt)}
                      onChange={e => setEditing({ ...editing, flashSaleEndsAt: e.target.value ? toIso(e.target.value) : null })}
                      className="w-full bg-white border border-rose-200 rounded-xl py-4 px-4 text-[10px] font-bold focus:border-rose-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-rose-400 uppercase block mb-2 tracking-widest">Label flash vente (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Offre éclair Ramadan"
                    value={editing.flashSaleLabel ?? ''}
                    onChange={e => setEditing({ ...editing, flashSaleLabel: e.target.value || null })}
                    className="w-full bg-white border border-rose-200 rounded-xl py-4 px-6 text-[11px] font-bold focus:border-rose-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* --- Cartographie des Prix (déplacée sous la section flash) --- */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cartographie des Prix</h4>
                  <button
                    type="button"
                    onClick={() => setEditing({
                      ...editing,
                      prices: [...editing.prices, { store: StoreName.MARJANE, city: 'Casablanca', price: 0, lastUpdated: new Date().toISOString(), available: true }]
                    })}
                    className="text-[8px] bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-md"
                  >
                    + Ajouter un point de prix
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[260px] no-scrollbar space-y-3">
                  {editing.prices.map((pr, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-right-2">
                      <select
                        value={pr.store}
                        onChange={e => { const n = [...editing.prices]; n[idx].store = e.target.value; setEditing({ ...editing, prices: n }); }}
                        className="text-[9px] font-black uppercase bg-slate-50 border border-slate-100 p-2 rounded-lg flex-1"
                      >
                        {Object.values(StoreName).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="relative">
                        <input
                          type="number" step="0.01"
                          value={pr.price}
                          onChange={e => { const n = [...editing.prices]; n[idx].price = Number(e.target.value); setEditing({ ...editing, prices: n }); }}
                          className="w-20 text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 p-2 pr-6 rounded-lg outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-emerald-400">DH</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { const n = editing.prices.filter((_, i) => i !== idx); setEditing({ ...editing, prices: n }); }}
                        className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Icons.Minus className="scale-75" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <button
                onClick={handleSave}
                className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"
              >
                <Icons.Check />
                Enregistrer dans le Catalogue Maître
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* QUICK PRICE UPDATE MODAL */}
      <AdminModal title="Quick Price Update" isOpen={!!quickPricing} onClose={() => setQuickPricing(null)} width="max-w-lg">
        {quickPricing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <img src={quickPricing.image} className="w-12 h-12 object-contain" />
              <div>
                <p className="text-sm font-black text-slate-900">{quickPricing.name}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{quickPricing.brand}</p>
              </div>
            </div>
            <div className="space-y-3">
              {quickPricing.prices.map((pr, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black uppercase text-slate-400">
                      {pr.store[0]}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-900 uppercase">{pr.store}</p>
                      <p className="text-[7px] text-slate-400 font-bold uppercase">{pr.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01"
                      value={pr.price}
                      onChange={(e) => {
                        const n = [...quickPricing.prices];
                        n[idx] = { ...n[idx], price: Number(e.target.value), lastUpdated: new Date().toISOString() };
                        setQuickPricing({ ...quickPricing, prices: n });
                      }}
                      className="w-20 text-right text-xs font-black text-emerald-600 bg-emerald-50 p-2 rounded-lg outline-none"
                    />
                    <span className="text-[8px] font-black text-slate-300">DH</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleQuickPriceUpdate(quickPricing.prices)}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all mt-4"
            >
              Mettre à jour les tarifs
            </button>
          </div>
        )}
      </AdminModal>

      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};
