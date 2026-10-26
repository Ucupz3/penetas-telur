import React, { useState, useEffect } from 'react';
import { Thermometer, Save, Sliders, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';

const PRESETS = [
  { name: 'Ayam Kampung / Ras', min: 37.5, max: 38.2, desc: 'Standar penetasan telur ayam umum' },
  { name: 'Bebek / Itik', min: 37.2, max: 37.8, desc: 'Suhu stabil kelembapan tinggi' },
  { name: 'Burung Puyuh', min: 37.5, max: 38.0, desc: 'Suhu presisi untuk telur kecil' },
  { name: 'Burung Merpati / Lovebird', min: 37.0, max: 37.6, desc: 'Unggas hias' },
];

export default function TemperatureControl({ batch, onUpdateSuccess, showToast }) {
  const [minTemp, setMinTemp] = useState(37.5);
  const [maxTemp, setMaxTemp] = useState(38.2);
  const [submitting, setSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  useEffect(() => {
    if (batch) {
      setMinTemp(Number(batch.target_temp_min) || 37.5);
      setMaxTemp(Number(batch.target_temp_max) || 38.2);
    }
  }, [batch?.target_temp_min, batch?.target_temp_max]);

  const applyPreset = (preset) => {
    setMinTemp(preset.min);
    setMaxTemp(preset.max);
    setActivePreset(preset.name);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (minTemp >= maxTemp) {
      showToast('error', 'Suhu minimum harus lebih kecil dari suhu maksimum');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/batch/temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_temp_min: minTemp,
          target_temp_max: maxTemp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Target suhu berhasil diupdate');
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        showToast('error', data.message || 'Gagal mengubah suhu');
      }
    } catch {
      showToast('error', 'Gagal menghubungi server');
    } finally {
      setSubmitting(false);
    }
  };

  const changeMin = (delta) => {
    const val = Math.round((minTemp + delta) * 10) / 10;
    if (val > 30 && val < maxTemp) setMinTemp(val);
  };

  const changeMax = (delta) => {
    const val = Math.round((maxTemp + delta) * 10) / 10;
    if (val > minTemp && val < 45) setMaxTemp(val);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="text-cyan-400" size={20} />
            Pengatur Target Suhu Penetasan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur batas toleransi suhu. Pemanas & kipas otomatis menyesuaikan saat mode otomatis aktif.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 self-start sm:self-auto">
          <Zap size={13} />
          Auto Control Sync
        </div>
      </div>

      {/* Preset Cepat */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
          Preset Jenis Unggas:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const isSelected = minTemp === p.min && maxTemp === p.max;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs text-slate-200 truncate">{p.name}</div>
                <div className="text-[11px] font-mono text-cyan-400 font-bold mt-0.5">
                  {p.min}°C - {p.max}°C
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kontrol Input Suhu Min & Max */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Suhu Minimum (Pemicu Pemanas ON) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Batas Bawah (Pemanas ON)
              </span>
              <span className="text-[10px] text-amber-400 font-medium">Bila &lt; batas ini, lampu menyala</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => changeMin(-0.1)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg transition flex items-center justify-center active:scale-95"
              >
                -
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="42"
                  value={minTemp}
                  onChange={(e) => setMinTemp(parseFloat(e.target.value) || 37.0)}
                  className="w-full text-center text-3xl font-extrabold font-mono text-white bg-transparent focus:outline-none"
                />
                <span className="text-xs text-slate-500">Derajat Celcius (°C)</span>
              </div>

              <button
                type="button"
                onClick={() => changeMin(0.1)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg transition flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Suhu Maksimum (Pemicu Kipas ON) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Batas Atas (Kipas Dingin ON)
              </span>
              <span className="text-[10px] text-cyan-400 font-medium">Bila &ge; batas ini, kipas menyala</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => changeMax(-0.1)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg transition flex items-center justify-center active:scale-95"
              >
                -
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  step="0.1"
                  min="32"
                  max="45"
                  value={maxTemp}
                  onChange={(e) => setMaxTemp(parseFloat(e.target.value) || 38.0)}
                  className="w-full text-center text-3xl font-extrabold font-mono text-white bg-transparent focus:outline-none"
                />
                <span className="text-xs text-slate-500">Derajat Celcius (°C)</span>
              </div>

              <button
                type="button"
                onClick={() => changeMax(0.1)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg transition flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Button & Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            Rentang optimal target saat ini: <strong className="text-cyan-400">{minTemp.toFixed(1)}°C - {maxTemp.toFixed(1)}°C</strong>
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {submitting ? 'Menyimpan...' : 'Simpan Target Suhu'}
          </button>
        </div>
      </form>
    </div>
  );
}
