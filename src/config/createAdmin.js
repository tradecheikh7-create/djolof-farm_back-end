const { query, closePool } = require('./database');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  console.log('👤 Création du compte administrateur...\n');

  try {
    const email = 'admin@djoloffarm.sn';
    const password = 'Admin@Djolof2025!';

    // Vérifier si l'admin existe déjà
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      console.log('⚠️  Un compte admin existe déjà avec cet email');
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Créer l'admin
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role
    `, [email, password_hash, 'Admin', 'Djolof Farm', 'admin', true]);

    console.log('✅ Compte administrateur créé avec succès!\n');
    console.log('📧 Email:', email);
    console.log('🔒 Mot de passe:', password);
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error.message);
    throw error;
  } finally {
    await closePool();
  }
};

createAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));