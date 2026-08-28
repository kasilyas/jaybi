
import React, { useState } from 'react';
import { PriceReport, Product, StoreName } from '../types';
import { Icons, STORES } from '../constants';

interface AdminReportsModuleProps {
  reports: PriceReport[];
  products: Product[];
  onUpdateReports: (reports: PriceReport[]) => void;
  onAddLog: (action: string, details: string, type: any) => void;
}

export const AdminReportsModule: React.FC<AdminReportsModuleProps> = ({ reports, products, onUpdateReports, onAddLog }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');

  const filteredReports = reports.filter(r => filter === 'all' || r.status === filter);

  const handleAction = (reportId: string, status: 'verified' | 'rejected') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    onUpdateReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
    onAddLog(
      status === 'verified' ? 'REPORT_VERIFIED' : 'REPORT_REJECTED',
      `Signalement ${reportId} ${status === 'verified' ? 'validé' : 'rejeté'} par l'admin`,
      status === 'verified' ? 'success' : 'danger'
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase">Signalements Terrain</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Vérification des retours utilisateurs</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
           {['pending', 'verified', 'rejected', 'all'].map(f => (
             <button 
               key={f}
               onClick={() => setFilter(f as any)}
               className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'}`}
             >
               {f === 'pending' ? 'En attente' : f === 'verified' ? 'Validés' : f === 'rejected' ? 'Rejetés' : 'Tous'}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredReports.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center opacity-30">
             <p className="text-xs font-black uppercase tracking-widest">Aucun signalement à traiter</p>
          </div>
        ) : (
          filteredReports.map(report => {
            const product = products.find(p => p.id === report.productId);
            return (
              <div key={report.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10 hover:border-emerald-500 transition-all group">
                 <div className="shrink-0 flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                       <img src={product?.image} className="h-full w-full object-contain mix-blend-multiply" alt="" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-900 uppercase">{report.productName}</p>
                       <div className="flex items-center gap-2 mt-1">
                          <img src={STORES[report.store as StoreName]?.logo} className="h-2 w-auto grayscale" alt="" />
                          <p className="text-[8px] font-black text-slate-400 uppercase">{report.store} • {report.city}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-8">
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Prix signalé</p>
                          <p className="text-xl font-black text-rose-600">{report.reportedPrice.toFixed(2)} DH</p>
                       </div>
                       <div className="w-px h-8 bg-slate-100" />
                       <div className="flex-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Commentaire utilisateur</p>
                          <p className="text-xs font-medium text-slate-700 italic">
                             {report.comment ? `"${report.comment}"` : "Aucun commentaire laissé"}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Utilisateur : {report.userEmail}</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase">• {new Date(report.timestamp).toLocaleString()}</p>
                    </div>
                 </div>

                 {report.status === 'pending' && (
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAction(report.id, 'verified')}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 active:scale-95 transition-all"
                      >
                         Valider
                      </button>
                      <button 
                        onClick={() => handleAction(report.id, 'rejected')}
                        className="px-6 py-3 bg-white border border-slate-200 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all"
                      >
                         Rejeter
                      </button>
                   </div>
                 )}
                 {report.status !== 'pending' && (
                    <div className="flex items-center">
                       <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${report.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {report.status === 'verified' ? 'Vérifié' : 'Rejeté'}
                       </span>
                    </div>
                 )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
