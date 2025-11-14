const { Pool } = require('pg');
const path = require('path');

// Chemin absolu vers .env
const envPath = path.join(__dirname, '../../.env');
console.log('📁 Tentative de chargement de .env depuis:', envPath);

// Charger .env
require('dotenv').config({ path: envPath });

// Vérifier si .env a été chargé
const fs = require('fs');
if (fs.existsSync(envPath)) {
  console.log('✓ Fichier .env trouvé\n');
} else {
  console.error('❌ ERREUR: Fichier .env introuvable à:', envPath);
  console.error('Créez le fichier .env dans le dossier backend/\n');
  process.exit(1);
}

// Afficher les variables (DEBUG)
console.log('🔍 Variables d\'environnement chargées:');
console.log('  DB_HOST:', process.env.DB_HOST || 'MANQUANT');
console.log('  DB_PORT:', process.env.DB_PORT || 'MANQUANT');
console.log('  DB_NAME:', process.env.DB_NAME || 'MANQUANT');
console.log('  DB_USER:', process.env.DB_USER || 'MANQUANT');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'MANQUANT');
console.log('');

// Vérifier que toutes les variables obligatoires sont présentes
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ ERREUR CRITIQUE: Variables manquantes dans .env');
  console.error('Assurez-vous que .env contient:');
  console.error('  - DB_HOST=localhost');
  console.error('  - DB_PORT=5432');
  console.error('  - DB_NAME=djolof_farm_db');
  console.error('  - DB_USER=djolof_admin');
  console.error('  - DB_PASSWORD=VotreMotDePasse\n');
  process.exit(1);
}

// Créer le pool de connexions
console.log('🔧 Création du pool de connexions PostgreSQL...');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

console.log('✓ Pool créé avec succès\n');

// Événements du pool
pool.on('connect', () => {
  console.log('✅ Nouvelle connexion PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL inattendue:', err.message);
});

// Fonction helper pour les requêtes
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✓ Requête SQL exécutée en ${duration}ms - ${result.rowCount} ligne(s)`);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la requête SQL:');
    console.error('   Message:', error.message);
    throw error;
  }
};

// Fonction de test de connexion
const testConnection = async () => {
  try {
    console.log('🔍 Test de connexion à PostgreSQL...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Test de connexion réussi!');
    console.log('⏰ Heure serveur:', result.rows[0].current_time);
    console.log('📦 Version:', result.rows[0].version.split(',')[0]);
    return true;
  } catch (error) {
    console.error('❌ Échec du test de connexion:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    return false;
  }
};

// Fonction pour fermer le pool proprement
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔌 Pool PostgreSQL fermé proprement');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture du pool:', error.message);
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  closePool
};