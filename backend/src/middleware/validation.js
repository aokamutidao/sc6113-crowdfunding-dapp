const { param, query, validationResult } = require('express-validator');
const { ethers } = require('ethers');

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid request parameters', details: errors.array().map(({ path, msg }) => ({ field: path, message: msg })) });
  }
  next();
};

const addressParam = name => [
  param(name).custom(value => ethers.isAddress(value)).withMessage('Must be a valid Ethereum address').bail().customSanitizer(value => ethers.getAddress(value)),
  checkValidation,
];

const projectQuery = [
  query('status').optional().isIn(['active', 'successful', 'failed', 'fundsWithdrawn']),
  query('category').optional().isString().isLength({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'deadline', 'title', 'status']),
  query('order').optional().isIn(['ASC', 'DESC']),
  checkValidation,
];

module.exports = { addressParam, projectQuery };
