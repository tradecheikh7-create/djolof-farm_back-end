const { pool } = require('./database');

const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Test DB réussi!');
    console.log('⏰ Heure serveur PostgreSQL:', result.rows[0].current_time);
    process.exit(0);
  } catch (error) {
    console.error('❌ Échec connexion DB:', error.message);
    process.exit(1);
  }
};

testConnection();