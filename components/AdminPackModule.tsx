
import React, { useState } from 'react';
import { Pack, Product } from '../types';
import { Icons, THEME_CONFIG } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

export const PackModule: React.FC<{ packs: Pack[]; products: Product[]; onSave: (p: Pack) => void; onDelete: (id: string) => void }> = ({ packs, products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Pack | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const emptyPack = (): Pack => ({ 
    id: `PK-${Date.now()}`, 
    name: '', 
    description: '', 
    productIds: [], 
    image: '📦', 
    theme: 'standard', 
    type: 'bundle', 
    discountPercent: 10,
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const filteredProd = products.filter(p => !p.isDeleted && p.name.toLowerCase().includes(productSearch.toLowerCase()));

  // Formatter la date ISO vers datetime-local (YYYY-MM-DDTHH:mm)
  const formatToInput = (iso?: string) => {
    if (!iso) return "";
    return iso.slice(0, 16);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase">Packs Promo</h3>
        <button onClick={() => setEditing(emptyPack())} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Nouveau Pack</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {packs.filter(p=>!p.isDeleted).map(p => (
          <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">{p.image}</div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{p.productIds.length} articles • {p.discountPercent}% OFF</p>
                <p className="text-[8px] text-emerald-500 font-bold uppercase mt-1">
                  Du {new Date(p.startsAt || "").toLocaleString()} au {new Date(p.expiresAt || "").toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(p)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Icons.Plus className="scale-75"/></button>
              <button onClick={() => setDeletingId(p.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Icons.Minus className="scale-75"/></button>
            </div>
          </div>
        ))}
      </div>
      <AdminModal title="Éditeur de Pack D2C" isOpen={!!editing} onClose={() => setEditing(null)} width="max-w-4xl">
        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <input placeholder="Nom du pack" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold" />
              <textarea placeholder="Description" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm h-24" />
              
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Remise %" value={editing.discountPercent} onChange={e => setEditing({...editing, discountPercent: Number(e.target.value)})} className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-4 px-6 font-black text-emerald-600" />
                <select value={editing.theme} onChange={e => setEditing({...editing, theme: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-black uppercase text-[10px]">
                  {Object.keys(THEME_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Période de validité</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Date de début</label>
                    <input 
                      type="datetime-local" 
                      value={formatToInput(editing.startsAt)} 
                      onChange={e => setEditing({...editing, startsAt: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Date de fin</label>
                    <input 
                      type="datetime-local" 
                      value={formatToInput(editing.expiresAt)} 
                      onChange={e => setEditing({...editing, expiresAt: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl flex flex-col max-h-[500px]">
              <div className="relative mb-4">
                <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 scale-75" />
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Ajouter un article..." className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold" />
              </div>
              <div className="overflow-y-auto space-y-2 no-scrollbar">
                {filteredProd.map(p => {
                  const selected = editing.productIds.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => { const ids = selected ? editing.productIds.filter(id=>id!==p.id) : [...editing.productIds, p.id]; setEditing({...editing, productIds: ids}); }} className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${selected ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
                      <span className="text-[10px] font-bold text-slate-700">{p.name}</span>
                      {selected && <Icons.Check className="text-emerald-500 scale-75" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => { onSave(editing); setEditing(null); }} className="md:col-span-2 py-6 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase shadow-2xl">Publier le Pack</button>
          </div>
        )}
      </AdminModal>
      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};
