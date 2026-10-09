const path = require('path');
const { ethers } = require('ethers');
const { logger } = require('../utils/logger');
const { sequelize, Project, Contribution, ProjectUpdate, Transaction } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const artifactRoot = path.resolve(__dirname, '../../../artifacts/contracts');
const factoryAbi = require(path.join(artifactRoot, 'CrowdfundingFactory.sol/CrowdfundingFactory.json')).abi;
const projectAbi = require(path.join(artifactRoot, 'CrowdfundingProject.sol/CrowdfundingProject.json')).abi;

class BlockchainService {
  constructor() {
    this.provider = null;
    this.factoryContract = null;
    this.initialized = false;
    this.projectContracts = new Map();
    this.pendingSyncs = new Map();
    this.factoryListening = false;
    this.pollTimer = null;
    this.fullSync = null;
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    if (this.initialized) return true;
    const factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS;
    if (!factoryAddress) return false;
    if (!ethers.isAddress(factoryAddress)) throw new AppError('Invalid factory contract configuration', 503);
    if (!this.provider) {
      const request = new ethers.FetchRequest(process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545');
      request.timeout = 5000;
      this.provider = new ethers.JsonRpcProvider(request, undefined, { pollingInterval: 2000, cacheTimeout: -1 });
    }
    const code = await this.provider.getCode(factoryAddress);
    if (code === '0x') throw new AppError('Factory contract is not deployed on the configured network', 503);
    this.factoryContract = new ethers.Contract(ethers.getAddress(factoryAddress), factoryAbi, this.provider);
    await this.factoryContract.getAllProjects();
    this.initialized = true;
    return true;
  }

  async ensureReady() {
    if (!await this.initialize()) throw new AppError('Blockchain synchronization is not configured', 503);
  }

  getProjectContract(address) {
    return new ethers.Contract(ethers.getAddress(address), projectAbi, this.provider);
  }

  async getProjectFromBlockchain(address, blockTag = 'latest') {
    const info = await this.getProjectContract(address).getProjectInfo({ blockTag });
    return {
      address: ethers.getAddress(address), creator: ethers.getAddress(info._creator),
      title: info._title, description: info._description, category: info._category,
      goalAmount: info._goalAmount.toString(), deadline: Number(info._deadline),
      totalRaised: info._totalRaised.toString(), status: this.mapStatus(info._status),
      fundsWithdrawn: info._fundsWithdrawn, contributionCount: Number(info._contributionCount),
      lastUpdated: new Date(),
    };
  }

  mapStatus(status) {
    return ['active', 'successful', 'failed', 'fundsWithdrawn'][Number(status)] || 'active';
  }

  async queryHistory(contract, eventName, blockNumber) {
    const start = Number(process.env.FACTORY_DEPLOYMENT_BLOCK || 0);
    if (!Number.isSafeInteger(start) || start < 0 || start > blockNumber) {
      throw new AppError('Invalid FACTORY_DEPLOYMENT_BLOCK configuration', 503);
    }
    const logs = [];
    // Bound RPC log ranges. Public testnets should set the actual factory deployment block.
    for (let from = start; from <= blockNumber; from += 10000) {
      logs.push(...await contract.queryFilter(contract.filters[eventName](), from, Math.min(from + 9999, blockNumber)));
    }
    return logs;
  }

  syncProject(address, snapshotBlock) {
    const normalized = ethers.getAddress(address);
    const existing = this.pendingSyncs.get(normalized);
    if (existing) return existing;
    const promise = this.syncProjectSnapshot(normalized, snapshotBlock).finally(() => this.pendingSyncs.delete(normalized));
    this.pendingSyncs.set(normalized, promise);
    return promise;
  }

  async syncProjectSnapshot(address, snapshotBlock) {
    await this.ensureReady();
    const blockNumber = snapshotBlock ?? await this.provider.getBlockNumber();
    const registered = await this.factoryContract.getAllProjects({ blockTag: blockNumber });
    if (!registered.some(value => value.toLowerCase() === address.toLowerCase())) {
      throw new AppError('Project is not registered in the configured factory', 404);
    }
    const contract = this.getProjectContract(address);
    const projectData = await this.getProjectFromBlockchain(address, blockNumber);
    const records = await contract.getContributions({ blockTag: blockNumber });
    const refunded = new Set(records.filter(row => row.refunded).map(row => row.contributor.toLowerCase()));
    const transactions = [];
    for (const eventName of ['Contributed', 'FundsWithdrawn', 'Refunded', 'UpdatePosted']) {
      for (const log of await this.queryHistory(contract, eventName, blockNumber)) {
        const isUpdate = eventName === 'UpdatePosted';
        transactions.push({
          id: `${address}:${log.transactionHash}:${log.index}`,
          projectAddress: address, transactionHash: log.transactionHash,
          blockNumber: log.blockNumber, logIndex: log.index, eventName,
          actor: isUpdate ? projectData.creator : ethers.getAddress(log.args[0]),
          amount: isUpdate ? null : log.args[1].toString(),
          content: isUpdate ? log.args[0] : null,
          timestamp: Number(log.args[isUpdate ? 1 : 2]), status: 'confirmed',
        });
      }
    }
    const contributions = transactions.filter(row => row.eventName === 'Contributed').map(row => ({
      projectAddress: address, contributor: row.actor, amount: row.amount, timestamp: row.timestamp,
      refunded: refunded.has(row.actor.toLowerCase()), transactionHash: row.transactionHash,
    }));
    const updates = transactions.filter(row => row.eventName === 'UpdatePosted').map(row => ({
      projectAddress: address, content: row.content, timestamp: row.timestamp, transactionHash: row.transactionHash,
    }));
    // Atomic replacement removes stale/duplicate cached records after restarts and repeated syncs.
    // Contribution/update IDs are cache IDs; event identity is transactionHash + logIndex.
    const write = this.writeQueue.then(() => sequelize.transaction(async transaction => {
      await Project.upsert(projectData, { transaction });
      await Contribution.destroy({ where: { projectAddress: address }, transaction });
      await ProjectUpdate.destroy({ where: { projectAddress: address }, transaction });
      await Transaction.destroy({ where: { projectAddress: address }, transaction });
      if (contributions.length) await Contribution.bulkCreate(contributions, { transaction });
      if (updates.length) await ProjectUpdate.bulkCreate(updates, { transaction });
      if (transactions.length) await Transaction.bulkCreate(transactions, { transaction });
    }));
    this.writeQueue = write.catch(() => {});
    await write;
    if (this.factoryListening) await this.listenToProjectSpecificEvents(address);
    return { address, blockNumber, transactions: transactions.length };
  }

  async syncAllProjects() {
    if (this.fullSync) return this.fullSync;
    this.fullSync = (async () => {
      await this.ensureReady();
      const blockNumber = await this.provider.getBlockNumber();
      const addresses = await this.factoryContract.getAllProjects({ blockTag: blockNumber });
      for (const address of addresses) await this.syncProject(address, blockNumber);
      // A local chain reset invalidates old cache entries; the current factory registry is canonical.
      const latestAddresses = await this.factoryContract.getAllProjects();
      const current = new Set(latestAddresses.map(address => ethers.getAddress(address)));
      const cached = await Project.findAll({ attributes: ['address'] });
      for (const row of cached) {
        if (!current.has(row.address)) await Project.destroy({ where: { address: row.address } });
      }
      return { blockNumber, projects: addresses.length };
    })();
    try { return await this.fullSync; } finally { this.fullSync = null; }
  }

  async startEventListener() {
    await this.ensureReady();
    if (this.factoryListening) return;
    this.factoryListening = true;
    await this.factoryContract.on('ProjectCreated', address => {
      this.syncProject(address).catch(error => logger.error(`Project event sync failed: ${error.message}`));
    });
    for (const project of await Project.findAll()) await this.listenToProjectSpecificEvents(project.address);
    // Recover missed events and time-based status changes even when no new transaction occurs.
    this.pollTimer = setInterval(() => {
      this.syncAllProjects().catch(error => logger.error(`Periodic blockchain sync failed: ${error.message}`));
    }, 15000);
    this.pollTimer.unref();
  }

  async listenToProjectSpecificEvents(address) {
    if (this.projectContracts.has(address)) return;
    const contract = this.getProjectContract(address);
    this.projectContracts.set(address, contract);
    for (const name of ['Contributed', 'FundsWithdrawn', 'Refunded', 'UpdatePosted']) {
      await contract.on(name, () => {
        this.syncProject(address).catch(error => logger.error(`Project history sync failed: ${error.message}`));
      });
    }
  }

  async close() {
    clearInterval(this.pollTimer);
    if (this.factoryContract) await this.factoryContract.removeAllListeners();
    for (const contract of this.projectContracts.values()) await contract.removeAllListeners();
    this.projectContracts.clear();
    await Promise.allSettled([...this.pendingSyncs.values()]);
    if (this.fullSync) await this.fullSync.catch(() => {});
    await this.writeQueue;
    if (this.provider) this.provider.destroy();
    this.provider = null;
    this.initialized = false;
    this.factoryListening = false;
  }
}

const blockchainService = new BlockchainService();
module.exports = { BlockchainService, blockchainService };
