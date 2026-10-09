// Reproducible local evidence. Run ONLY against a fresh, isolated Hardhat node.
// This uses its unlocked test accounts; it never reads a private key.
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const output = path.resolve(__dirname, '../../submission/evidence');
const rpcUrl = process.env.EVIDENCE_RPC_URL || 'http://127.0.0.1:18545';
const factoryArtifact = require('../artifacts/contracts/CrowdfundingFactory.sol/CrowdfundingFactory.json');
const projectArtifact = require('../artifacts/contracts/CrowdfundingProject.sol/CrowdfundingProject.json');

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
  if ((await provider.getNetwork()).chainId !== 31337n) throw new Error('Evidence must run on Hardhat chain 31337');
  if (await provider.getBlockNumber() !== 0) throw new Error('Use a fresh isolated node, not an existing project chain');
  const creator = await provider.getSigner(0);
  const contributor = await provider.getSigner(1);
  const evidence = { network: 'Hardhat Local', chainId: 31337, rpcUrl, date: '2026-10-09',
    walletMethod: 'Unlocked local accounts; UI EIP-1193 bridge, not a MetaMask extension',
    creator: await creator.getAddress(), contributor: await contributor.getAddress(), transactions: [], projects: {} };
  async function record(action, tx) {
    const start = performance.now();
    const receipt = await tx.wait();
    evidence.transactions.push({ action, hash: receipt.hash, block: receipt.blockNumber,
      status: receipt.status, gasUsed: receipt.gasUsed.toString(), receiptWaitMs: Math.round(performance.now() - start) });
    console.log(`${action}: ${receipt.hash} gas=${receipt.gasUsed}`);
    return receipt;
  }
  const factory = await new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, creator).deploy();
  await record('deployFactory', factory.deploymentTransaction());
  evidence.factoryAddress = await factory.getAddress();
  const now = (await provider.getBlock('latest')).timestamp;
  const definitions = [
    ['active', 'Community Solar Learning Lab', 'Build a student solar learning kit with open educational resources and transparent community funding.', 'Environment', '2', now + 14 * 86400],
    ['successful', 'Open Campus Digital Library', 'Fund a student led digital library with accessible course materials and a verifiable funding target.', 'Education', '1', now + 120],
    ['failed', 'Community Health Equipment Fund', 'Raise support for a community health equipment pilot with refunds if its funding target is not reached.', 'Health', '2', now + 120],
  ];
  for (const [key, title, description, category, goal, deadline] of definitions) {
    const receipt = await record(`create:${key}`, await factory.createProject(title, description, category, ethers.parseEther(goal), deadline));
    const event = receipt.logs.map(log => { try { return factory.interface.parseLog(log); } catch { return null; } }).find(log => log?.name === 'ProjectCreated');
    evidence.projects[key] = { address: event.args.projectAddress, title, goalEth: goal, deadline };
  }
  for (const [key, amount] of [['active', '0.15'], ['successful', '1.2'], ['failed', '0.2']]) {
    const project = new ethers.Contract(evidence.projects[key].address, projectArtifact.abi, contributor);
    await record(`contribute:${key}`, await project.contribute({ value: ethers.parseEther(amount) }));
  }
  const active = new ethers.Contract(evidence.projects.active.address, projectArtifact.abi, creator);
  await record('postUpdate:active', await active.postUpdate('Initial design published. Contributions remain escrowed until the deadline.'));
  await provider.send('evm_increaseTime', [180]);
  await provider.send('evm_mine', []);
  evidence.timeControl = 'Advanced the isolated local chain by 180 seconds to exercise expiry; not public-chain timing';
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'deployment-and-transactions.json'), JSON.stringify(evidence, null, 2));
  console.log('Saved deployment-and-transactions.json');
  await provider.destroy();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
