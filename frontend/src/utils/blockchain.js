import { ethers } from 'ethers';
import axios from 'axios';
import { API_CONFIG } from '../config/contractConfig';

const statusCodes = { active: 0, successful: 1, failed: 2, fundsWithdrawn: 3 };

export const normalizeProject = (project) => ({
  ...project,
  status: statusCodes[project.status] ?? Number(project.status),
});

export const projectFromChain = (address, info) => normalizeProject({
  address,
  creator: info._creator,
  title: info._title,
  description: info._description,
  category: info._category,
  goalAmount: info._goalAmount.toString(),
  deadline: info._deadline.toString(),
  totalRaised: info._totalRaised.toString(),
  status: Number(info._status),
  fundsWithdrawn: info._fundsWithdrawn,
});

export const readableError = (error) => {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || error?.info?.error?.code === 4001) {
    return 'Transaction or wallet request rejected. No funds were sent.';
  }
  if (error?.code === 'INSUFFICIENT_FUNDS') return 'Insufficient ETH for the amount and transaction gas.';
  return error?.reason || error?.shortMessage || error?.message || 'Request failed. Please try again.';
};

export const parsePositiveEther = (value) => {
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(value)) {
    throw new Error('Enter a positive ETH amount with at most 18 decimal places.');
  }
  const amount = ethers.parseEther(value);
  if (amount <= 0n) throw new Error('Amount must be greater than 0 ETH.');
  return amount;
};

// API synchronization only refreshes the cache; a mined transaction remains
// successful when this optional service is unavailable.
export const syncBackend = async (projectAddress) => {
  try {
    await axios.post(`${API_CONFIG.baseUrl}/projects/${projectAddress}/sync`, {}, { timeout: API_CONFIG.timeout });
  } catch (error) {
    console.warn('API cache refresh unavailable:', readableError(error));
  }
};
