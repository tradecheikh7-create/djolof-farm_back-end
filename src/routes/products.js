const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Routes publiques
router.get('/', getAllProducts);
router.get('/:slug', getProductBySlug);

// Routes admin protégées
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:slug', protect, authorize('admin'), updateProduct);
router.delete('/:slug', protect, authorize('admin'), deleteProduct);

module.exports = router;