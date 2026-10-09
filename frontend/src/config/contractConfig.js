// 合约配置
// 部署后需要更新这些地址

export const CONTRACTS = {
  // Sepolia测试网部署地址（示例）
  factory: import.meta.env.VITE_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',

  // 区块链网络配置
  network: {
    chainId: import.meta.env.VITE_CHAIN_ID || '0x7a69',
    name: import.meta.env.VITE_NETWORK_NAME || 'Hardhat Local',
    rpcUrl: import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545',
    blockExplorer: import.meta.env.VITE_BLOCK_EXPLORER || null,
  },

  // Sepolia测试网配置（部署后使用）
  // network: {
  //   chainId: '0xaa36a7', // 11155111
  //   name: 'Sepolia Testnet',
  //   rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  //   blockExplorer: 'https://sepolia.etherscan.io',
  // },
};

// 项目分类
export const CATEGORIES = [
  'Technology',
  'Education',
  'Charity',
  'Art',
  'Environment',
  'Health',
  'Business',
  'Other',
];

// 项目状态映射
export const PROJECT_STATUS = {
  0: 'Active',
  1: 'Successful',
  2: 'Failed',
  3: 'FundsWithdrawn',
};

// 项目状态颜色
export const STATUS_COLORS = {
  Active: '#3b82f6',      // blue
  Successful: '#10b981',  // green
  Failed: '#ef4444',      // red
  FundsWithdrawn: '#6b7280', // gray
};

// API配置
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
};
