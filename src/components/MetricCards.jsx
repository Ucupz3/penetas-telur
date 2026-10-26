import React from 'react';
import { Thermometer, Droplets, RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MetricCards({ batch, device, latest }) {
  const temp = latest ? Number(latest.temperature) : 37.8;
  const hum = latest ? Number(latest.humidity) : 60.0;

  const targetTempMin = batch ? Number(batch.target_temp_min) : 37.5;
  const targetTempMax = batch ? Number(batch.target_temp_max) : 38.2;
  const targetHumMin = batch ? Number(batch.target_humidity_min) : 55.0;
  const targetHumMax = batch ? Number(batch.target_humidity_max) : 65.0;

  // Temperature Status
  let tempStatus = { label: 'Normal / Ideal', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (temp < targetTempMin) {
    tempStatus = { label: 'Terlalu Dingin', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
  } else if (temp > targetTempMax) {
    tempStatus = { label: 'Terlalu Panas', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
  }

  // Humidity Status
  let humStatus = { label: 'Ideal', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (hum < targetHumMin) {
    humStatus = { label: 'Kurang Lembap', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
  } else if (hum > targetHumMax) {
    humStatus = { label: 'Terlalu Basah', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
  }

  // Turner time
  const lastTurn = device?.last_turn_at ? new Date(device.last_turn_at) : null;
  const lastTurnStr = lastTurn
    ? lastTurn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. KARTU SUHU */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Thermometer size={16} className="text-amber-400" />
            Suhu Ruang
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tempStatus.bg} ${tempStatus.color}`}>
            {tempStatus.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <span className="text-4xl lg:text-5xl font-extrabold text-white font-mono tracking-tight">
            {temp.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-slate-400">°C</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 mt-3 border-t border-slate-800">
          <span>Target Ideal</span>
          <span className="font-semibold text-slate-200 font-mono">
            {targetTempMin.toFixed(1)}°C - {targetTempMax.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* 2. KARTU KELEMBAPAN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Droplets size={16} className="text-cyan-400" />
            Kelembapan (RH)
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${humStatus.bg} ${humStatus.color}`}>
            {humStatus.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <span className="text-4xl lg:text-5xl font-extrabold text-white font-mono tracking-tight">
            {hum.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-slate-400">%</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 mt-3 border-t border-slate-800">
          <span>Target Ideal</span>
          <span className="font-semibold text-slate-200 font-mono">
            {targetHumMin.toFixed(0)}% - {targetHumMax.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 3. KARTU PEMBALIK TELUR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <RotateCw size={16} className="text-purple-400" />
            Pembalik Telur
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            device?.turner_status 
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {device?.turner_status ? 'Sedang Memutar' : 'Standby'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <span className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
            Tiap {batch?.turner_interval_hours || 4} Jam
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 mt-3 border-t border-slate-800">
          <span>Terakhir Putar</span>
          <span className="font-semibold text-slate-200 font-mono">
            {lastTurnStr} WIB
          </span>
        </div>
      </div>
    </div>
  );
}
