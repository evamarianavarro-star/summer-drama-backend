const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Render proporciona DATABASE_URL automáticamente al conectar la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Contraseña del panel de control (cámbiala en las variables de entorno de Render)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cambiaesto123';

// Crear tabla si no existe
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      day_key TEXT NOT NULL,
      mode TEXT NOT NULL,
      points INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      points INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO state (id, points, streak, max_streak)
    VALUES (1, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('Base de datos lista');
}

initDb().catch(console.error);

// ===== ENDPOINTS =====

// Guardar una sesión completada
app.post('/api/session', async (req, res) => {
  try {
    const { dayKey, mode, points, correctCount, totalQuestions, totalPoints, streak, maxStreak } = req.body;
    await pool.query(
      `INSERT INTO sessions (day_key, mode, points, correct_count, total_questions) VALUES ($1,$2,$3,$4,$5)`,
      [dayKey, mode, points, correctCount, totalQuestions]
    );
    await pool.query(
      `UPDATE state SET points=$1, streak=$2, max_streak=$3, updated_at=NOW() WHERE id=1`,
      [totalPoints, streak, maxStreak]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// Leer estado general (para que la app cargue el progreso global si se quiere sincronizar)
app.get('/api/state', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM state WHERE id=1');
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo estado' });
  }
});

// Panel de control: login simple
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
  }
});

// Panel de control: histórico completo de sesiones
app.get('/api/admin/sessions', async (req, res) => {
  try {
    const { password } = req.query;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'No autorizado' });
    const sessions = await pool.query('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 200');
    const state = await pool.query('SELECT * FROM state WHERE id=1');
    res.json({ sessions: sessions.rows, state: state.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error leyendo sesiones' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor corriendo en puerto ' + PORT));
