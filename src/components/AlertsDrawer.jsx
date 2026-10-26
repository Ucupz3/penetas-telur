import React, { useEffect, useState } from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AlertsDrawer({ isOpen, onClose, showToast }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAlerts(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchAlerts();
  }, [isOpen]);

  const handleResolve = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        showToast('success', 'Alert ditandai selesai');
        fetchAlerts();
      }
    } catch {
      showToast('error', 'Gagal update status');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ShieldAlert className="text-rose-400" size={20} />
            Log Insiden & Notifikasi
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <p className="text-center text-slate-500 py-6 text-sm">Memuat riwayat alert...</p>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-300">Kondisi Inkubator Aman</p>
              <p className="text-xs text-slate-500 mt-1">Tidak ada anomali suhu atau kelembapan yang tercatat.</p>
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  a.is_resolved
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                      {a.type}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(a.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200">{a.message}</p>
                </div>

                {!a.is_resolved && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                  >
                    Tandai Selesai
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
