
import React, { useState } from 'react';
import { PromoCode } from '../types';
import { Icons } from '../constants';
import { AdminModal, DeleteConfirmation } from './AdminShared';

export const PromoModule: React.FC<{ promoCodes: PromoCode[]; onSave: (p: PromoCode) => void; onDelete: (id: string) => void }> = ({ promoCodes, onSave, onDelete }) => {
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyPromo = (): PromoCode => ({
    id: `PRM-${Date.now()}`,
    code: '',
    discountType: 'fixed',
    discountValue: 0,
    maxUses: 100,
    currentUses: 0,
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true,
    minOrderAmount: 0
  });

  const formatToInput = (iso?: string) => {
    if (!iso) return "";
    return iso.slice(0, 16);
  };

  const activePromos = promoCodes.filter(c => !c.isDeleted);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase">Codes Coupons</h3>
        <button onClick={() => setEditing(emptyPromo())} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Créer Coupon</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {activePromos.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-mono font-black text-xl shadow-inner">%</div>
              <div>
                <p className="text-sm font-black text-slate-900 font-mono tracking-widest">{c.code}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{c.discountValue}{c.discountType === 'percent' ? '%' : ' DH'} • {c.currentUses}/{c.maxUses} utilisés</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                   Exp: {new Date(c.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(c)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Icons.Plus className="scale-75"/></button>
              <button onClick={() => setDeletingId(c.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Icons.Minus className="scale-75"/></button>
            </div>
          </div>
        ))}
      </div>

      <AdminModal title="Configuration Coupon" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Code Public</label>
              <input required type="text" value={editing.code} onChange={e => setEditing({...editing, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-mono font-black text-lg tracking-widest text-center" placeholder="EX: RAMADAN20" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Type Remise</label>
                <select value={editing.discountType} onChange={e => setEditing({...editing, discountType: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[10px] font-black uppercase">
                  <option value="fixed">Montant Fixe (DH)</option>
                  <option value="percent">Pourcentage (%)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Valeur</label>
                <input required type="number" value={editing.discountValue} onChange={e => setEditing({...editing, discountValue: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Utilisations Max</label>
                <input required type="number" value={editing.maxUses} onChange={e => setEditing({...editing, maxUses: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Commande Min (DH)</label>
                <input required type="number" value={editing.minOrderAmount || 0} onChange={e => setEditing({...editing, minOrderAmount: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Validité du Coupon</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Début de validité</label>
                    <input 
                      type="datetime-local" 
                      value={formatToInput(editing.startsAt)} 
                      onChange={e => setEditing({...editing, startsAt: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Expiration</label>
                    <input 
                      type="datetime-local" 
                      value={formatToInput(editing.expiresAt)} 
                      onChange={e => setEditing({...editing, expiresAt: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" 
                    />
                  </div>
                </div>
            </div>

            <button onClick={() => { onSave(editing); setEditing(null); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Enregistrer Coupon</button>
          </div>
        )}
      </AdminModal>
      <DeleteConfirmation isOpen={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={() => { onDelete(deletingId!); setDeletingId(null); }} />
    </div>
  );
};
