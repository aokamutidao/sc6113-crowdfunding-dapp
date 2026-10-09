// Verify the already running API and chain. GET requests and chain reads only.
// No database model is imported and no sync/transaction RPC is submitted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ethers } = require('ethers');
const evidence = path.resolve(__dirname, '../../../submission/evidence');
const seed = JSON.parse(fs.readFileSync(path.join(evidence, 'deployment-and-transactions.json'), 'utf8'));
const ui = JSON.parse(fs.readFileSync(path.join(evidence, 'ui-tests.json'), 'utf8'));
const api = process.env.API_URL || 'http://127.0.0.1:13000';
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || seed.rpcUrl, undefined, { cacheTimeout: -1 });
const artifacts = path.resolve(__dirname, '../../artifacts/contracts');
const factoryAbi = require(path.join(artifacts, 'CrowdfundingFactory.sol/CrowdfundingFactory.json')).abi;
const projectAbi = require(path.join(artifacts, 'CrowdfundingProject.sol/CrowdfundingProject.json')).abi;
const factory = new ethers.Contract(seed.factoryAddress, factoryAbi, provider);
const statuses = ['active', 'successful', 'failed', 'fundsWithdrawn'];

async function get(route) {
  const response = await fetch(`${api}${route}`, { signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}

async function capture() {
  const projects = (await get('/api/projects')).data;
  const snapshot = [];
  for (const project of projects) {
    const transactions = (await get(`/api/projects/${project.address}/transactions`)).data;
    const contributions = (await get(`/api/projects/${project.address}/contributions`)).data;
    const updates = (await get(`/api/projects/${project.address}/updates`)).data;
    snapshot.push({ project, transactions, contributions, updates });
  }
  return snapshot;
}

function fingerprint(snapshot) {
  return snapshot.map(row => ({
    address: row.project.address,
    totalRaised: row.project.totalRaised,
    status: row.project.status,
    transactions: row.transactions.map(tx => tx.id).sort(),
    contributions: row.contributions.map(tx => `${tx.transactionHash}:${tx.amount}:${tx.refunded}`).sort(),
    updates: row.updates.map(tx => `${tx.transactionHash}:${tx.content}`).sort(),
  })).sort((a, b) => a.address.localeCompare(b.address));
}

async function main() {
  console.log(`Final read-only verification: ${new Date().toISOString()}`);
  console.log(`API=${api}; RPC=${process.env.RPC_URL || seed.rpcUrl}; factory=${seed.factoryAddress}`);
  const network = await provider.getNetwork();
  assert.equal(Number(network.chainId), 31337);
  const blockNumber = await provider.getBlockNumber();
  const addresses = await factory.getAllProjects({ blockTag: blockNumber });
  const before = await capture();
  assert.equal(addresses.length, 4);
  assert.deepEqual(before.map(row => row.project.address).sort(), [...addresses].sort());
  console.log(`PASS factory registry == SQLite-backed GET /api/projects: 4 projects at block ${blockNumber}`);
  let transactionCount = 0;
  for (const row of before) {
    const { project, transactions, contributions, updates } = row;
    const contract = new ethers.Contract(project.address, projectAbi, provider);
    const info = await contract.getProjectInfo({ blockTag: blockNumber });
    assert.equal(project.creator, info._creator);
    assert.equal(project.title, info._title);
    assert.equal(project.description, info._description);
    assert.equal(project.category, info._category);
    assert.equal(project.goalAmount, info._goalAmount.toString());
    assert.equal(project.deadline, Number(info._deadline));
    assert.equal(project.totalRaised, info._totalRaised.toString());
    assert.equal(project.status, statuses[Number(info._status)]);
    assert.equal(project.fundsWithdrawn, info._fundsWithdrawn);
    assert.equal(project.contributionCount, Number(info._contributionCount));
    const logs = [];
    for (const name of ['Contributed', 'FundsWithdrawn', 'Refunded', 'UpdatePosted']) {
      for (const log of await contract.queryFilter(contract.filters[name](), 0, blockNumber)) {
        logs.push({ log, name });
      }
    }
    assert.equal(transactions.length, logs.length);
    assert.equal(new Set(transactions.map(tx => tx.id)).size, transactions.length);
    for (const tx of transactions) {
      const canonical = logs.find(({ log, name }) => log.transactionHash === tx.transactionHash && log.index === tx.logIndex && name === tx.eventName);
      assert.ok(canonical, `No canonical event for ${tx.id}`);
      assert.equal(canonical.log.blockNumber, tx.blockNumber);
      assert.equal(tx.timestamp, Number(canonical.log.args[tx.eventName === 'UpdatePosted' ? 1 : 2]));
      if (tx.eventName === 'UpdatePosted') assert.equal(tx.content, canonical.log.args[0]);
      else assert.equal(tx.amount, canonical.log.args[1].toString());
      const receipt = await provider.getTransactionReceipt(tx.transactionHash);
      assert.equal(receipt.status, 1);
      assert.equal(receipt.blockNumber, tx.blockNumber);
      assert.ok(receipt.logs.some(log => log.index === tx.logIndex && log.address.toLowerCase() === project.address.toLowerCase()));
    }
    assert.equal(contributions.length, logs.filter(row => row.name === 'Contributed').length);
    assert.equal(updates.length, logs.filter(row => row.name === 'UpdatePosted').length);
    const chainContributions = await contract.getContributions({ blockTag: blockNumber });
    for (const contribution of contributions) {
      const cumulative = chainContributions.find(row => row.contributor === contribution.contributor);
      assert.ok(cumulative);
      assert.equal(contribution.refunded, cumulative.refunded);
    }
    assert.equal(contributions.reduce((sum, row) => sum + BigInt(row.amount), 0n).toString(), info._totalRaised.toString());
    const stats = (await get(`/api/projects/${project.address}/stats`)).data;
    assert.equal(stats.contributionCount, contributions.length);
    assert.equal(stats.totalContributors, new Set(contributions.map(row => row.contributor)).size);
    const balance = await provider.getBalance(project.address, blockNumber);
    console.log(`PASS ${project.title}: ${project.status}; historicalRaised=${project.totalRaised} wei; contractBalance=${balance} wei; ${transactions.length} canonical events`);
    for (const tx of transactions) {
      console.log(`  ${tx.eventName}: ${tx.transactionHash}; block=${tx.blockNumber}; logIndex=${tx.logIndex}; amount=${tx.amount}; receipt.status=1`);
    }
    if (project.address === seed.projects.successful.address) {
      assert.equal(project.status, 'fundsWithdrawn');
      assert.equal(balance, 0n);
      assert.ok(transactions.some(tx => tx.eventName === 'FundsWithdrawn'));
    }
    if (project.address === seed.projects.failed.address) {
      assert.equal(project.status, 'failed');
      assert.equal(balance, 0n);
      assert.ok(contributions.every(row => row.refunded));
      assert.ok(transactions.some(tx => tx.eventName === 'Refunded'));
    }
    transactionCount += transactions.length;
  }
  assert.equal(transactionCount, 7);
  for (const tx of ui.confirmedReceipts) {
    const receipt = await provider.getTransactionReceipt(tx.hash);
    assert.equal(receipt.status, 1);
    assert.equal(receipt.blockNumber, tx.blockNumber);
    assert.equal(Number(receipt.gasUsed), tx.gasUsed);
    console.log(`PASS UI ${tx.label}: receipt.status=1; ${tx.hash}; block=${receipt.blockNumber}; gas=${receipt.gasUsed}`);
  }
  console.log('Observing the running backend for 18 seconds to include an automatic cache refresh; no POST sync is sent.');
  await new Promise(resolve => setTimeout(resolve, 18000));
  const after = await capture();
  assert.deepEqual(fingerprint(after), fingerprint(before));
  assert.ok(after.some(row => {
    const prior = before.find(item => item.project.address === row.project.address);
    return new Date(row.project.lastUpdated) > new Date(prior.project.lastUpdated);
  }), 'No automatic cache refresh observed');
  console.log('PASS automatic refresh idempotence: project state, stable event IDs, hashes, 4 contribution rows, 1 update row and 7 history rows remained equal.');
  console.log('PASS final database/chain consistency; withdrawals and refunds carry real receipt-backed contract events.');
  console.log('No blockchain transaction, time travel, POST endpoint or database operation was performed by this verifier.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => provider.destroy());
