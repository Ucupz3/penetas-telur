import React, { useState } from 'react';
import { X, Egg, Save, RefreshCw } from 'lucide-react';

export default function NewBatchModal({ isOpen, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    egg_type: 'Ayam Kampung',
    total_eggs: 30,
    hatch_target_days: 21,
    target_temp_min: 37.5,
    target_temp_max: 38.2,
    target_humidity_min: 55.0,
    target_humidity_max: 65.0,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/batch/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Batch penetasan baru berhasil dimulai!');
        onSuccess();
        onClose();
      } else {
        showToast('error', data.message || 'Gagal memulai batch baru');
      }
    } catch {
      showToast('error', 'Gagal menghubungi server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Egg className="text-amber-400" size={20} />
            Mulai Siklus Batch Baru
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Jenis Telur
              </label>
              <input
                type="text"
                required
                value={form.egg_type}
                onChange={(e) => setForm({ ...form, egg_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Jumlah Telur
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.total_eggs}
                onChange={(e) => setForm({ ...form, total_eggs: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Target Durasi Menetas (Hari)
            </label>
            <input
              type="number"
              required
              min="10"
              max="60"
              value={form.hatch_target_days}
              onChange={(e) => setForm({ ...form, hatch_target_days: parseInt(e.target.value) || 21 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Suhu Min (°C)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.target_temp_min}
                onChange={(e) => setForm({ ...form, target_temp_min: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Suhu Max (°C)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.target_temp_max}
                onChange={(e) => setForm({ ...form, target_temp_max: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Kelembapan Min (%)
              </label>
              <input
                type="number"
                step="1"
                required
                value={form.target_humidity_min}
                onChange={(e) => setForm({ ...form, target_humidity_min: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Kelembapan Max (%)
              </label>
              <input
                type="number"
                step="1"
                required
                value={form.target_humidity_max}
                onChange={(e) => setForm({ ...form, target_humidity_max: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Mulai Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
