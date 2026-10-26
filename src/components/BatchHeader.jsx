import React from 'react';
import { Calendar, Egg, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

export default function BatchHeader({ batch }) {
  if (!batch) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>Belum ada siklus penetasan aktif. Buat siklus baru untuk mulai memantau.</span>
        </div>
      </div>
    );
  }

  const currentDay = Math.max(1, batch.current_day || 1);
  const totalDays = batch.hatch_target_days || 21;
  const progressPct = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const isLockdown = currentDay >= (batch.stop_turner_day || 18);

  const startDateFormatted = new Date(batch.start_date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Info Batch */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Batch Aktif #{batch.id}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isLockdown 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {isLockdown ? 'Fase Lockdown (Siap Menetas)' : 'Fase Inkubasi Normal'}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Egg className="text-amber-400" size={22} />
            Telur {batch.egg_type}
            <span className="text-sm font-normal text-slate-400">({batch.total_eggs} Butir)</span>
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-500" />
              Mulai: {startDateFormatted}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-500" />
              Target Menetas: {totalDays} Hari
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-slate-500" />
              Stop Pembalik: Hari ke-{batch.stop_turner_day || 18}
            </span>
          </div>
        </div>

        {/* Progress Day Countdown */}
        <div className="w-full lg:w-72 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Progress Hari</span>
            <span className="text-sm font-bold text-white">
              Hari ke-<span className="text-cyan-400 text-base">{currentDay}</span> / {totalDays}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
            <span>Selesai {progressPct}%</span>
            <span>Sisa {Math.max(0, totalDays - currentDay)} hari lagi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
