const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

// Routes protégées (customer peut créer et voir ses commandes)
router.post('/', protect, createOrder);

// Routes admin uniquement
router.get('/', protect, authorize('admin'), getAllOrders);

// Route accessible au propriétaire de la commande ou admin
router.get('/:id', protect, getOrderById);

// Routes admin pour gérer les commandes
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus);

// Route pour annuler (customer peut annuler sa propre commande)
router.patch('/:id/cancel', protect, cancelOrder);

// Route pour mettre à jour les notes admin
router.patch('/:id/notes', protect, authorize('admin'), async (req, res) => {
  try {
    const { admin_notes } = req.body;
    
    const result = await query(
      'UPDATE orders SET admin_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [admin_notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Notes mises à jour',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur mise à jour notes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour des notes',
      error: error.message 
    });
  }
});

module.exports = router;