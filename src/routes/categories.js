const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

router.get('/', getAllCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', createCategory);
router.put('/:slug', updateCategory);
router.delete('/:slug', deleteCategory);

module.exports = router;