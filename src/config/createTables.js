const { pool, closePool } = require('./database');

const createTables = async () => {
  console.log('📦 Création des tables de la base de données Djolof Farm...\n');

  try {
    // // 1. Extension UUID
    // console.log('1️⃣ Création de l\'extension UUID...');
    // await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    // console.log('   ✓ Extension UUID créée\n');
    console.log('1️⃣ Vérification de l\'extension UUID...');
const extCheck = await pool.query(`
  SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
`);
if (extCheck.rows.length > 0) {
  console.log('   ✓ Extension UUID disponible\n');
} else {
  console.error('   ❌ Extension UUID manquante. Exécutez avec postgres:');
  console.error('      psql -U postgres -d djolof_farm_db -c "CREATE EXTENSION \\"uuid-ossp\\";"');
  throw new Error('Extension UUID manquante');
}
    // 2. Table USERS
    console.log('2️⃣ Création de la table USERS...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    console.log('   ✓ Table USERS créée\n');

    // 3. Table CATEGORIES
    console.log('3️⃣ Création de la table CATEGORIES...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✓ Table CATEGORIES créée\n');

    // 4. Insérer les catégories par défaut
    console.log('4️⃣ Insertion des catégories par défaut...');
    await pool.query(`
      INSERT INTO categories (name, slug, description) VALUES
        ('Œufs Bio', 'oeufs-bio', 'Œufs frais et traçables de nos poules élevées en plein air'),
        ('Produits Laitiers', 'produits-laitiers', 'Lait frais et produits dérivés artisanaux'),
        ('Volailles', 'volailles', 'Poulets et dindes élevés naturellement')
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log('   ✓ Catégories insérées\n');

    // 5. Table PRODUCTS
    console.log('5️⃣ Création de la table PRODUCTS...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id INTEGER REFERENCES categories(id),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        unit VARCHAR(50) DEFAULT 'unité',
        stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
        min_order_quantity INTEGER DEFAULT 1,
        lot_number VARCHAR(100),
        production_date DATE,
        expiry_date DATE,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        sales_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    `);
    console.log('   ✓ Table PRODUCTS créée\n');

    // 6. Table ORDERS
    console.log('6️⃣ Création de la table ORDERS...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        customer_name VARCHAR(200) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        delivery_address TEXT,
        delivery_method VARCHAR(50) DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery')),
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('wave', 'orange_money', 'cash')),
        payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        payment_reference VARCHAR(200),
        subtotal DECIMAL(10, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
        customer_notes TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at DESC);
    `);
    console.log('   ✓ Table ORDERS créée\n');

    // 7. Table ORDER_ITEMS
    console.log('7️⃣ Création de la table ORDER_ITEMS...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        product_price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        subtotal DECIMAL(10, 2) NOT NULL,
        lot_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
    console.log('   ✓ Table ORDER_ITEMS créée\n');

    // 8. Table BLOG_POSTS
    console.log('8️⃣ Création de la table BLOG_POSTS...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        author_id UUID REFERENCES users(id),
        title VARCHAR(300) NOT NULL,
        slug VARCHAR(300) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        featured_image VARCHAR(500),
        meta_description TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(is_published, published_at DESC);
    `);
    console.log('   ✓ Table BLOG_POSTS créée\n');

    // 9. Fonction de mise à jour automatique
    console.log('9️⃣ Création de la fonction de mise à jour automatique...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Fonction créée\n');

    // 10. Triggers
    console.log('🔟 Création des triggers...');
    const tables = ['users', 'products', 'orders', 'blog_posts'];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log(`   ✓ Trigger pour ${table} créé`);
    }
    console.log('');

    console.log('✅ TOUTES LES TABLES ONT ÉTÉ CRÉÉES AVEC SUCCÈS!\n');
    
    // Vérification
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables créées dans la base de données:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ ERREUR lors de la création des tables:');
    console.error('Message:', error.message);
    console.error('Détail:', error.detail || 'Aucun détail supplémentaire');
    throw error;
  } finally {
    await closePool();
  }
};

// Exécution
createTables()
  .then(() => {
    console.log('🎉 Migration terminée avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration échouée');
    process.exit(1);
  });