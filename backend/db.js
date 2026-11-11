require('dotenv').config();

const { Pool } = require('pg');

// In the cloud (Render + Neon) we get one DATABASE_URL with SSL.
// Locally we keep using DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD from .env.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

module.exports = pool;