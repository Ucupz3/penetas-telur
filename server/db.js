import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'incubator',
  password: process.env.DB_PASSWORD || 'incubator_pass123',
  database: process.env.DB_NAME || 'incubator_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testDb() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    return rows[0].result === 2;
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    return false;
  }
}
