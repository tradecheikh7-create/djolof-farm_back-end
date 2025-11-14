const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validators');
const { query } = require('../config/database'); // Assurez-vous d'avoir cette importation

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
};

// Routes publiques
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);

// Routes protégées (nécessitent authentification)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Route admin pour lister tous les utilisateurs
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, first_name, last_name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

module.exports = router;