const { query } = require('../config/database');
const axios = require('axios');
const crypto = require('crypto');

// Configuration Wave (Sandbox)
const WAVE_CONFIG = {
  api_key: process.env.WAVE_API_KEY || 'your_wave_sandbox_key',
  api_secret: process.env.WAVE_API_SECRET || 'your_wave_sandbox_secret',
  base_url: process.env.WAVE_BASE_URL || 'https://api.wave.com/v1',
  callback_url: process.env.APP_URL + '/api/payments/wave/callback'
};

// Configuration Orange Money (Sandbox)
const ORANGE_CONFIG = {
  merchant_key: process.env.ORANGE_MERCHANT_KEY || 'your_orange_sandbox_key',
  base_url: process.env.ORANGE_BASE_URL || 'https://api.orange.com/orange-money-webpay/dev/v1',
  callback_url: process.env.APP_URL + '/api/payments/orange/callback'
};

// Initier un paiement
const initiatePayment = async (req, res) => {
  try {
    const { order_id, payment_method, phone_number } = req.body;

    // Validation
    if (!order_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'order_id et payment_method sont obligatoires'
      });
    }

    // Récupérer la commande
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const order = orderResult.rows[0];

    // Vérifier que la commande n'est pas déjà payée
    if (order.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cette commande est déjà payée'
      });
    }

    let paymentResponse;

    // Traiter selon le mode de paiement
    switch (payment_method) {
      case 'wave':
        paymentResponse = await initiateWavePayment(order, phone_number);
        break;
      
      case 'orange_money':
        paymentResponse = await initiateOrangeMoneyPayment(order, phone_number);
        break;
      
      case 'cash':
        // Paiement en espèces - pas de traitement en ligne
        await query(`
          UPDATE orders 
          SET payment_method = $1, payment_status = $2
          WHERE id = $3
        `, ['cash', 'pending', order_id]);
        
        return res.json({
          success: true,
          message: 'Commande confirmée - Paiement à la livraison',
          data: { payment_method: 'cash', status: 'pending' }
        });
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Mode de paiement non supporté'
        });
    }

    // Mettre à jour la commande avec la référence de paiement
    await query(`
      UPDATE orders 
      SET payment_method = $1, payment_reference = $2, payment_status = $3
      WHERE id = $4
    `, [payment_method, paymentResponse.reference, 'pending', order_id]);

    res.json({
      success: true,
      message: 'Paiement initié avec succès',
      data: paymentResponse
    });

  } catch (error) {
    console.error('Erreur initiatePayment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du paiement',
      error: error.message
    });
  }
};

// Initier paiement Wave
const initiateWavePayment = async (order, phone_number) => {
  try {
    const reference = `DJOLOF_${order.id}_${Date.now()}`;

    // MODE DÉVELOPPEMENT - Simulation
    if (process.env.NODE_ENV === 'development') {
      console.log('MODE SIMULATION WAVE - Paiement simulé');
      return {
        reference: reference,
        payment_url: `${process.env.FRONTEND_URL}/payment-simulation/wave/${reference}`,
        session_id: `sim_${Date.now()}`,
        simulation: true,
        message: 'Mode développement - Utilisez /api/payments/simulate-success pour valider'
      };
    }

    // MODE PRODUCTION - Vraie API Wave
    const payload = {
      amount: parseFloat(order.total_amount),
      currency: 'XOF',
      error_url: `${process.env.FRONTEND_URL}/orders/${order.id}/payment-error`,
      success_url: `${process.env.FRONTEND_URL}/orders/${order.id}/payment-success`,
      customer_name: order.customer_name,
      customer_email: order.customer_email || '',
      merchant_reference: reference
    };

    const response = await axios.post(
      `${WAVE_CONFIG.base_url}/checkout/sessions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${WAVE_CONFIG.api_key}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      reference: reference,
      payment_url: response.data.wave_launch_url,
      session_id: response.data.id
    };

  } catch (error) {
    console.error('Erreur Wave:', error.response?.data || error.message);
    throw new Error('Erreur lors de l\'initiation du paiement Wave');
  }
};

// Initier paiement Orange Money
const initiateOrangeMoneyPayment = async (order, phone_number) => {
  try {
    const reference = `DJOLOF_${order.id}_${Date.now()}`;

    // MODE DÉVELOPPEMENT - Simulation
    if (process.env.NODE_ENV === 'development') {
      console.log('MODE SIMULATION ORANGE MONEY - Paiement simulé');
      return {
        reference: reference,
        payment_url: `${process.env.FRONTEND_URL}/payment-simulation/orange/${reference}`,
        token: `sim_token_${Date.now()}`,
        simulation: true,
        message: 'Mode développement - Utilisez /api/payments/simulate-success pour valider'
      };
    }

    // MODE PRODUCTION - Vraie API Orange Money
    const payload = {
      merchant_key: ORANGE_CONFIG.merchant_key,
      currency: 'XOF',
      order_id: reference,
      amount: parseFloat(order.total_amount),
      return_url: `${process.env.FRONTEND_URL}/orders/${order.id}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/orders/${order.id}/payment-cancel`,
      notif_url: ORANGE_CONFIG.callback_url,
      lang: 'fr',
      reference: order.id
    };

    const response = await axios.post(
      `${ORANGE_CONFIG.base_url}/webpayment`,
      payload
    );

    return {
      reference: reference,
      payment_url: response.data.payment_url,
      token: response.data.payment_token
    };

  } catch (error) {
    console.error('Erreur Orange Money:', error.response?.data || error.message);
    throw new Error('Erreur lors de l\'initiation du paiement Orange Money');
  }
};

// Webhook Wave
const waveWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log('Wave Webhook reçu:', event, data);

    if (event === 'checkout.completed' && data.status === 'success') {
      const reference = data.merchant_reference;
      const orderId = reference.split('_')[1];

      await query(`
        UPDATE orders 
        SET payment_status = $1, payment_reference = $2, order_status = $3
        WHERE id = $4
      `, ['completed', reference, 'confirmed', orderId]);

      console.log(`Paiement Wave confirmé pour commande ${orderId}`);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur Wave Webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Webhook Orange Money
const orangeMoneyWebhook = async (req, res) => {
  try {
    const { status, order_id, reference } = req.body;

    console.log('Orange Money Webhook reçu:', req.body);

    if (status === 'SUCCESS') {
      const orderId = order_id.split('_')[1];

      await query(`
        UPDATE orders 
        SET payment_status = $1, payment_reference = $2, order_status = $3
        WHERE id = $4
      `, ['completed', reference, 'confirmed', orderId]);

      console.log(`Paiement Orange Money confirmé pour commande ${orderId}`);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur Orange Money Webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Vérifier le statut d'un paiement
const checkPaymentStatus = async (req, res) => {
  try {
    const { order_id } = req.params;

    const result = await query(
      'SELECT payment_status, payment_method, payment_reference, order_status FROM orders WHERE id = $1',
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur checkPaymentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du paiement',
      error: error.message
    });
  }
};

// Simuler un paiement réussi (développement uniquement)
const simulatePaymentSuccess = async (req, res) => {
  try {
    console.log('Simulation de paiement en cours...');
    
    if (process.env.NODE_ENV !== 'development') {
      console.log('Environnement de production détecté. Simulation impossible.');
      return res.status(403).json({
        success: false,
        message: 'Cette route n\'est disponible qu\'en mode développement'
      });
    }

    const { order_id } = req.body;
    console.log(`Simulation de paiement pour la commande: ${order_id}`);

    if (!order_id) {
      console.log('order_id manquant');
      return res.status(400).json({
        success: false,
        message: 'order_id est obligatoire'
      });
    }

    // Vérifier que la commande existe
    const orderCheck = await query('SELECT id FROM orders WHERE id = $1', [order_id]);
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Mettre à jour le statut de paiement
    await query(`
      UPDATE orders 
      SET payment_status = $1, payment_reference = $2, order_status = $3
      WHERE id = $4
    `, ['completed', `SIM_${Date.now()}`, 'confirmed', order_id]);

    console.log('Simulation de paiement réussie');
    
    res.json({
      success: true,
      message: 'Paiement simulé avec succès (mode développement)',
      data: {
        order_id: order_id,
        payment_status: 'completed',
        order_status: 'confirmed',
        simulation: true
      }
    });

  } catch (error) {
    console.error('Erreur lors de la simulation de paiement:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  initiatePayment,
  waveWebhook,
  orangeMoneyWebhook,
  checkPaymentStatus,
  simulatePaymentSuccess
};