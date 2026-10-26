# Hardware Penetas Telur IoT — Kontrol Dimmer (Bukan Relay)

## 1. Kenapa dimmer, bukan relay

| Aspek | Relay (on/off) | Dimmer (phase control) |
|---|---|---|
| Sifat kontrol | Bang-bang + histeresis | Kontinu 0–100% |
| Overshoot | Besar (lampu 100% sampai ambang atas) | Kecil, bisa ditekan |
| Riak suhu | ±0.5–1.0 °C | ±0.1–0.2 °C |
| Umur komponen | Kontak relay cepat aus (siklus tinggi) | Triac tanpa kontak mekanik |
| Dosen Siskon | Hanya on/off | Bisa PID + analisis respon transien |

Suhu ideal penetas 37.5–38.2 °C. Dengan relay, suhu bergerak naik-turun di sekitar ambang.
Dengan dimmer, daya pemanas bisa ditahan di titik kesetimbangan (steady state), jadi suhu
datar dan konsumsi daya lebih hemat.

## 2. Daftar Komponen (revisi)

### Elektronika utama
| # | Komponen | Qty | Estimasi |
|---|---|---|---|
| 1 | ESP32 Lolin32 Lite | 1 | Rp50.000 |
| 2 | Sensor SHT30 I2C (akurasi ±0.3 °C) | 1 | Rp35.000 |
| 3 | **AC Dimmer Module RobotDyn 1-channel (zero-cross + triac)** — pengganti relay | 1 | Rp55.000 |
| 4 | Motor Servo SG90 (pembalik telur) | 1 | Rp16.000 |
| 5 | LCD 16x2 + I2C backpack (opsional, lokal) | 1 | Rp25.000 |

### Daya & pengkabelan
| # | Komponen | Qty | Estimasi |
|---|---|---|---|
| 6 | Adaptor 12V 2A DC (fan + ESP32) | 1 | Rp18.000 |
| 7 | Buck converter LM2596 (12V → 5V) | 1 | Rp8.000 |
| 8 | **Sekring holder + sekring 2A** (proteksi sisi AC) | 1 | Rp8.000 |
| 9 | Terminal block 2 pin (AC in/out) | 2 | Rp4.000 |
| 10 | Kabel jumper Dupont F-F & M-F | 1 pack | Rp12.000 |

### Pemanas & sirkulasi
| # | Komponen | Qty | Estimasi |
|---|---|---|---|
| 11 | **2x Lampu pijar 15W (dimmable, bukan LED/CFL)** | 2 | Rp12.000 |
| 12 | Fitting lampu E27 | 2 | Rp8.000 |
| 13 | Fan DC 12V 80mm | 1 | Rp12.000 |
| 14 | Kabel AC 2x0.75 (3 m) + steker | 1 | Rp15.000 |

### Kotak & mekanik
| # | Komponen | Qty | Estimasi |
|---|---|---|---|
| 15 | Boks styrofoam bekas buah (40×30×25 cm) | 1 | Rp17.000 |
| 16 | Kawat ram / strimin (rak telur) | 0.5 m | Rp8.000 |
| 17 | Nampan plastik + spons (wadah air RH) | 1 | Rp5.000 |

**Total: ±Rp308.000** (relay Rp15.000 diganti dimmer Rp55.000 → naik ±Rp40.000).

## 3. Wiring

```
AC 220V ──[Sekring 2A]──┬──> Dimmer AC-IN (L)
                        └──> Lampu (via Dimmer AC-OUT)
AC Netral ─────────────────> Lampu (sisi lain)

Dimmer ZC  ──> ESP32 GPIO25 (interrupt RISING)
Dimmer DIM ──> ESP32 GPIO26
Dimmer GND ──> ESP32 GND

SHT30: VCC 3.3V, GND, SDA GPIO21, SCL GPIO22
Fan 12V: +12V, GND, gate lewat MOSFET module -> GPIO27
Servo: +5V (dari buck), GND, signal GPIO13
```

Catatan penting:
- **Jangan** memberi beban AC langsung ke pin ESP32. Dimmer module sudah punya isolasi opto.
- Beban lampu pijar 2×15 W = 30 W, jauh di bawah rating dimmer (≥ 2 A / 400 W). Aman tanpa heatsink besar.
- Kalau memakai **lampu pijar 2 buah paralel**, total daya 30 W. Kalau ganti ke pemanas PTC AC, pastikan rating arus dimmer cukup dan pakai heatsink.

## 4. Kalibrasi (wajib, sekali)

Hubungan duty (%) ke sudut picu triac dan ke daya nyata **tidak linear**. Dua cara:

1. **Kalibrasi daya (disarankan):** ukur dengan wattmeter/clamp meter pada duty 10, 25, 50, 75, 100%. Catat daya nyata, lalu ganti konstanta `78.0f` di `setHeaterPower()` dengan interpolasi tabel.
2. **Kalibrasi suhu:** nyalakan pada duty tetap (misal 35%), catat suhu steady state setelah 30 menit. Ulangi beberapa duty, buat kurva duty → ΔT. Kurva ini bisa langsung dipakai sebagai feed-forward di PID.

Contoh tabel hasil kalibrasi (isi setelah diukur):

| Duty (%) | Delay picu (µs) | Daya terukur (W) | Suhu steady (°C) |
|---|---|---|---|
| 10 | 8220 | ... | ... |
| 25 | 7050 | ... | ... |
| 50 | 5100 | ... | ... |
| 75 | 3150 | ... | ... |
| 100 | 1200 | ... | ... |

## 5. Tuning PID

Mulai dari `KP=12, KI=0.08, KD=60` (loop 1 Hz). Prosedur:
1. Set `KI=KD=0`, naikkan `KP` sampai suhu mendekati setpoint tapi belum berosilasi.
2. Tambah `KI` perlahan untuk menghapus offset steady state.
3. Tambah `KD` kalau ada overshoot saat pintu dibuka/tutup.

Batas aman perangkat lunak: duty dipotong 0–100%, integrator dibatasi ±50 (anti-windup),
dan firmware punya fail-safe: kalau server tidak terjangkau >10 detik, PID lokal tetap
jalan dengan setpoint 37.8 °C.

## 6. Keselamatan

- Sisi AC 220 V mematikan. Kerjakan saat steker dicabut, pakai kotak tertutup.
- Pasang sekring 2 A di jalur fasa sebelum dimmer.
- Jangan memakai LED/CFL non-dimmable — filamennya tidak bisa diredupkan, bisa berkedip/rusak.
- Pisahkan jalur AC dan jalur 3.3 V; beri jarak ≥1 cm dan jangan menyilang di PCB.
- Uji pertama tanpa telur, pakai termometer pembanding selama 2 jam.
