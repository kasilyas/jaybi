
import React from 'react';
import { SecurityAlert } from '../types';
import { Icons } from '../constants';

interface AdminSecurityModuleProps {
  alerts: SecurityAlert[];
  suspendedUsers: any[];
  onResolveAlert: (id: string) => void;
  onUnsuspend: (id: string) => void;
}

const severityStyles: Record<SecurityAlert['severity'], { bg: string; text: string; border: string; label: string }> = {
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', label: 'Faible' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: 'Moyenne' },
  high: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', label: 'Élevée' },
  critical: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', label: 'Critique' },
};

export const AdminSecurityModule: React.FC<AdminSecurityModuleProps> = ({ alerts, suspendedUsers, onResolveAlert, onUnsuspend }) => {
  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="space-y-10 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Sécurité & Anti-Injection</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Alertes prompt injection & utilisateurs suspendus</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border shadow-sm ${unresolvedCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${unresolvedCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${unresolvedCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {unresolvedCount} alerte{unresolvedCount > 1 ? 's' : ''} non résolue{unresolvedCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* --- Alertes de sécurité --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Alertes d'Injection</h4>
          <Icons.Bell className="text-rose-500" />
        </div>
        {alerts.length === 0 ? (
          <div className="p-20 text-center opacity-30">
            <p className="text-xs font-black uppercase tracking-widest">Aucune alerte de sécurité</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Utilisateur</th>
                  <th className="px-6 py-5">Sévérité</th>
                  <th className="px-6 py-5">Score</th>
                  <th className="px-6 py-5">Motifs</th>
                  <th className="px-6 py-5">Endpoint</th>
                  <th className="px-6 py-5">Statut</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map(alert => {
                  const sev = severityStyles[alert.severity] || severityStyles.medium;
                  return (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="px-6 py-5 text-[10px] font-mono text-slate-400 whitespace-nowrap">{new Date(alert.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-5 text-xs font-bold text-slate-700">{alert.userEmail || 'Anonyme'}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{alert.score}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {alert.patterns.map(p => (
                            <span key={p} className="px-2 py-1 bg-slate-100 rounded-md text-[8px] font-black uppercase tracking-wider text-slate-600 border border-slate-200">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[10px] font-mono text-slate-500">{alert.endpoint}</td>
                      <td className="px-6 py-5">
                        {alert.resolved ? (
                          <span className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">Résolu</span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">En attente</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {!alert.resolved && (
                          <button
                            onClick={() => onResolveAlert(alert.id)}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 active:scale-95 transition-all"
                          >
                            Résoudre
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Utilisateurs suspendus --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Utilisateurs Suspendus</h4>
          <Icons.Lightning className="text-amber-500" />
        </div>
        {suspendedUsers.length === 0 ? (
          <div className="p-20 text-center opacity-30">
            <p className="text-xs font-black uppercase tracking-widest">Aucun utilisateur suspendu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-5">Nom</th>
                  <th className="px-6 py-5">Email</th>
                  <th className="px-6 py-5">Raison</th>
                  <th className="px-6 py-5">Suspendu le</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suspendedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 text-xs font-black text-slate-900">{u.name || '—'}</td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-700">{u.email}</td>
                    <td className="px-6 py-5 text-[10px] font-medium text-slate-500">{u.reason || u.suspendReason || 'Non spécifiée'}</td>
                    <td className="px-6 py-5 text-[10px] font-mono text-slate-400 whitespace-nowrap">{u.suspendedAt || u.createdAt ? new Date(u.suspendedAt || u.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => onUnsuspend(u.id)}
                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/10"
                      >
                        Réactiver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
