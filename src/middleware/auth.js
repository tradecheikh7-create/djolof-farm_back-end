const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// ============================================
// MIDDLEWARE: VÉRIFIER QUE L'UTILISATEUR EST AUTHENTIFIÉ
// ============================================
const protect = async (req, res, next) => {
  try {
    let token;

    // Récupérer le token depuis l'en-tête Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier que le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur depuis la base de données
      const result = await query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Attacher l'utilisateur à la requête
      req.user = result.rows[0];
      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

  } catch (error) {
    console.error('Erreur middleware protect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

// ============================================
// MIDDLEWARE: VÉRIFIER LE RÔLE DE L'UTILISATEUR
// ============================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis: ${roles.join(' ou ')}`
      });
    }

    next();
  };
};

module.exports = { protect, authorize };