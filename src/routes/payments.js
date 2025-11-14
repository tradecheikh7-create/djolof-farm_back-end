const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  waveWebhook,
  orangeMoneyWebhook,
  checkPaymentStatus,
  simulatePaymentSuccess
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Vérification de l'environnement
const isDevelopment = process.env.NODE_ENV === 'development';

// Routes de paiement
router.post('/initiate', protect, initiatePayment);
router.post('/wave/callback', waveWebhook);
router.post('/orange/callback', orangeMoneyWebhook);
router.get('/status/:order_id', protect, checkPaymentStatus);

// Route simulation (développement uniquement)
if (isDevelopment) {
  router.post('/simulate-success', simulatePaymentSuccess);
  console.log('✅ Route de simulation activée pour le développement');
} else {
  console.log('⚠️  Route de simulation désactivée pour la production');
}

module.exports = router;