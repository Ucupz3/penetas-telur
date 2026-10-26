import React, { useState } from 'react';
import { Activity, Thermometer, Droplets } from 'lucide-react';

export default function TelemetryChart({ history, targetTempMin, targetTempMax }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center text-slate-500">
        <Activity className="mx-auto mb-2 text-slate-600 animate-pulse" size={32} />
        <p className="text-sm">Menunggu data telemetri masuk...</p>
      </div>
    );
  }

  // Calculate SVG dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Temperature ranges: min 35, max 42
  const minT = 35.0;
  const maxT = 41.0;

  // Humidity ranges: min 40, max 90
  const minH = 40.0;
  const maxH = 90.0;

  const pointsCount = history.length;
  const getX = (i) => padding.left + (i / Math.max(1, pointsCount - 1)) * graphWidth;
  const getYTemp = (val) => padding.top + graphHeight - ((val - minT) / (maxT - minT)) * graphHeight;
  const getYHum = (val) => padding.top + graphHeight - ((val - minH) / (maxH - minH)) * graphHeight;

  // Build SVG Path strings
  const tempPath = history
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYTemp(Number(d.temperature))}`)
    .join(' ');

  const humPath = history
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYHum(Number(d.humidity))}`)
    .join(' ');

  const targetMinY = targetTempMin ? getYTemp(targetTempMin) : null;
  const targetMaxY = targetTempMax ? getYTemp(targetTempMax) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="text-cyan-400" size={20} />
            Grafik Tren Suhu & Kelembapan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Log time-series {pointsCount} pembacaan sensor terakhir dari alat
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-3 h-1 bg-amber-400 rounded-full inline-block"></span>
            Suhu (°C)
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block"></span>
            Kelembapan (%)
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400/80">
            <span className="w-3 h-0.5 border-b border-dashed border-emerald-400 inline-block"></span>
            Target Suhu
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 sm:h-64 select-none overflow-visible"
        >
          {/* Grid lines horizontal */}
          {[36, 37, 38, 39, 40].map((t) => (
            <g key={t}>
              <line
                x1={padding.left}
                y1={getYTemp(t)}
                x2={width - padding.right}
                y2={getYTemp(t)}
                stroke="#334155"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={getYTemp(t) + 4}
                fill="#64748b"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {t}°C
              </text>
            </g>
          ))}

          {/* Right Y-axis for Humidity */}
          {[50, 60, 70, 80].map((h) => (
            <text
              key={h}
              x={width - padding.right + 8}
              y={getYHum(h) + 4}
              fill="#64748b"
              fontSize="10"
              textAnchor="start"
              fontFamily="monospace"
            >
              {h}%
            </text>
          ))}

          {/* Target Temp Optimal Range Shading */}
          {targetMinY && targetMaxY && (
            <rect
              x={padding.left}
              y={targetMaxY}
              width={graphWidth}
              height={Math.max(0, targetMinY - targetMaxY)}
              fill="#10b981"
              fillOpacity="0.08"
            />
          )}

          {/* Target Min & Max dashed lines */}
          {targetMinY && (
            <line
              x1={padding.left}
              y1={targetMinY}
              x2={width - padding.right}
              y2={targetMinY}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
          )}
          {targetMaxY && (
            <line
              x1={padding.left}
              y1={targetMaxY}
              x2={width - padding.right}
              y2={targetMaxY}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
          )}

          {/* Lines */}
          <path d={humPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={tempPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Dots */}
          {history.map((d, i) => {
            const x = getX(i);
            const yT = getYTemp(Number(d.temperature));
            const yH = getYHum(Number(d.humidity));
            const isHovered = hoveredPoint?.index === i;

            return (
              <g key={d.id || i}>
                <circle
                  cx={x}
                  cy={yT}
                  r={isHovered ? 5 : 3}
                  className="fill-amber-400 stroke-slate-950 stroke-2 transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...d, index: i, x, y: yT })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <circle
                  cx={x}
                  cy={yH}
                  r={isHovered ? 5 : 3}
                  className="fill-cyan-400 stroke-slate-950 stroke-2 transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...d, index: i, x, y: yH })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Info Tooltip Banner */}
      {hoveredPoint ? (
        <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">
            Waktu: <strong className="text-white">{new Date(hoveredPoint.created_at).toLocaleTimeString('id-ID')}</strong>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-amber-400 font-bold">Suhu: {hoveredPoint.temperature}°C</span>
            <span className="text-cyan-400 font-bold">Kelembapan: {hoveredPoint.humidity}%</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-center text-[11px] text-slate-500">
          Arahkan kursor ke titik grafik untuk melihat rincian suhu dan waktu rekaman.
        </div>
      )}
    </div>
  );
}
