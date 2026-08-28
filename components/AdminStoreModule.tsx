
import React, { useState } from 'react';
import { Store } from '../types';
import { Icons } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

export const StoreModule: React.FC<{ stores: Store[]; onSave: (s: Store) => void; onDelete: (id: string) => void }> = ({ stores, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Store | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const emptyStore = (): Store => ({ id: `STR-${Date.now()}`, name: '', logo: '', color: 'bg-slate-500', isActive: true });
  
  const activeStores = stores.filter(s => !s.isDeleted);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase">Enseignes</h3>
        <button onClick={() => setEditing(emptyStore())} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Nouvelle Enseigne</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeStores.map(s => (
          <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group relative">
            <div className="w-16 h-16 mx-auto mb-4 border border-slate-50 rounded-xl p-3 flex items-center justify-center">
              <img src={s.logo || 'https://via.placeholder.com/150'} className="max-w-full max-h-full object-contain" />
            </div>
            <h4 className="text-sm font-black text-slate-900 uppercase mb-4">{s.name || 'Enseigne'}</h4>
            <div className="flex flex-col gap-2">
              <button onClick={() => onSave({...s, isActive: !s.isActive})} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase shadow-sm ${s.isActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{s.isActive ? 'Actif' : 'Inactif'}</button>
              <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(s)} className="p-2 text-slate-300 hover:text-slate-900"><Icons.Plus className="scale-75"/></button>
                <button onClick={() => setDeletingId(s.id)} className="p-2 text-slate-300 hover:text-rose-500"><Icons.Minus className="scale-75"/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AdminModal title="Configuration Enseigne" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-6">
            <input placeholder="Nom" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold" />
            <input placeholder="Logo URL" value={editing.logo} onChange={e => setEditing({...editing, logo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-xs font-mono" />
            <button onClick={() => { onSave(editing); setEditing(null); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Enregistrer</button>
          </div>
        )}
      </AdminModal>
      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};
