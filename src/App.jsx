import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import BatchHeader from './components/BatchHeader.jsx';
import MetricCards from './components/MetricCards.jsx';
import TemperatureControl from './components/TemperatureControl.jsx';
import ActuatorControl from './components/ActuatorControl.jsx';
import TelemetryChart from './components/TelemetryChart.jsx';
import NewBatchModal from './components/NewBatchModal.jsx';
import AlertsDrawer from './components/AlertsDrawer.jsx';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [statusData, setStatusData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState(null);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [newBatchOpen, setNewBatchOpen] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const d = await res.json();
      if (d.success) {
        setStatusData(d.data);
      }
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/telemetry/history');
      const d = await res.json();
      if (d.success) {
        setHistory(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadHistory();
    setLoading(false);

    // Setup Server-Sent Events (SSE) for realtime updates
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setStatusData((prev) => ({
          ...prev,
          batch: payload.batch,
          device: payload.device,
          latest_telemetry: payload.latest_telemetry,
          unresolved_alerts: payload.unresolved_alerts,
        }));
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    // Polling history periodically
    const historyInterval = setInterval(() => {
      loadHistory();
    }, 10000);

    return () => {
      eventSource.close();
      clearInterval(historyInterval);
    };
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulation/tick', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        showToast('success', `Simulasi sensor: ${d.simulated.temperature}°C | ${d.simulated.humidity}%`);
        loadStatus();
        loadHistory();
      }
    } catch {
      showToast('error', 'Gagal memicu simulasi sensor');
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !statusData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw size={32} className="animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-semibold tracking-wider uppercase">Menghubungkan ke Smart Incubator...</p>
      </div>
    );
  }

  const batch = statusData?.batch;
  const device = statusData?.device;
  const latest = statusData?.latest_telemetry;
  const unresolvedAlerts = statusData?.unresolved_alerts || 0;

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col pb-16 selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Header
        device={device}
        unresolvedAlerts={unresolvedAlerts}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenNewBatch={() => setNewBatchOpen(true)}
        onSimulate={handleSimulate}
        simulating={simulating}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* 1. Batch Progress */}
        <BatchHeader batch={batch} />

        {/* 2. Realtime Telemetry Metric Cards */}
        <MetricCards batch={batch} device={device} latest={latest} />

        {/* 3. Pengatur Target Suhu (Fitur Utama Yang Diminta) */}
        <TemperatureControl
          batch={batch}
          onUpdateSuccess={() => {
            loadStatus();
            loadHistory();
          }}
          showToast={showToast}
        />

        {/* 4. Kontrol Aktuator Relay (Mode Auto / Manual) */}
        <ActuatorControl
          device={device}
          showToast={showToast}
          onRefresh={loadStatus}
        />

        {/* 5. Grafik Tren Telemetri (Time-Series) */}
        <TelemetryChart
          history={history}
          targetTempMin={batch ? Number(batch.target_temp_min) : 37.5}
          targetTempMax={batch ? Number(batch.target_temp_max) : 38.2}
        />
      </main>

      {/* New Batch Modal */}
      <NewBatchModal
        isOpen={newBatchOpen}
        onClose={() => setNewBatchOpen(false)}
        onSuccess={() => {
          loadStatus();
          loadHistory();
        }}
        showToast={showToast}
      />

      {/* Alerts Drawer */}
      <AlertsDrawer
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
