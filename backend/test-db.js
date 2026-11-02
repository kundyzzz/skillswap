
const pool = require('./db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT current_database()');

    console.log('Database connected successfully!');
    console.log('Database:', result.rows[0].current_database);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
