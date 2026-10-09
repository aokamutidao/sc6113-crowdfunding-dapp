const { spawnSync } = require('node:child_process');
const path = require('node:path');

const factory = process.env.FACTORY_CONTRACT_ADDRESS;
const rpc = process.env.RPC_URL;
if (!/^0x[0-9a-fA-F]{40}$/.test(factory || '') || /^0x0{40}$/i.test(factory)) {
  throw new Error('Set FACTORY_CONTRACT_ADDRESS to your deployed Sepolia factory address.');
}
if (!rpc || new URL(rpc).protocol !== 'https:') {
  throw new Error('Set RPC_URL to a public HTTPS Sepolia RPC endpoint.');
}
const root = path.resolve(__dirname, '..');
function run(args, directory = root, extraEnv = {}) {
  const result = spawnSync('npm', args, {
    cwd: directory, stdio: 'inherit', env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(['run', 'compile']);
run(['ci', '--omit=dev'], path.join(root, 'backend'));
run(['ci', '--include=dev'], path.join(root, 'frontend'));
run(['run', 'build'], path.join(root, 'frontend'), {
  VITE_FACTORY_ADDRESS: factory,
  VITE_RPC_URL: rpc,
  VITE_CHAIN_ID: '0xaa36a7',
  VITE_NETWORK_NAME: 'Sepolia Testnet',
  VITE_API_URL: '/api',
  VITE_BLOCK_EXPLORER: 'https://sepolia.etherscan.io',
});
