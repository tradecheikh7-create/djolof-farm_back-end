const { body } = require('express-validator');

// Validation pour l'inscription
const registerValidator = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('first_name')
    .notEmpty().withMessage('Le prénom est obligatoire')
    .trim(),
  body('last_name')
    .notEmpty().withMessage('Le nom est obligatoire')
    .trim(),
  body('phone')
    .optional()
    .matches(/^(\+221)?[0-9]{9}$/).withMessage('Numéro de téléphone sénégalais invalide (format: +221XXXXXXXXX ou XXXXXXXXX)')
];

// Validation pour la connexion
const loginValidator = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est obligatoire')
];

module.exports = {
  registerValidator,
  loginValidator
};