/*
 * Penetas Telur IoT — ESP32 + AC Dimmer (phase control)
 * ------------------------------------------------------
 * Kontrol pemanas pakai DIMMER (bukan relay on/off) supaya suhu bisa
 * ditahan presisi dengan PID, bukan melompat-lompat seperti kontrol histeresis.
 *
 * Hardware:
 *   - ESP32 Lolin32 Lite
 *   - SHT30 (I2C: SDA 21, SCL 22, addr 0x44)
 *   - RobotDyn AC Dimmer Module (zero-cross + triac)
 *       ZC  -> GPIO 25 (interrupt, RISING)
 *       DIM -> GPIO 26 (pulse pemicu triac)
 *   - Fan 12V  -> GPIO 27 lewat MOSFET module / relay (fan boleh on-off)
 *   - Servo pembalik telur -> GPIO 13 (LEDC 50 Hz, 500-2400 us)
 *
 * Prinsip kontrol:
 *   PID lokal di ESP32 (loop 1 Hz) -> duty 0..100% -> sudut picu triac.
 *   Zero-cross 50 Hz: setengah periode = 10.000 us.
 *   Delay picu 9.000 us = daya ~minimal, 1.200 us = daya ~maksimal.
 *
 * Keselamatan: sisi AC 220V mematikan. Pakai lampu pijar (dimmable),
 * jangan LED/CFL non-dimmable. Beri sekring 2A dan kotak tertutup.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <esp_arduino_version.h>

// ===================== KONFIGURASI =====================
const char* WIFI_SSID     = "GANTI_SSID";
const char* WIFI_PASS     = "GANTI_PASSWORD";
const char* SERVER_URL    = "http://IP_VPS:3000/api/device/telemetry";

const int   PIN_ZC        = 25;   // zero-cross input
const int   PIN_DIM       = 26;   // triac gate
const int   PIN_FAN       = 27;
const int   PIN_SERVO     = 13;
const int   PIN_SDA       = 21;
const int   PIN_SCL       = 22;

const float SETPOINT_DEFAULT = 37.8;   // °C
const float KP = 12.0;                 // tuning awal, geser sesuai respons kotak
const float KI = 0.08;
const float KD = 60.0;
const int   TURN_INTERVAL_MS = 4UL * 60UL * 60UL * 1000UL;  // balik tiap 4 jam
const unsigned long TELEMETRY_MS = 10000;
// =======================================================

// --- state PWM dimmer ---
volatile uint16_t g_delayUs = 9000;   // 9000 us = nyaris mati, 1200 us = nyaris penuh
hw_timer_t* g_timer = nullptr;
portMUX_TYPE g_mux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR armOneShot(uint16_t us) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  timerWrite(g_timer, 0);
  timerAlarm(g_timer, us, false, 0);
#else
  timerAlarmWrite(g_timer, us, false);
  timerAlarmEnable(g_timer);
#endif
}

void IRAM_ATTR onZeroCross() {
  portENTER_CRITICAL_ISR(&g_mux);
  armOneShot(g_delayUs);
  portEXIT_CRITICAL_ISR(&g_mux);
}

void IRAM_ATTR onFireTriac() {
  digitalWrite(PIN_DIM, HIGH);
  delayMicroseconds(50);        // pulse cukup untuk latching triac
  digitalWrite(PIN_DIM, LOW);
}

// duty 0..100 (%) -> delay picu (us)
void setHeaterPower(float duty) {
  duty = constrain(duty, 0.0f, 100.0f);
  uint16_t d;
  if (duty <= 0.5f) {
    d = 10000;                  // tidak memicu sama sekali
  } else {
    // Linear terhadap duty. Panel lampu pijar tidak linear terhadap sudut,
    // jadi kalibrasi ulang tabel ini setelah alat jadi (lihat docs/HARDWARE.md).
    d = (uint16_t)(9000.0f - (duty * 78.0f));   // 1% -> 8922 us, 100% -> 1200 us
  }
  portENTER_CRITICAL(&g_mux);
  g_delayUs = d;
  portEXIT_CRITICAL(&g_mux);
}

// ---------------- SHT30 ----------------
bool sht30Read(float &t, float &rh) {
  Wire.beginTransmission(0x44);
  Wire.write(0x2C); Wire.write(0x06);          // high repeatability, no clock stretch
  if (Wire.endTransmission() != 0) return false;
  delay(20);
  if (Wire.requestFrom(0x44, 6) != 6) return false;
  uint8_t b[6];
  for (int i = 0; i < 6; i++) b[i] = Wire.read();
  uint16_t rawT = (b[0] << 8) | b[1];
  uint16_t rawH = (b[3] << 8) | b[4];
  t  = -45.0 + 175.0 * (rawT / 65535.0);
  rh = 100.0 * (rawH / 65535.0);
  return true;
}

// ---------------- PID ----------------
float iTerm = 0, lastErr = 0;
unsigned long lastPidMs = 0;

float computePid(float temp, float setpoint) {
  unsigned long now = millis();
  float dt = (now - lastPidMs) / 1000.0f;
  if (dt <= 0 || dt > 10) dt = 1.0f;
  lastPidMs = now;

  float err = setpoint - temp;
  iTerm += err * dt;
  iTerm = constrain(iTerm, -50.0f, 50.0f);          // anti-windup

  float d = (err - lastErr) / dt;
  lastErr = err;

  float out = KP * err + KI * iTerm * 100.0f + KD * d;
  return constrain(out, 0.0f, 100.0f);
}

// ---------------- Servo (LEDC, tanpa library) ----------------
void servoAngle(int deg) {
  deg = constrain(deg, 0, 180);
  uint32_t us = 500 + (uint32_t)(deg * (1900.0 / 180.0));
  uint32_t duty = (uint32_t)((us / 20000.0) * 65535.0);   // 50 Hz -> 20 ms
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PIN_SERVO, duty);          // core 3.x: index = pin
#else
  ledcWrite(0, duty);                  // core 2.x: index = channel
#endif
}

// ---------------- HTTP ----------------
int extractInt(const String &s, const char* key, int defVal) {
  int i = s.indexOf(key);
  if (i < 0) return defVal;
  i = s.indexOf(':', i);
  if (i < 0) return defVal;
  return s.substring(i + 1).toInt();
}

String extractStr(const String &s, const char* key) {
  int i = s.indexOf(key);
  if (i < 0) return "";
  i = s.indexOf(':', i);
  int q1 = s.indexOf('"', i);
  int q2 = s.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 < 0) return "";
  return s.substring(q1 + 1, q2);
}

float extractFloat(const String &s, const char* key, float defVal) {
  int i = s.indexOf(key);
  if (i < 0) return defVal;
  i = s.indexOf(':', i);
  if (i < 0) return defVal;
  int j = i + 1;
  while (j < (int)s.length() && (s[j] == ' ' || s[j] == '"')) j++;
  int k = j;
  while (k < (int)s.length() && (isdigit(s[k]) || s[k] == '.' || s[k] == '-' || s[k] == '+')) k++;
  if (k == j) return defVal;
  return s.substring(j, k).toFloat();
}

bool postTelemetry(float t, float rh, int power, bool &autoFlag, int &cmdPower, float &sp) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  String body = String("{\"temperature\":") + String(t, 2) +
                ",\"humidity\":" + String(rh, 1) +
                ",\"heater_power\":" + String(power) + "}";

  int code = http.POST(body);
  String resp = http.getString();
  http.end();
  if (code != 200) return false;

  autoFlag  = (extractStr(resp, "\"mode\"") == "auto");
  cmdPower  = extractInt(resp, "\"heater_power\"", power);
  sp        = extractFloat(resp, "\"temp_setpoint\"", SETPOINT_DEFAULT);
  if (sp < 20.0f || sp > 45.0f) sp = SETPOINT_DEFAULT;
  return true;
}

// ---------------- MAIN ----------------
unsigned long lastTelemetry = 0, lastTurn = 0, lastRead = 0, lastPid = 0;
float tempC = 0, humRH = 0;
int powerOut = 0;
bool serverOk = false;
bool autoMode = true;        // default: PID lokal
float setpoint = SETPOINT_DEFAULT;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_DIM, OUTPUT);
  digitalWrite(PIN_DIM, LOW);
  pinMode(PIN_ZC, INPUT_PULLUP);
  pinMode(PIN_FAN, OUTPUT);
  digitalWrite(PIN_FAN, LOW);

  Wire.begin(PIN_SDA, PIN_SCL);

#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PIN_SERVO, 50, 16);
#else
  ledcSetup(0, 50, 16);
  ledcAttachPin(PIN_SERVO, 0);
#endif
  servoAngle(90);

  // Timer 1 MHz -> 1 tick = 1 us
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  g_timer = timerBegin(1000000);
  timerAttachInterrupt(g_timer, &onFireTriac);
  timerAlarm(g_timer, 9000, false, 0);
#else
  g_timer = timerBegin(0, 80, true);
  timerAttachInterrupt(g_timer, &onFireTriac, true);
  timerAlarmWrite(g_timer, 9000, false);
  timerAlarmEnable(g_timer);
#endif

  attachInterrupt(digitalPinToInterrupt(PIN_ZC), onZeroCross, RISING);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastPidMs = millis();
  lastTurn = millis();
}

void loop() {
  unsigned long now = millis();

  // 1) baca sensor tiap 2 detik
  if (now - lastRead >= 2000) {
    lastRead = now;
    float t, rh;
    if (sht30Read(t, rh)) { tempC = t; humRH = rh; }
  }

  // 2) kirim telemetri + ambil perintah server tiap 10 detik
  if (now - lastTelemetry >= TELEMETRY_MS) {
    lastTelemetry = now;
    int cmd = powerOut;
    float sp = setpoint;
    bool autoFlag = autoMode;
    serverOk = postTelemetry(tempC, humRH, powerOut, autoFlag, cmd, sp);
    if (serverOk) {
      autoMode = autoFlag;
      setpoint = sp;
      if (!autoMode) {
        powerOut = constrain(cmd, 0, 100);   // mode manual: server yang pegang
        setHeaterPower(powerOut);
      }
    }
  }

  // 3) PID lokal 1 Hz, hanya saat mode auto (atau server mati = fail-safe auto)
  if (now - lastPid >= 1000) {
    lastPid = now;
    if (autoMode || !serverOk) {
      powerOut = (int)computePid(tempC, serverOk ? setpoint : SETPOINT_DEFAULT);
      setHeaterPower(powerOut);
    }
  }

  // 4) fan: nyala saat pemanas kerja atau suhu kelewat batas
  digitalWrite(PIN_FAN, (powerOut > 0 || tempC > 38.5) ? HIGH : LOW);

  // 5) pembalik telur tiap 4 jam
  if (now - lastTurn >= TURN_INTERVAL_MS) {
    lastTurn = now;
    servoAngle(45);  delay(1200);
    servoAngle(135); delay(1200);
    servoAngle(90);
  }

  delay(50);
}
