
import React, { useState, useMemo } from 'react';
import { ScrapingSyncRun, SyncConfig, ScrapingStatus, SyncChanges } from '../types';
import { Icons } from '../constants';

interface AdminSyncCenterProps {
  runs: ScrapingSyncRun[];
  status: ScrapingStatus[];
  configs: SyncConfig[];
  onDryRun: (adapter: string, csv?: string) => Promise<{ runId: string; changes: SyncChanges }>;
  onApprove: (runId: string) => Promise<void>;
  onReject: (runId: string) => Promise<void>;
  onImportCsv: (adapter: string, csv: string) => Promise<{ runId: string; changes: SyncChanges }>;
  onUpdateConfig: (adapter: string, data: any) => Promise<void>;
}

const statusBadgeStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: 'Terminé' },
  failed: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', label: 'Échec' },
  dry_run: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', label: 'Dry-run' },
  rejected: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Rejeté' },
  running: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: 'En cours' },
  pending: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', label: 'En attente' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: 'Approuvé' },
};

const sourceTypeBadge: Record<string, { bg: string; text: string; label: string }> = {
  scraper: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Scraper' },
  api: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'API' },
  csv: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'CSV' },
};

export const AdminSyncCenter: React.FC<AdminSyncCenterProps> = ({
  runs,
  status,
  configs,
  onDryRun,
  onApprove,
  onReject,
  onImportCsv,
  onUpdateConfig,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ runId: string; changes: SyncChanges; adapter: string } | null>(null);
  const [configModal, setConfigModal] = useState<SyncConfig | null>(null);
  const [importModal, setImportModal] = useState<SyncConfig | null>(null);
  const [csvText, setCsvText] = useState('');
  const [configDraft, setConfigDraft] = useState<Partial<SyncConfig>>({});

  // --- Statut global ---
  const globalStats = useMemo(() => {
    const lastRun = status
      .map(s => s.lastRunAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
    const activeAdapters = status.filter(s => s.enabled).length;
    const totalProducts = status.reduce((sum, s) => sum + (s.lastProductsFound || 0), 0);
    // Prochain sync : on prend le cron le plus tôt (approximation — affiche le cron du 1er adaptateur actif).
    const nextAdapter = status.find(s => s.enabled && s.cronSchedule);
    return {
      lastRun,
      nextCron: nextAdapter?.cronSchedule || '—',
      activeAdapters,
      totalProducts,
    };
  }, [status]);

  const runOp = async <T,>(op: () => Promise<T>, errMsg: string): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      const res = await op();
      return res;
    } catch (e: any) {
      console.error(errMsg, e);
      setError(e?.message || errMsg);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleDryRun = async (adapter: string, csv?: string) => {
    const res = await runOp(() => onDryRun(adapter, csv), 'Erreur dry-run');
    if (res) setPreview({ runId: res.runId, changes: res.changes, adapter });
  };

  const handleApprove = async () => {
    if (!preview) return;
    const ok = await runOp(() => onApprove(preview.runId), 'Erreur approbation');
    if (ok !== null) setPreview(null);
  };

  const handleReject = async () => {
    if (!preview) return;
    const ok = await runOp(() => onReject(preview.runId), 'Erreur rejet');
    if (ok !== null) setPreview(null);
  };

  const handleImport = async () => {
    if (!importModal || !csvText.trim()) return;
    const res = await runOp(() => onImportCsv(importModal.adapter, csvText), 'Erreur import CSV');
    if (res) {
      setPreview({ runId: res.runId, changes: res.changes, adapter: importModal.adapter });
      setImportModal(null);
      setCsvText('');
    }
  };

  const openConfig = (cfg: SyncConfig) => {
    setConfigDraft({ ...cfg });
    setConfigModal(cfg);
  };

  const saveConfig = async () => {
    if (!configModal) return;
    const ok = await runOp(() => onUpdateConfig(configModal.adapter, configDraft), 'Erreur mise à jour config');
    if (ok !== null) setConfigModal(null);
  };

  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

  const deltaPct = (oldP: number, newP: number) => {
    if (!oldP || oldP === 0) return '—';
    const d = ((newP - oldP) / oldP) * 100;
    return `${d > 0 ? '+' : ''}${d.toFixed(1)}%`;
  };

  return (
    <div className="space-y-10 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sync Center</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Synchronisation des prix & catalogue</p>
        </div>
        <button
          onClick={() => handleDryRun(configs[0]?.adapter || 'marjane')}
          disabled={busy || configs.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-40 shadow-lg"
        >
          <Icons.RefreshCw className={busy ? 'animate-spin' : ''} />
          Sync global
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-2xl text-xs font-bold">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 text-sm font-black">✕</button>
        </div>
      )}

      {/* --- A. Statut global --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Dernier sync', value: globalStats.lastRun ? fmtDate(globalStats.lastRun) : '—', icon: <Icons.Clock className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Prochain sync', value: globalStats.nextCron, icon: <Icons.Activity className="text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Adaptateurs actifs', value: `${globalStats.activeAdapters} / ${status.length}`, icon: <Icons.RefreshCw className="text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Produits synchronisés', value: globalStats.totalProducts, icon: <Icons.Package className="text-indigo-500" />, bg: 'bg-indigo-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>{s.icon}</div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{s.label}</p>
            <p className="text-lg font-black text-slate-900 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* --- B. Adaptateurs --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Adaptateurs</h4>
          <Icons.Settings className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-5">Enseigne</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Statut</th>
                <th className="px-6 py-5">Dernier run</th>
                <th className="px-6 py-5">Produits</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center opacity-30">
                    <p className="text-xs font-black uppercase tracking-widest">Aucun adaptateur configuré</p>
                  </td>
                </tr>
              ) : (
                configs.map(cfg => {
                  const st = status.find(s => s.adapter === cfg.adapter);
                  const stBadge = st?.lastStatus ? (statusBadgeStyles[st.lastStatus] || statusBadgeStyles.pending) : statusBadgeStyles.pending;
                  const srcBadge = sourceTypeBadge[cfg.sourceType] || { bg: 'bg-slate-50', text: 'text-slate-500', label: cfg.sourceType };
                  return (
                    <tr key={cfg.id} className="hover:bg-slate-50 transition-colors align-middle">
                      <td className="px-6 py-5 text-xs font-black text-slate-900 uppercase tracking-wider">{cfg.adapter}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${srcBadge.bg} ${srcBadge.text}`}>{srcBadge.label}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${cfg.enabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                          {cfg.enabled ? 'Activé' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-[10px] font-mono text-slate-400 whitespace-nowrap">{fmtDate(cfg.lastRunAt)}</td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{st?.lastProductsFound ?? '—'}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDryRun(cfg.adapter)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-40"
                            title="Dry-run"
                          >
                            <Icons.RefreshCw className={busy ? 'animate-spin' : ''} /> Dry-run
                          </button>
                          <button
                            onClick={() => setImportModal(cfg)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                            title="Import CSV"
                          >
                            <Icons.Upload /> CSV
                          </button>
                          <button
                            onClick={() => openConfig(cfg)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-[8px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                            title="Configuration"
                          >
                            <Icons.Settings /> Config
                          </button>
                          <button
                            onClick={() => onUpdateConfig(cfg.adapter, { enabled: !cfg.enabled })}
                            disabled={busy}
                            className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${cfg.enabled ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            title={cfg.enabled ? 'Désactiver' : 'Activer'}
                          >
                            {cfg.enabled ? 'OFF' : 'ON'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- C. Preview (dry-run) --- */}
      {preview && preview.changes && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Aperçu du sync — {preview.adapter}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Run #{preview.runId.slice(0, 8)} · {preview.changes.matchedCount} matchés · {preview.changes.unmatchedCount} non matchés</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={busy}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-40 shadow-lg"
              >
                <Icons.Check /> Tout approuver
              </button>
              <button
                onClick={handleReject}
                disabled={busy}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-40"
              >
                <Icons.X /> Rejeter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'Nouveaux produits', value: preview.changes.newProducts.length, icon: <Icons.Package className="text-indigo-500" />, bg: 'bg-indigo-50' },
              { label: 'Prix modifiés', value: preview.changes.priceChanges.length, icon: <Icons.TrendingUp className="text-amber-500" />, bg: 'bg-amber-50' },
              { label: 'Promos', value: preview.changes.promotions.length, icon: <Icons.Tag className="text-emerald-500" />, bg: 'bg-emerald-50' },
              { label: 'Indisponibles', value: preview.changes.unavailability.length, icon: <Icons.AlertCircle className="text-rose-500" />, bg: 'bg-rose-50' },
            ].map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>{s.icon}</div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{s.label}</p>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table des changements de prix */}
          {preview.changes.priceChanges.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Changements de prix</h5>
                <Icons.TrendingUp className="text-amber-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-5">Produit</th>
                      <th className="px-6 py-5">Enseigne</th>
                      <th className="px-6 py-5">Ville</th>
                      <th className="px-6 py-5">Ancien prix</th>
                      <th className="px-6 py-5">Nouveau prix</th>
                      <th className="px-6 py-5">Δ%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.changes.priceChanges.map((c: any, i: number) => {
                      const delta = deltaPct(c.oldPrice, c.newPrice);
                      const up = c.newPrice > c.oldPrice;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors align-middle">
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{c.productId?.slice(0, 8) || '—'}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{c.storeName}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{c.city}</td>
                          <td className="px-6 py-4 text-sm font-black text-slate-400">{c.oldPrice} DH</td>
                          <td className="px-6 py-4 text-sm font-black text-slate-900">{c.newPrice} DH</td>
                          <td className={`px-6 py-4 text-xs font-black ${up ? 'text-rose-600' : 'text-emerald-600'}`}>{delta}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table des nouveaux produits */}
          {preview.changes.newProducts.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Nouveaux produits</h5>
                <Icons.Package className="text-indigo-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-5">Nom</th>
                      <th className="px-6 py-5">Marque</th>
                      <th className="px-6 py-5">Catégorie</th>
                      <th className="px-6 py-5">Prix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.changes.newProducts.map((p: any, i: number) => {
                      const n = p.normalized || {};
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors align-middle">
                          <td className="px-6 py-4 text-xs font-bold text-slate-900">{n.name || '—'}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{n.brand || '—'}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{n.category || '—'}</td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-600">{n.price} DH</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- D. Historique --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Historique des syncs</h4>
          <Icons.History className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Adapter</th>
                <th className="px-6 py-5">Mode</th>
                <th className="px-6 py-5">Statut</th>
                <th className="px-6 py-5">Produits</th>
                <th className="px-6 py-5">Prix MAJ</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center opacity-30">
                    <p className="text-xs font-black uppercase tracking-widest">Aucun sync enregistré</p>
                  </td>
                </tr>
              ) : (
                runs.map(run => {
                  const badge = statusBadgeStyles[run.status] || statusBadgeStyles.pending;
                  return (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors align-middle">
                      <td className="px-6 py-5 text-[10px] font-mono text-slate-400 whitespace-nowrap">{fmtDate(run.startedAt)}</td>
                      <td className="px-6 py-5 text-xs font-black text-slate-900 uppercase tracking-wider">{run.adapter}</td>
                      <td className="px-6 py-5 text-xs font-bold text-slate-500">{run.mode}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{run.productsFound}</td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{run.pricesUpdated}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {run.status === 'dry_run' && (
                            <>
                              <button
                                onClick={() => { setPreview({ runId: run.id, changes: run.changes as SyncChanges, adapter: run.adapter }); }}
                                className="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-[8px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                              >
                                Voir
                              </button>
                              <button
                                onClick={() => onApprove(run.id)}
                                disabled={busy}
                                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-40"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => onReject(run.id)}
                                disabled={busy}
                                className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-40"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {run.status !== 'dry_run' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modale Config --- */}
      {configModal && (
        <div className="fixed inset-0 z-[1500] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfigModal(null)}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Config — {configModal.adapter}</h4>
              <button onClick={() => setConfigModal(null)} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900"><Icons.X /></button>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activé</span>
                <select
                  value={configDraft.enabled ? 'true' : 'false'}
                  onChange={e => setConfigDraft({ ...configDraft, enabled: e.target.value === 'true' })}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                >
                  <option value="true">Activé</option>
                  <option value="false">Désactivé</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type de source</span>
                <select
                  value={configDraft.sourceType || 'scraper'}
                  onChange={e => setConfigDraft({ ...configDraft, sourceType: e.target.value })}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                >
                  <option value="scraper">Scraper</option>
                  <option value="api">API</option>
                  <option value="csv">CSV</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL source</span>
                <input
                  type="text"
                  value={configDraft.sourceUrl || ''}
                  onChange={e => setConfigDraft({ ...configDraft, sourceUrl: e.target.value })}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  placeholder="https://..."
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cron schedule</span>
                <input
                  type="text"
                  value={configDraft.cronSchedule || ''}
                  onChange={e => setConfigDraft({ ...configDraft, cronSchedule: e.target.value })}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 font-mono"
                  placeholder="0 */6 * * *"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pages max</span>
                  <input
                    type="number"
                    value={configDraft.maxPages ?? 0}
                    onChange={e => setConfigDraft({ ...configDraft, maxPages: Number(e.target.value) })}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate limit (ms)</span>
                  <input
                    type="number"
                    value={configDraft.rateLimitMs ?? 0}
                    onChange={e => setConfigDraft({ ...configDraft, rateLimitMs: Number(e.target.value) })}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </label>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={configDraft.respectRobotsTxt ?? true}
                  onChange={e => setConfigDraft({ ...configDraft, respectRobotsTxt: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300"
                />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Respecter robots.txt</span>
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                <textarea
                  value={configDraft.notes || ''}
                  onChange={e => setConfigDraft({ ...configDraft, notes: e.target.value })}
                  rows={3}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  placeholder="Notes internes..."
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 mt-8">
              <button onClick={() => setConfigModal(null)} className="px-5 py-3 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">Annuler</button>
              <button onClick={saveConfig} disabled={busy} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40">
                <Icons.Check /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modale Import CSV --- */}
      {importModal && (
        <div className="fixed inset-0 z-[1500] bg-black/40 flex items-center justify-center p-4" onClick={() => setImportModal(null)}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Import CSV — {importModal.adapter}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Collez le contenu CSV à importer</p>
              </div>
              <button onClick={() => setImportModal(null)} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900"><Icons.X /></button>
            </div>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={12}
              placeholder="name,brand,category,unit,weight,price,city,storeName&#10;Huile d'olive,Lesieur,Epicerie,L,1,89.9,Casablanca,Marjane"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900"
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setImportModal(null)} className="px-5 py-3 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">Annuler</button>
              <button onClick={handleImport} disabled={busy || !csvText.trim()} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-40">
                <Icons.Upload /> Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
