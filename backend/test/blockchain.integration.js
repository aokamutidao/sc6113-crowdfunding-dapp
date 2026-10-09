// Read-only integration against an already deployed local/testnet factory.
// The script creates only an in-memory API cache, and sends no blockchain transaction.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
require('dotenv').config();
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/server');
const { sequelize, Project, Contribution, ProjectUpdate, Transaction } = require('../src/models');
const { blockchainService } = require('../src/services/blockchainService');

async function main() {
  await sequelize.sync({ force: true });
  await blockchainService.ensureReady();
  console.log(`Integration started: ${new Date().toISOString()}`);
  console.log(`RPC: ${process.env.RPC_URL || process.env.SEPOLIA_RPC_URL}`);
  console.log(`Factory: ${process.env.FACTORY_CONTRACT_ADDRESS}`);
  const network = await blockchainService.provider.getNetwork();
  console.log(`Chain ID: ${network.chainId}`);
  const response = await request(app).post('/api/sync/all');
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const rows = await Project.findAll();
  assert.ok(rows.length > 0, 'Deployed factory must contain projects for an evidence test');
  console.log(`PASS full sync: ${rows.length} on-chain projects, snapshot block ${response.body.data.blockNumber}`);
  const before = { contributions: await Contribution.count(), updates: await ProjectUpdate.count(), transactions: await Transaction.count() };
  for (const project of rows) {
    const info = await blockchainService.getProjectFromBlockchain(project.address);
    assert.equal(project.totalRaised, info.totalRaised);
    const details = await request(app).get(`/api/projects/${project.address.toLowerCase()}`);
    assert.equal(details.status, 200);
    const history = await request(app).get(`/api/projects/${project.address}/transactions`);
    assert.equal(history.status, 200);
    const contract = blockchainService.getProjectContract(project.address);
    let expected = 0;
    for (const name of ['Contributed', 'FundsWithdrawn', 'Refunded', 'UpdatePosted']) {
      expected += (await contract.queryFilter(contract.filters[name]())).length;
    }
    assert.equal(history.body.count, expected);
    for (const entry of history.body.data) {
      const receipt = await blockchainService.provider.getTransactionReceipt(entry.transactionHash);
      assert.equal(receipt.status, 1);
      assert.equal(receipt.blockNumber, entry.blockNumber);
      assert.ok(receipt.logs.some(log => log.index === entry.logIndex && log.address.toLowerCase() === project.address.toLowerCase()));
    }
    console.log(`PASS ${project.title}: ${project.status}, raised=${project.totalRaised} wei, ${expected} verified contract events`);
    console.log(`  Event hashes: ${history.body.data.map(row => `${row.eventName}=${row.transactionHash}`).join(', ')}`);
    const synced = await request(app).post(`/api/projects/${project.address}/sync`);
    assert.equal(synced.status, 200);
    const stats = await request(app).get(`/api/projects/${project.address}/stats`);
    assert.equal(stats.status, 200);
    const contributions = await Contribution.findAll({ where: { projectAddress: project.address } });
    assert.equal(stats.body.data.totalContributors, new Set(contributions.map(row => row.contributor)).size);
    const sum = contributions.reduce((value, row) => value + BigInt(row.amount), 0n);
    assert.equal(sum.toString(), project.totalRaised);
    const creator = await request(app).get(`/api/creators/${project.creator.toLowerCase()}/projects`);
    assert.equal(creator.status, 200);
    for (const contribution of contributions) {
      const personal = await request(app).get(`/api/contributors/${contribution.contributor.toLowerCase()}/contributions`);
      assert.equal(personal.status, 200);
      assert.ok(personal.body.data.some(row => row.project.address === project.address));
    }
  }
  const repeated = await request(app).post('/api/sync/all');
  assert.equal(repeated.status, 200);
  assert.deepEqual({ contributions: await Contribution.count(), updates: await ProjectUpdate.count(), transactions: await Transaction.count() }, before);
  console.log(`PASS repeated full/single sync is idempotent: ${JSON.stringify(before)}`);
  const invalid = await request(app).get('/api/projects?sortBy=unknown');
  assert.equal(invalid.status, 400);
  const unregistered = await request(app).post('/api/projects/0x0000000000000000000000000000000000000001/sync');
  assert.equal(unregistered.status, 404);
  console.log('PASS parameter validation, normalized addresses, and factory registration check');
  console.log('All real-chain API integration assertions passed. No blockchain writes were performed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await blockchainService.close();
  await sequelize.close();
});
