const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARES
// ============================================

// Sécurité des en-têtes HTTP
app.use(helmet());

// CORS - Autoriser le frontend à communiquer
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parser le JSON dans les requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger les requêtes (développement)
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  next();
});

// ============================================
// ROUTES DE BASE
// ============================================

// Route racine - Test du serveur
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌾 Bienvenue sur l\'API Djolof Farm - La ferme du futur',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      blog: '/api/blog'
    }
  });
});

// Route de santé - Vérifier que l'API et la DB fonctionnent
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      success: true,
      message: 'API Djolof Farm opérationnelle',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'Connectée ✅' : 'Déconnectée ❌',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion à la base de données',
      error: error.message
    });
  }
});

// ============================================
// CHARGEMENT DES ROUTES AVEC GESTION D'ERREUR
// ============================================

const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/auth' },
    { path: '/api/users', file: './routes/users' }, // ← AJOUTEZ CETTE LIGNE
    { path: '/api/products', file: './routes/products' },
    { path: '/api/categories', file: './routes/categories' },
    { path: '/api/orders', file: './routes/orders' },
    { path: '/api/payments', file: './routes/payments' }
  ];

  routes.forEach(route => {
    try {
      const router = require(route.file);
      app.use(route.path, router);
      console.log(`✅ Routes chargées: ${route.path}`);
    } catch (error) {
      console.error(`❌ ERREUR chargement ${route.path}:`, error.message);
      // Ne pas arrêter le serveur, mais logger l'erreur
    }
  });
};

// Charger toutes les routes
loadRoutes();

// ============================================
// GESTION DES ERREURS
// ============================================

// Route non trouvée (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /',
      'GET /api/health'
    ]
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.message);
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    console.log('🔍 Test de connexion à PostgreSQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Impossible de se connecter à PostgreSQL');
      console.error('Vérifiez vos credentials dans .env');
      process.exit(1);
    }
    
    console.log('');
    
    // Démarrer le serveur Express
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║                                                        ║');
      console.log('║        🌾 DJOLOF FARM API - La ferme du futur 🌾      ║');
      console.log('║                                                        ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`✅ Serveur démarré avec succès !`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Base de données: ${process.env.DB_NAME}`);
      console.log('');
      console.log('📡 Endpoints disponibles:');
      console.log(`   - GET  http://localhost:${PORT}/`);
      console.log(`   - GET  http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('👉 Appuyez sur Ctrl+C pour arrêter le serveur');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error.message);
    process.exit(1);
  }
};

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt du serveur...');
  console.log('👋 À bientôt sur Djolof Farm !');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Arrêt du serveur...');
  process.exit(0);
});

// Démarrer le serveur
startServer();

module.exports = app;