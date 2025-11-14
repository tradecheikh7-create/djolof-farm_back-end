const { query } = require('../config/database');

// ============================================
// RÉCUPÉRER TOUS LES PRODUITS
// ============================================
const getAllProducts = async (req, res) => {
  try {
    const { category, available, featured } = req.query;
    
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (category) {
      sql += ` AND c.slug = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (available !== undefined) {
      sql += ` AND p.is_available = $${paramCount}`;
      params.push(available === 'true');
      paramCount++;
    }
    
    if (featured !== undefined) {
      sql += ` AND p.is_featured = $${paramCount}`;
      params.push(featured === 'true');
      paramCount++;
    }
    
    sql += ` ORDER BY p.created_at DESC`;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erreur getAllProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits',
      error: error.message
    });
  }
};

// ============================================
// RÉCUPÉRER UN PRODUIT PAR SON SLUG
// ============================================
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1
    `, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    await query('UPDATE products SET views_count = views_count + 1 WHERE slug = $1', [slug]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur getProductBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit',
      error: error.message
    });
  }
};

// ============================================
// CRÉER UN NOUVEAU PRODUIT
// ============================================
const createProduct = async (req, res) => {
  try {
    const {
      category_id, name, slug, description, price, unit,
      stock_quantity, min_order_quantity, lot_number,
      production_date, expiry_date, image_url,
      is_available, is_featured
    } = req.body;
    
    if (!name || !slug || !price) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants: name, slug, price'
      });
    }
    
    const result = await query(`
      INSERT INTO products (
        category_id, name, slug, description, price, unit,
        stock_quantity, min_order_quantity, lot_number,
        production_date, expiry_date, image_url,
        is_available, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      category_id, name, slug, description, price, unit || 'unité',
      stock_quantity || 0, min_order_quantity || 1, lot_number,
      production_date, expiry_date, image_url,
      is_available !== false, is_featured || false
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur createProduct:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Un produit avec ce slug existe déjà'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du produit',
      error: error.message
    });
  }
};

// ============================================
// METTRE À JOUR UN PRODUIT
// ============================================
const updateProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;
    
    const checkResult = await query('SELECT id FROM products WHERE slug = $1', [slug]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    values.push(slug);
    
    const result = await query(`
      UPDATE products SET ${setClause}
      WHERE slug = $${values.length}
      RETURNING *
    `, values);
    
    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit',
      error: error.message
    });
  }
};

// ============================================
// SUPPRIMER UN PRODUIT
// ============================================
const deleteProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await query('DELETE FROM products WHERE slug = $1 RETURNING *', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du produit',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
};