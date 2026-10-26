import React, { useState } from 'react';
import { Power, Flame, Fan, RotateCw, CloudDrizzle, Shield, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ActuatorControl({ device, showToast, onRefresh }) {
  const [loadingAction, setLoadingAction] = useState(null);

  const isAuto = device?.mode === 'auto';

  const handleToggleMode = async () => {
    const nextMode = isAuto ? 'manual' : 'auto';
    setLoadingAction('mode');
    try {
      const res = await fetch('/api/device/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Mode sistem diubah ke: ${nextMode.toUpperCase()}`);
        if (onRefresh) onRefresh();
      } else {
        showToast('error', data.message);
      }
    } catch {
      showToast('error', 'Gagal mengubah mode');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSetHeaterPower = async (pct) => {
    if (isAuto) {
      showToast('error', 'Ubah ke Mode MANUAL terlebih dahulu untuk mengatur daya dimmer');
      return;
    }
    setLoadingAction('heater_power');
    try {
      const res = await fetch('/api/device/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heater_power: pct }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Daya lampu diset ${pct}%`);
        if (onRefresh) onRefresh();
      } else {
        showToast('error', data.message);
      }
    } catch {
      showToast('error', 'Gagal mengatur daya lampu');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleDevice = async (field, currentState) => {
    if (isAuto) {
      showToast('error', 'Ubah ke Mode MANUAL terlebih dahulu untuk mengontrol aktuator secara langsung');
      return;
    }

    setLoadingAction(field);
    try {
      const res = await fetch('/api/device/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentState }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status aktuator diperbarui');
        if (onRefresh) onRefresh();
      } else {
        showToast('error', data.message);
      }
    } catch {
      showToast('error', 'Gagal mengirim perintah ke alat');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerTurner = async () => {
    setLoadingAction('turner_manual');
    try {
      const res = await fetch('/api/device/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turner_status: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Motor pembalik diaktifkan!');
        if (onRefresh) onRefresh();
      } else {
        showToast('error', data.message);
      }
    } catch {
      showToast('error', 'Gagal mengaktifkan motor');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Power className="text-amber-400" size={20} />
            Kontrol Aktuator & Relay
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAuto
              ? 'Mode OTOMATIS aktif — sistem mengontrol aktuator berdasarkan target sensor.'
              : 'Mode MANUAL aktif — Anda memegang kendali penuh atas switch aktuator.'}
          </p>
        </div>

        {/* Mode Toggle Button */}
        <button
          onClick={handleToggleMode}
          disabled={loadingAction === 'mode'}
          className={`flex items-center gap-3 px-4 py-2 rounded-xl border font-bold text-xs transition ${
            isAuto
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Shield size={14} />
            Mode: {isAuto ? 'OTOMATIS' : 'MANUAL'}
          </span>
          <span className="text-slate-400 text-[10px] underline">Klik Ganti</span>
        </button>
      </div>

      {/* 4 Cards Aktuator Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Lampu Pemanas (Heater) */}
        <div className={`p-4 rounded-xl border transition ${
          device?.heater_status
            ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              device?.heater_status ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <Flame size={18} />
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              device?.heater_status ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              {device?.heater_power ?? 0}% DAYA
            </span>
          </div>

          <div className="font-bold text-sm text-white">Lampu Pemanas</div>
          <div className="text-[11px] text-slate-400 mt-0.5 mb-3">Dimmer AC — kontrol 0–100%</div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={device?.heater_power ?? 0}
            disabled={isAuto || loadingAction === 'heater_power'}
            onChange={(e) => handleSetHeaterPower(Number(e.target.value))}
            className={`w-full accent-amber-500 ${isAuto ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0%</span>
            <span>{isAuto ? 'PID otomatis' : `Manual ${device?.heater_power ?? 0}%`}</span>
            <span>100%</span>
          </div>
        </div>

        {/* 2. Kipas Sirkulasi (Fan) */}
        <div className={`p-4 rounded-xl border transition ${
          device?.fan_status
            ? 'bg-sky-500/10 border-sky-500/40 shadow-md shadow-sky-500/10'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              device?.fan_status ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <Fan size={18} className={device?.fan_status ? 'animate-spin' : ''} />
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              device?.fan_status ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {device?.fan_status ? 'Berputar (ON)' : 'Mati (OFF)'}
            </span>
          </div>

          <div className="font-bold text-sm text-white">Kipas Pendingin</div>
          <div className="text-[11px] text-slate-400 mt-0.5 mb-3">Relay 2 — Pendingin & sirkulasi udara</div>

          <button
            onClick={() => handleToggleDevice('fan_status', device?.fan_status)}
            disabled={isAuto || loadingAction === 'fan_status'}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition border ${
              isAuto
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500 bg-slate-900'
                : device?.fan_status
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30'
            }`}
          >
            {device?.fan_status ? 'Matikan Kipas' : 'Nyalakan Kipas'}
          </button>
        </div>

        {/* 3. Motor Pembalik Telur (Turner) */}
        <div className={`p-4 rounded-xl border transition ${
          device?.turner_status
            ? 'bg-purple-500/10 border-purple-500/40 shadow-md shadow-purple-500/10'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              device?.turner_status ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <RotateCw size={18} className={device?.turner_status ? 'animate-spin' : ''} />
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              device?.turner_status ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              {device?.turner_status ? 'Memutar' : 'Diam'}
            </span>
          </div>

          <div className="font-bold text-sm text-white">Pembalik Telur</div>
          <div className="text-[11px] text-slate-400 mt-0.5 mb-3">Relay 3 — Motor pengayun rak</div>

          <button
            onClick={handleTriggerTurner}
            disabled={loadingAction === 'turner_manual'}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition border bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 active:scale-95"
          >
            Putar Sekarang (Manual)
          </button>
        </div>

        {/* 4. Mist Maker (Humidifier) */}
        <div className={`p-4 rounded-xl border transition ${
          device?.humidifier_status
            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-md shadow-cyan-500/10'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              device?.humidifier_status ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <CloudDrizzle size={18} />
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              device?.humidifier_status ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              {device?.humidifier_status ? 'Aktif (ON)' : 'Mati (OFF)'}
            </span>
          </div>

          <div className="font-bold text-sm text-white">Mist Maker / Kabut</div>
          <div className="text-[11px] text-slate-400 mt-0.5 mb-3">Relay 4 — Penambah kelembapan</div>

          <button
            onClick={() => handleToggleDevice('humidifier_status', device?.humidifier_status)}
            disabled={isAuto || loadingAction === 'humidifier_status'}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition border ${
              isAuto
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500 bg-slate-900'
                : device?.humidifier_status
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
            }`}
          >
            {device?.humidifier_status ? 'Matikan Kabut' : 'Nyalakan Kabut'}
          </button>
        </div>
      </div>
    </div>
  );
}
