import React from 'react';
import { Wifi, WifiOff, Cpu, Play, Bell, Settings } from 'lucide-react';

export default function Header({ device, unresolvedAlerts, onOpenAlerts, onOpenNewBatch, onSimulate, simulating }) {
  const isOnline = device?.is_online;

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold text-xl">
            🥚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Smart Incubator</h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                IoT IoT-ESP32
              </span>
            </div>
            <p className="text-xs text-slate-400">Sistem Monitoring & Kontrol Penetas Telur</p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Online status */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi size={14} /> Alat Online
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <WifiOff size={14} /> Alat Offline
              </>
            )}
          </div>

          {/* Test Simulation Button */}
          <button
            onClick={onSimulate}
            disabled={simulating}
            title="Kirim 1 sampel data sensor virtual untuk simulasi tanpa hardware"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
          >
            <Play size={13} className={simulating ? 'animate-spin text-cyan-400' : 'text-amber-400'} />
            <span className="hidden md:inline">Simulasi Sensor</span>
          </button>

          {/* Alert button */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            title="Daftar Notifikasi Alert"
          >
            <Bell size={18} />
            {unresolvedAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unresolvedAlerts}
              </span>
            )}
          </button>

          {/* New Batch */}
          <button
            onClick={onOpenNewBatch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20"
          >
            <Settings size={14} />
            <span>Batch Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
}
