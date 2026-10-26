# Smart Incubator — Sistem IoT Penetas Telur

Sistem monitoring dan kontrol mesin penetas telur berbasis IoT dengan arsitektur web modern. Dilengkapi pengatur target suhu real-time dari website, kontrol aktuator relay (otomatis / manual), grafik telemetri time-series, dan manajemen batch siklus penetasan.

---

## 🛠️ Tech Stack
- **Frontend**: React 19 (JSX) + Tailwind CSS + Lucide Icons + Vite
- **Backend**: Node.js + Express.js + Server-Sent Events (SSE)
- **Database**: MySQL / MariaDB (Connection pool `mysql2/promise`)
- **Proses Manager**: PM2

---

## 🚀 Fitur Utama
1. **Pengatur Target Suhu Realtime**:
   - Kontrol batas bawah (pemanas ON) dan batas atas (kipas ON) langsung dari antarmuka web (+/- 0.1°C).
   - Preset sekali klik untuk Ayam Kampung (37.5°C - 38.2°C), Bebek/Itik (37.2°C - 37.8°C), Burung Puyuh (37.5°C - 38.0°C), dll.
2. **Monitoring Realtime**:
   - Metrik Suhu (°C), Kelembapan (%), Status Pembalik Telur, dan Badge Status (Normal / Dingin / Panas).
   - Pembaruan live otomatis via Server-Sent Events (SSE) tanpa perlu refresh halaman.
3. **Kontrol Aktuator & Relay**:
   - Mode Otomatis (Rules Engine mengatur pemanas & kipas sesuai target sensor).
   - Mode Manual (Bypass saklar manual untuk Lampu Pemanas, Kipas Pendingin, Pembalik Telur, Mist Maker).
4. **Grafik Tren Sensor**:
   - Visual time-series suhu dan kelembapan 30-40 pembacaan terakhir lengkap dengan garis batas toleransi.
5. **Manajemen Siklus Batch**:
   - Perhitungan otomatis hari penetasan (misal: Hari ke-4 dari 21 hari) dan fase lockdown (penghentian pembalik telur).

---

## 📋 Skema Database (`incubator_db`)
- `batches`: Profil siklus telur, jenis unggas, target hari, toleransi suhu & kelembapan.
- `device_states`: Status mode, online/offline, status 4 aktuator relay (singleton `id=1`).
- `telemetry_logs`: Riwayat berkala suhu & kelembapan dari ESP32.
- `alerts`: Log insiden overheat / underheat.

---

## 🔌 Endpoint API (ESP32 / IoT)
- `POST /api/device/telemetry`: Kirim payload JSON `{ "temperature": 37.8, "humidity": 60.5 }`.
- `GET /api/status`: Mengambil status batch, device, aktuator, dan telemetri terakhir.
- `POST /api/batch/temperature`: Ubah target suhu `{ "target_temp_min": 37.5, "target_temp_max": 38.2 }`.
- `POST /api/device/control`: Kontrol mode & relay `{ "mode": "manual", "heater_status": 1 }`.
- `GET /api/stream`: Stream SSE realtime event.

---

## 💻 Cara Menjalankan
```bash
# 1. Install dependencies
npm install

# 2. Build Frontend React
npm run build

# 3. Jalankan Server
npm start
# Atau gunakan PM2 untuk production:
pm2 start server/index.js --name penetas-telur
```
