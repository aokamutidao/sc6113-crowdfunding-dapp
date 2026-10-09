process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.FACTORY_CONTRACT_ADDRESS = '';
const request = require('supertest');
const app = require('../src/server');
const { sequelize, Project, Contribution } = require('../src/models');
const address = '0x0000000000000000000000000000000000000001';
const creator = '0x0000000000000000000000000000000000000002';

beforeAll(async () => {
  await sequelize.sync({ force: true });
  // Database fixtures for API calculation tests; these do not represent blockchain evidence.
  await Project.create({ address, creator, title: 'API fixture', description: 'Database test fixture', category: 'Technology', goalAmount: '1000000000000000000000000000', totalRaised: '1500000000000000000000000000', deadline: 2000000000, contributionCount: 1 });
  await Contribution.bulkCreate([
    { projectAddress: address, contributor: creator, amount: '1000000000000000000000000000', timestamp: 10 },
    { projectAddress: address, contributor: creator, amount: '500000000000000000000000000', timestamp: 11 },
  ]);
});
afterAll(() => sequelize.close());

test('health and valid project query return JSON', async () => {
  expect((await request(app).get('/health')).body.status).toBe('ok');
  const response = await request(app).get('/api/projects?status=active&sortBy=deadline&order=ASC');
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(1);
});

test.each([
  '/api/projects/not-an-address', '/api/projects?sortBy=missingColumn',
  '/api/projects?order=DROP%20TABLE', '/api/projects?status=unknown',
  '/api/projects?category[]=Technology', '/api/creators/invalid/projects',
  '/api/contributors/invalid/contributions',
])('rejects invalid request parameters: %s', async url => {
  const response = await request(app).get(url);
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

test('unknown valid project returns 404', async () => {
  const response = await request(app).get('/api/projects/0x0000000000000000000000000000000000000003');
  expect(response.status).toBe(404);
});

test('contributor history includes the correct project association', async () => {
  const response = await request(app).get(`/api/contributors/${creator}/contributions`);
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(2);
  expect(response.body.data[0].project.address).toBe(address);
});

test('large wei values are exact and contributors are distinct', async () => {
  const response = await request(app).get(`/api/projects/${address}/stats`);
  expect(response.body.data).toMatchObject({ progress: '150.00', totalContributors: 1, contributionCount: 2, averageContribution: '750000000000000000000000000' });
});

test('history endpoint returns an empty verified cache without fake hashes', async () => {
  const response = await request(app).get(`/api/projects/${address}/transactions`);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('unconfigured sync returns a clear 503', async () => {
  const response = await request(app).post('/api/sync/all');
  expect(response.status).toBe(503);
  expect(response.body.error).toMatch(/not configured/);
});

test('malformed JSON returns a clear 400', async () => {
  const response = await request(app).post('/api/sync/all').set('Content-Type', 'application/json').send('{bad');
  expect(response.status).toBe(400);
  expect(response.body.error).toBe('Invalid JSON body');
});

test('unknown routes return consistent JSON errors', async () => {
  const response = await request(app).get('/api/missing');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, error: 'Route not found' });
});
