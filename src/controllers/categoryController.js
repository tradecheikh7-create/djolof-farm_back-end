const { query } = require('../config/database');

const getAllCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_available = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const categoryResult = await query(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_available = true
      WHERE c.slug = $1
      GROUP BY c.id
    `, [slug]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }
    
    const category = categoryResult.rows[0];
    
    const productsResult = await query(`
      SELECT * FROM products
      WHERE category_id = $1 AND is_available = true
      ORDER BY created_at DESC
    `, [category.id]);
    
    res.json({
      success: true,
      data: {
        ...category,
        products: productsResult.rows
      }
    });
  } catch (error) {
    console.error('Erreur getCategoryBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la catégorie',
      error: error.message
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants: name, slug'
      });
    }
    
    const result = await query(`
      INSERT INTO categories (name, slug, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, slug, description]);
    
    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur createCategory:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Une catégorie avec ce slug existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la catégorie',
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;
    
    const checkResult = await query('SELECT id FROM categories WHERE slug = $1', [slug]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
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
      UPDATE categories
      SET ${setClause}
      WHERE slug = $${values.length}
      RETURNING *
    `, values);
    
    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur updateCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la catégorie',
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const productsCheck = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = $1)',
      [slug]
    );
    
    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une catégorie contenant des produits'
      });
    }
    
    const result = await query('DELETE FROM categories WHERE slug = $1 RETURNING *', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur deleteCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la catégorie',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};