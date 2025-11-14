const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

// Récupérer tous les utilisateurs (admin uniquement)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, first_name, last_name, phone, role, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération users:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

// Récupérer un utilisateur par ID
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Un utilisateur ne peut voir que son propre profil sauf s'il est admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const result = await query(`
      SELECT id, email, first_name, last_name, phone, role, is_verified, created_at
      FROM users
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur récupération user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

module.exports = router;