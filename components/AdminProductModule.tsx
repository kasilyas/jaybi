
import React, { useState } from 'react';
import { Product, StoreName, Brand, PriceEntry } from '../types';
import { Icons, CATEGORY_VISUALS } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

interface ProductModuleProps {
  products: Product[];
  brands: Brand[];
  onSave: (p: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductModule: React.FC<ProductModuleProps> = ({ products, brands, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Product | null>(null);
  const [quickPricing, setQuickPricing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const activeBrands = brands.filter(b => !b.isDeleted);

  const emptyProduct = (): Product => ({
    id: `PRD-${Date.now()}`, 
    name: '', 
    brand: activeBrands.length > 0 ? activeBrands[0].name : '', 
    category: 'Epicerie', 
    image: '', 
    unit: 'unit', 
    weight: 1, 
    prices: []
  });

  const filtered = products.filter(p => !p.isDeleted && (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())));

  const handleQuickPriceUpdate = (newPrices: PriceEntry[]) => {
    if (quickPricing) {
      onSave({ ...quickPricing, prices: newPrices });
      setQuickPricing(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all flex items-center gap-2"
        >
          <Icons.Plus className="scale-75" />
          Ajouter au Catalogue
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Produit Principal</th>
              <th className="px-8 py-5">Marque Partenaire</th>
              <th className="px-8 py-5">Secteur</th>
              <th className="px-8 py-5">Points de Prix</th>
              <th className="px-8 py-5 text-right">Pilotage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-2 shadow-inner group-hover:scale-110 transition-transform">
                    <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.weight} {p.unit}</p>
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
                  <button onClick={() => setQuickPricing(p)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-all group/price">
                    <span className="text-xs font-black text-slate-900">{p.prices.length}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover/price:text-emerald-600">Points</span>
                    <Icons.Tag className="scale-50 text-slate-300 group-hover/price:text-emerald-500" />
                  </button>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <AdminModal title="Fiche Master Produit" isOpen={!!editing} onClose={() => setEditing(null)} width="max-w-4xl">
        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Nom Commercial</label>
                <input 
                  placeholder="Ex: Huile de Table Lesieur 5L" 
                  value={editing.name} 
                  onChange={e => setEditing({...editing, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold focus:bg-white focus:border-slate-900 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Marque Partenaire</label>
                <select 
                  value={editing.brand} 
                  onChange={e => setEditing({...editing, brand: e.target.value})} 
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
                    onChange={e => setEditing({...editing, category: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-black uppercase text-[10px] outline-none"
                  >
                    {Object.keys(CATEGORY_VISUALS).filter(k=>k!=='default').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Unité de mesure</label>
                  <select 
                    value={editing.unit} 
                    onChange={e => setEditing({...editing, unit: e.target.value as any})} 
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
                  onChange={e => setEditing({...editing, image: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[10px] font-mono outline-none" 
                 />
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cartographie des Prix</h4>
                <button 
                  type="button" 
                  onClick={() => setEditing({...editing, prices: [...editing.prices, { store: StoreName.MARJANE, city: 'Casablanca', price: 0, lastUpdated: new Date().toISOString(), available: true }]})} 
                  className="text-[8px] bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-md"
                >
                  + Ajouter un point de prix
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[300px] no-scrollbar space-y-3">
                {editing.prices.map((pr, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-right-2">
                    <select 
                      value={pr.store} 
                      onChange={e => { const n = [...editing.prices]; n[idx].store = e.target.value; setEditing({...editing, prices: n}); }} 
                      className="text-[9px] font-black uppercase bg-slate-50 border border-slate-100 p-2 rounded-lg flex-1"
                    >
                      {Object.values(StoreName).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="relative">
                      <input 
                        type="number" step="0.01" 
                        value={pr.price} 
                        onChange={e => { const n = [...editing.prices]; n[idx].price = Number(e.target.value); setEditing({...editing, prices: n}); }} 
                        className="w-20 text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 p-2 pr-6 rounded-lg outline-none" 
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-emerald-400">DH</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { const n = editing.prices.filter((_, i) => i !== idx); setEditing({...editing, prices: n}); }} 
                      className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Icons.Minus className="scale-75" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 pt-6">
              <button 
                onClick={() => { onSave(editing); setEditing(null); }} 
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
