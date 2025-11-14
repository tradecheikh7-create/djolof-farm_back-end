const { pool } = require('./database');

console.log('\n🚀 === SCRIPT SEED PRODUCTS ===\n');

const seedProducts = async () => {
  console.log('🌱 Insertion de produits de test...\n');

  try {
    // Récupérer les catégories
    console.log('📦 Récupération des catégories...');
    const categories = await pool.query('SELECT id, slug FROM categories');
    console.log(`✅ ${categories.rows.length} catégories trouvées\n`);
    
    const categoryMap = {};
    categories.rows.forEach(cat => {
      categoryMap[cat.slug] = cat.id;
      console.log(`   ${cat.slug} -> ID: ${cat.id}`);
    });
    console.log('');

    // Produits à insérer
    const products = [
      {
        category_id: categoryMap['oeufs-bio'],
        name: 'Œufs Bio Fermiers - Boîte de 6',
        slug: 'oeufs-bio-fermiers-6',
        description: 'Œufs frais de nos poules élevées en plein air.',
        price: 1500,
        unit: 'boîte',
        stock_quantity: 50,
        image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800',
        is_available: true,
        is_featured: true
      },
      {
        category_id: categoryMap['oeufs-bio'],
        name: 'Œufs Bio Fermiers - Boîte de 12',
        slug: 'oeufs-bio-fermiers-12',
        description: 'Format économique pour familles.',
        price: 2800,
        unit: 'boîte',
        stock_quantity: 30,
        image_url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800',
        is_available: true,
        is_featured: true
      },
      {
        category_id: categoryMap['produits-laitiers'],
        name: 'Lait Frais Pasteurisé - 1L',
        slug: 'lait-frais-1l',
        description: 'Lait de vache 100% local.',
        price: 1200,
        unit: 'litre',
        stock_quantity: 25,
        image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800',
        is_available: true,
        is_featured: false
      },
      {
        category_id: categoryMap['produits-laitiers'],
        name: 'Fromage Artisanal Nature - 250g',
        slug: 'fromage-artisanal-250g',
        description: 'Fromage fermier fabriqué artisanalement.',
        price: 3500,
        unit: 'pièce',
        stock_quantity: 15,
        image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800',
        is_available: true,
        is_featured: false
      },
      {
        category_id: categoryMap['volailles'],
        name: 'Poulet Fermier Entier - 1.5kg',
        slug: 'poulet-fermier-entier',
        description: 'Poulet élevé en plein air.',
        price: 8500,
        unit: 'kg',
        stock_quantity: 12,
        image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800',
        is_available: true,
        is_featured: true
      }
    ];

    console.log(`\n📝 Insertion de ${products.length} produits...\n`);

    // Insérer chaque produit
    for (const product of products) {
      await pool.query(`
        INSERT INTO products (
          category_id, name, slug, description, price, unit,
          stock_quantity, image_url, is_available, is_featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO NOTHING
      `, [
        product.category_id, product.name, product.slug, product.description,
        product.price, product.unit, product.stock_quantity,
        product.image_url, product.is_available, product.is_featured
      ]);
      
      console.log(`   ✓ ${product.name}`);
    }

    console.log('\n✅ Tous les produits ont été insérés!\n');

    // Résumé
    const summary = await pool.query(`
      SELECT c.name as category, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.name
      ORDER BY c.name
    `);

    console.log('📊 Résumé par catégorie:');
    summary.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.product_count} produit(s)`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ ERREUR:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Connexion fermée\n');
  }
};

seedProducts()
  .then(() => {
    console.log('✅ Script terminé avec succès!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué\n');
    process.exit(1);
  });