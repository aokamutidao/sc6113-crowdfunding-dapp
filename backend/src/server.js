require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { logger } = require('./utils/logger');
const { sequelize } = require('./models');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { blockchainService } = require('./services/blockchainService');

const app = express();
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const frontendDirectory = path.resolve(__dirname, '../../frontend/dist');
let browserRpcOrigin;
try { browserRpcOrigin = new URL(process.env.VITE_RPC_URL || process.env.RPC_URL).origin; } catch {}
app.use(helmet(serveFrontend ? {
  contentSecurityPolicy: { directives: { connectSrc: ["'self'", ...(browserRpcOrigin ? [browserRpcOrigin] : [])] } },
} : {}));
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',') } : {}));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.get('/health', (req, res) => {
  const ready = process.env.REQUIRE_BLOCKCHAIN_SYNC !== 'true' || blockchainService.initialized;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'unavailable', blockchainSync: blockchainService.initialized, timestamp: new Date().toISOString(),
  });
});
app.use('/api', routes);
if (serveFrontend) {
  app.use(express.static(frontendDirectory));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

async function startServer() {
  await sequelize.authenticate();
  // Models are a rebuildable cache, not authoritative ledger data.
  await sequelize.sync();
  try {
    if (await blockchainService.initialize()) {
      await blockchainService.syncAllProjects();
      await blockchainService.startEventListener();
      logger.info('Blockchain history synchronized; live listeners started');
    } else {
      logger.warn('No factory configured; cache API is available, sync endpoints return 503');
    }
  } catch (error) {
    logger.error(`Blockchain sync unavailable; serving cached API: ${error.message}`);
    await blockchainService.close();
  }
  const port = Number(process.env.PORT || 3000);
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  let server;
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    if (server) await new Promise(resolve => server.close(resolve));
    await blockchainService.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  startServer().then(value => { server = value; }).catch(async error => {
    logger.error(`Failed to start server: ${error.message}`);
    await blockchainService.close();
    await sequelize.close();
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
