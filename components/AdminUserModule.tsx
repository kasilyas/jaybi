import React, { useState } from 'react';
import { User } from '../types';
import { Icons } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

export const UserCRMModule: React.FC<{ users: User[]; onSave: (u: User) => void; onDelete: (id: string) => void }> = ({ users, onSave, onDelete }) => {
  const [editing, setEditing] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyUser = (): User => ({ id: `USR-${Date.now()}`, name: '', email: '', role: 'customer', tier: 'free', savingsScore: 0, isPremium: false, addresses: [] });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase">Gestion des Membres</h3>
        <button onClick={() => setEditing(emptyUser())} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Nouveau Membre</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {users.filter(u => !u.isDeleted).map(u => (
          <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black shadow-lg">{u.name[0]}</div>
              <div><p className="text-sm font-black text-slate-900">{u.name}</p><p className="text-[10px] text-slate-400 font-bold">{u.email}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(u)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Icons.Plus className="scale-75"/></button>
              <button onClick={() => setDeletingId(u.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Icons.Minus className="scale-75"/></button>
            </div>
          </div>
        ))}
      </div>
      <AdminModal title="Fiche Membre" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-6">
            <input placeholder="Nom" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold" />
            <input placeholder="Email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-bold" />
            <div className="grid grid-cols-2 gap-4">
              <select value={editing.role} onChange={e => setEditing({...editing, role: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[10px] font-black uppercase">
                <option value="customer">Client</option><option value="contributor">Contributeur</option><option value="admin">Admin</option>
              </select>
              <select value={editing.tier} onChange={e => setEditing({...editing, tier: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[10px] font-black uppercase">
                <option value="free">Gratuit</option><option value="pack1">Pack 1</option><option value="pack2">Pack 2</option><option value="unlimited">Illimité</option>
              </select>
            </div>
            <button onClick={() => { onSave(editing); setEditing(null); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Sauvegarder</button>
          </div>
        )}
      </AdminModal>
      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};