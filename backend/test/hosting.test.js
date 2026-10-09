process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.FACTORY_CONTRACT_ADDRESS = '';
process.env.SERVE_FRONTEND = 'true';
process.env.VITE_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const request = require('supertest');
const app = require('../src/server');
const { sequelize } = require('../src/models');
afterAll(() => sequelize.close());

test('SPA deep links load HTML and allow the configured blockchain RPC', async () => {
  const response = await request(app).get('/projects/0x0000000000000000000000000000000000000001');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/text\/html/);
  expect(response.text).toContain('<div id="root">');
  expect(response.headers['content-security-policy']).toContain("connect-src 'self' https://ethereum-sepolia-rpc.publicnode.com");
});
test('unknown API paths keep JSON 404 responses with SPA hosting enabled', async () => {
  const response = await request(app).get('/api/missing');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, error: 'Route not found' });
});
test('production readiness refuses an unsynchronized blockchain service', async () => {
  process.env.REQUIRE_BLOCKCHAIN_SYNC = 'true';
  const response = await request(app).get('/health');
  delete process.env.REQUIRE_BLOCKCHAIN_SYNC;
  expect(response.status).toBe(503);
  expect(response.body.status).toBe('unavailable');
});
