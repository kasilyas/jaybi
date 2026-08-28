import React from 'react';
import { Icons } from '../constants';

export const AdminModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode; width?: string }> = ({ title, isOpen, onClose, children, width = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className={`relative w-full ${width} bg-white rounded-[3rem] p-12 shadow-4xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar`}>
        <header className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors"><Icons.Minus /></button>
        </header>
        {children}
      </div>
    </div>
  );
};

export const DeleteConfirmation: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, onConfirm, onCancel }) => (
  <AdminModal title="Confirmer" isOpen={isOpen} onClose={onCancel}>
    <div className="text-center">
      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Icons.Minus className="scale-150"/></div>
      <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">Cette action est irréversible pour l'interface client.</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-rose-600 transition-all">Archiver l'élément</button>
        <button onClick={onCancel} className="w-full py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Annuler</button>
      </div>
    </div>
  </AdminModal>
);