const { logger } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message).join(', ');
    statusCode = 400;
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON body';
  }
  if (statusCode >= 500 && !err.isOperational && process.env.NODE_ENV !== 'development') {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler, AppError };
