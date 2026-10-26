import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool, testDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Serve static React build files if present
app.use(express.static(path.join(__dirname, '../dist')));

// Helper: Get active batch with day calculation
async function getActiveBatch() {
  const [batches] = await pool.query(
    `SELECT *, 
      TIMESTAMPDIFF(DAY, start_date, NOW()) + 1 AS current_day,
      TIMESTAMPDIFF(HOUR, start_date, NOW()) AS elapsed_hours
    FROM batches 
    WHERE status = 'running' 
    ORDER BY id DESC LIMIT 1`
  );
  return batches[0] || null;
}

// Helper: Get device states
async function getDeviceState() {
  const [states] = await pool.query(`SELECT * FROM device_states WHERE id = 1 LIMIT 1`);
  return states[0] || null;
}

// Helper: Get latest telemetry
async function getLatestTelemetry() {
  const [logs] = await pool.query(
    `SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 1`
  );
  return logs[0] || null;
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', async (_req, res) => {
  const dbOk = await testDb();
  res.json({ status: 'ok', service: 'incubator-api', db: dbOk, time: new Date() });
});

// GET /api/status - Comprehensive status for dashboard
app.get('/api/status', async (_req, res) => {
  try {
    const batch = await getActiveBatch();
    const device = await getDeviceState();
    const latest = await getLatestTelemetry();

    const [alertRows] = await pool.query(
      `SELECT COUNT(*) AS unresolved_count FROM alerts WHERE is_resolved = 0`
    );

    res.json({
      success: true,
      data: {
        batch,
        device,
        latest_telemetry: latest,
        unresolved_alerts: alertRows[0]?.unresolved_count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batch/temperature - Update target temperature from website
app.post('/api/batch/temperature', async (req, res) => {
  try {
    const { target_temp_min, target_temp_max } = req.body;
    if (target_temp_min === undefined || target_temp_max === undefined) {
      return res.status(400).json({ success: false, message: 'target_temp_min and target_temp_max are required' });
    }

    const min = parseFloat(target_temp_min);
    const max = parseFloat(target_temp_max);

    if (min <= 0 || max <= 0 || min >= max) {
      return res.status(422).json({ success: false, message: 'Nilai suhu minimum harus lebih kecil dari suhu maksimum' });
    }

    const batch = await getActiveBatch();
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Tidak ada batch penetasan yang sedang aktif' });
    }

    await pool.query(
      `UPDATE batches SET target_temp_min = ?, target_temp_max = ? WHERE id = ?`,
      [min, max, batch.id]
    );

    // Re-check temperature against current telemetry if device in auto mode
    const latest = await getLatestTelemetry();
    const device = await getDeviceState();
    if (latest && device && device.mode === 'auto') {
      let heater = device.heater_status;
      let fan = device.fan_status;

      if (latest.temperature < min) {
        heater = 1;
        fan = 0;
      } else if (latest.temperature >= max) {
        heater = 0;
        fan = 1;
      } else {
        heater = 0;
        fan = 0;
      }

      await pool.query(
        `UPDATE device_states SET heater_status = ?, fan_status = ? WHERE id = 1`,
        [heater, fan]
      );
    }

    res.json({
      success: true,
      message: `Target suhu berhasil diubah ke ${min}°C - ${max}°C`,
      data: { target_temp_min: min, target_temp_max: max },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batch/settings - Update humidity & turner settings
app.post('/api/batch/settings', async (req, res) => {
  try {
    const { target_humidity_min, target_humidity_max, turner_interval_hours, stop_turner_day } = req.body;
    const batch = await getActiveBatch();
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Tidak ada batch penetasan aktif' });
    }

    await pool.query(
      `UPDATE batches SET 
        target_humidity_min = COALESCE(?, target_humidity_min),
        target_humidity_max = COALESCE(?, target_humidity_max),
        turner_interval_hours = COALESCE(?, turner_interval_hours),
        stop_turner_day = COALESCE(?, stop_turner_day)
      WHERE id = ?`,
      [target_humidity_min, target_humidity_max, turner_interval_hours, stop_turner_day, batch.id]
    );

    res.json({ success: true, message: 'Pengaturan batch berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batch/reset - Start or reset a batch
app.post('/api/batch/reset', async (req, res) => {
  try {
    const { egg_type, total_eggs, hatch_target_days, target_temp_min, target_temp_max, target_humidity_min, target_humidity_max } = req.body;

    // Archive current running batches
    await pool.query(`UPDATE batches SET status = 'completed' WHERE status = 'running'`);

    // Insert new batch
    const [result] = await pool.query(
      `INSERT INTO batches (
        egg_type, total_eggs, start_date, hatch_target_days,
        target_temp_min, target_temp_max, target_humidity_min, target_humidity_max, status
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, 'running')`,
      [
        egg_type || 'Ayam Kampung',
        total_eggs || 30,
        hatch_target_days || 21,
        target_temp_min || 37.5,
        target_temp_max || 38.2,
        target_humidity_min || 55.0,
        target_humidity_max || 65.0,
      ]
    );

    res.json({ success: true, message: 'Siklus batch baru berhasil dimulai', batch_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/device/control - Toggle mode and manual actuators
app.post('/api/device/control', async (req, res) => {
  try {
    const { mode, heater_status, fan_status, turner_status, humidifier_status } = req.body;

    const updates = [];
    const values = [];

    if (mode !== undefined) {
      updates.push('mode = ?');
      values.push(mode);
    }
    if (heater_status !== undefined) {
      updates.push('heater_status = ?');
      values.push(heater_status ? 1 : 0);
    }
    if (fan_status !== undefined) {
      updates.push('fan_status = ?');
      values.push(fan_status ? 1 : 0);
    }
    if (turner_status !== undefined) {
      updates.push('turner_status = ?');
      values.push(turner_status ? 1 : 0);
      if (turner_status) {
        updates.push('last_turn_at = NOW()');
      }
    }
    if (humidifier_status !== undefined) {
      updates.push('humidifier_status = ?');
      values.push(humidifier_status ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No control parameters provided' });
    }

    await pool.query(`UPDATE device_states SET ${updates.join(', ')} WHERE id = 1`, values);

    const device = await getDeviceState();
    res.json({ success: true, message: 'Status kontrol berhasil diperbarui', data: device });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/device/telemetry - Ingest from ESP32
app.post('/api/device/telemetry', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ success: false, message: 'temperature and humidity are required' });
    }

    const temp = parseFloat(temperature);
    const hum = parseFloat(humidity);

    const batch = await getActiveBatch();
    const device = await getDeviceState();

    // Insert log
    await pool.query(
      `INSERT INTO telemetry_logs (batch_id, temperature, humidity, created_at) VALUES (?, ?, ?, NOW())`,
      [batch?.id || null, temp, hum]
    );

    // Update heartbeat
    await pool.query(`UPDATE device_states SET is_online = 1, last_heartbeat = NOW() WHERE id = 1`);

    // Automatic rule engine if mode is 'auto'
    if (device && device.mode === 'auto' && batch) {
      let heater = 0;
      let fan = 0;
      let humidifier = 0;

      // Temp logic
      if (temp < batch.target_temp_min) {
        heater = 1;
        fan = 0;
      } else if (temp >= batch.target_temp_max) {
        heater = 0;
        fan = 1;
      } else {
        heater = 0;
        fan = 0;
      }

      // Humidity logic
      if (hum < batch.target_humidity_min) {
        humidifier = 1;
      } else {
        humidifier = 0;
      }

      await pool.query(
        `UPDATE device_states SET heater_status = ?, fan_status = ?, humidifier_status = ? WHERE id = 1`,
        [heater, fan, humidifier]
      );

      // Alert checks
      if (temp > batch.target_temp_max + 1.5) {
        await pool.query(
          `INSERT INTO alerts (batch_id, type, actual_value, message) VALUES (?, 'overheat', ?, ?)`,
          [batch.id, temp, `Suhu terlalu tinggi: ${temp}°C (Batas max ${batch.target_temp_max}°C)`]
        );
      } else if (temp < batch.target_temp_min - 1.5) {
        await pool.query(
          `INSERT INTO alerts (batch_id, type, actual_value, message) VALUES (?, 'underheat', ?, ?)`,
          [batch.id, temp, `Suhu drop terlalu dingin: ${temp}°C (Batas min ${batch.target_temp_min}°C)`]
        );
      }
    }

    const updatedDevice = await getDeviceState();
    res.json({
      success: true,
      message: 'Telemetry logged',
      controls: {
        mode: updatedDevice.mode,
        heater: updatedDevice.heater_status,
        fan: updatedDevice.fan_status,
        turner: updatedDevice.turner_status,
        humidifier: updatedDevice.humidifier_status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/telemetry/history - Chart time-series
app.get('/api/telemetry/history', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, temperature, humidity, created_at 
       FROM telemetry_logs 
       ORDER BY id DESC LIMIT 40`
    );
    res.json({ success: true, data: rows.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/alerts - List alerts
app.get('/api/alerts', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM alerts ORDER BY id DESC LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/:id/resolve
app.post('/api/alerts/:id/resolve', async (req, res) => {
  try {
    await pool.query(`UPDATE alerts SET is_resolved = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Alert ditandai selesai' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/simulation/tick - Generate a realistic reading for simulation/testing
app.post('/api/simulation/tick', async (req, res) => {
  try {
    const batch = await getActiveBatch();
    const device = await getDeviceState();
    const latest = await getLatestTelemetry();

    let curTemp = latest ? Number(latest.temperature) : 37.8;
    let curHum = latest ? Number(latest.humidity) : 58.0;

    // Small jitter based on heater/fan
    if (device.heater_status) curTemp += 0.2;
    else if (device.fan_status) curTemp -= 0.3;
    else curTemp += (Math.random() - 0.5) * 0.1;

    if (device.humidifier_status) curHum += 0.5;
    else curHum += (Math.random() - 0.5) * 0.3;

    curTemp = Math.round(curTemp * 10) / 10;
    curHum = Math.round(curHum * 10) / 10;

    // Call internal telemetry logic
    await pool.query(
      `INSERT INTO telemetry_logs (batch_id, temperature, humidity, created_at) VALUES (?, ?, ?, NOW())`,
      [batch?.id || null, curTemp, curHum]
    );

    await pool.query(`UPDATE device_states SET is_online = 1, last_heartbeat = NOW() WHERE id = 1`);

    if (device.mode === 'auto' && batch) {
      let heater = 0;
      let fan = 0;
      let humAct = 0;

      if (curTemp < batch.target_temp_min) heater = 1;
      else if (curTemp >= batch.target_temp_max) fan = 1;

      if (curHum < batch.target_humidity_min) humAct = 1;

      await pool.query(
        `UPDATE device_states SET heater_status = ?, fan_status = ?, humidifier_status = ? WHERE id = 1`,
        [heater, fan, humAct]
      );
    }

    res.json({ success: true, simulated: { temperature: curTemp, humidity: curHum } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stream - SSE for live browser refresh
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const interval = setInterval(async () => {
    try {
      const batch = await getActiveBatch();
      const device = await getDeviceState();
      const latest = await getLatestTelemetry();
      const [alertRows] = await pool.query(
        `SELECT COUNT(*) AS unresolved_count FROM alerts WHERE is_resolved = 0`
      );

      const payload = {
        batch,
        device,
        latest_telemetry: latest,
        unresolved_alerts: alertRows[0]?.unresolved_count || 0,
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // client disconnected
    }
  }, 2500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Fallback to React index.html for SPA client routing
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Penetas Telur Backend berjalan di http://0.0.0.0:${PORT}`);
});
