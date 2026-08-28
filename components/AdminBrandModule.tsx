
import React, { useState } from 'react';
import { Brand } from '../types';
import { Icons } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

export const BrandModule: React.FC<{ brands: Brand[]; onSave: (b: Brand) => void; onDelete: (id: string) => void }> = ({ brands, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const emptyBrand = (): Brand => ({ id: `BRD-${Date.now()}`, name: '', logo: '' });
  const activeBrands = brands.filter(b => !b.isDeleted && b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 scale-75" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher une marque..." className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none shadow-sm" />
        </div>
        <button onClick={() => setEditing(emptyBrand())} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Nouvelle Marque</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {activeBrands.map(b => (
          <div key={b.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center group relative hover:border-emerald-500 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-2xl flex items-center justify-center p-2 border border-slate-100 group-hover:scale-110 transition-transform">
              {b.logo ? <img src={b.logo} className="max-w-full max-h-full object-contain" alt={b.name} /> : <div className="text-xl font-black text-slate-300">{b.name[0]}</div>}
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase truncate">{b.name}</h4>
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(b)} className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-slate-900"><Icons.Plus className="scale-50"/></button>
                <button onClick={() => setDeletingId(b.id)} className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-rose-300 hover:text-rose-500"><Icons.Minus className="scale-50"/></button>
            </div>
          </div>
        ))}
      </div>

      <AdminModal title="Configuration Marque" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Nom de la marque</label>
              <input required value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Logo URL (Optionnel)</label>
              <input value={editing.logo || ''} onChange={e => setEditing({...editing, logo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-xs font-mono" />
            </div>
            <button onClick={() => { onSave(editing); setEditing(null); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Enregistrer</button>
          </div>
        )}
      </AdminModal>
      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};
