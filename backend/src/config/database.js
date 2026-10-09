const path = require('path');
const fs = require('fs');
const storage = process.env.DATABASE_PATH || path.join(__dirname, '../../db/database.sqlite');
if (storage !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(storage)), { recursive: true });

module.exports = {
  development: {
    dialect: 'sqlite',
    storage,
    logging: false,
  },
  test: {
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || ':memory:',
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage,
    logging: false,
  },
};
