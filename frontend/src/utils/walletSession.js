import { ethers } from 'ethers';

// Reading the selected chain must not depend on that chain's RPC being reachable.
export async function readWalletSession(wallet, accounts, expectedChainId) {
  if (!accounts.length) return null;
  const account = ethers.getAddress(accounts[0]);
  const chainId = BigInt(await wallet.request({ method: 'eth_chainId' })).toString();
  const provider = new ethers.BrowserProvider(wallet);
  const session = { account, chainId, provider, signer: null, balance: null, balanceError: null };
  if (BigInt(chainId) !== BigInt(expectedChainId)) return session;
  session.signer = await provider.getSigner(account);
  try {
    session.balance = ethers.formatEther(await provider.getBalance(account));
  } catch {
    session.balanceError = 'Wallet connected, but its RPC could not read the balance. Reconnect or check the selected network RPC.';
  }
  return session;
}
