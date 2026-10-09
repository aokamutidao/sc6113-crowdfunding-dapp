import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contractConfig';
import FactoryABI from '../config/CrowdfundingFactory.json';
import ProjectABI from '../config/CrowdfundingProject.json';
import { readableError } from '../utils/blockchain';
import { readWalletSession } from '../utils/walletSession';

const WalletContext = createContext();
const HISTORY_KEY = 'crowdfunding.transactions.v1';

// The shared wallet hook intentionally lives beside its provider.
// oxlint-disable-next-line react/only-export-components
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const connectedRef = useRef(false);
  const sessionGeneration = useRef(0);
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(saved) ? saved.slice(0, 100) : [];
    } catch { return []; }
  });
  const readProvider = useMemo(() => new ethers.JsonRpcProvider(CONTRACTS.network.rpcUrl), []);
  const readFactoryContract = useMemo(() => new ethers.Contract(CONTRACTS.factory, FactoryABI.abi, readProvider), [readProvider]);
  const isCorrectNetwork = chainId !== null && BigInt(chainId) === BigInt(CONTRACTS.network.chainId);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(transactions)); }
    catch { /* Submission must still work when browser storage is full. */ }
  }, [transactions]);

  const disconnectWallet = useCallback(() => {
    sessionGeneration.current++;
    connectedRef.current = false;
    setAccount(null);
    setBalance('0');
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setFactoryContract(null);
    setError(null);
  }, []);

  // Account changes must refresh the signer as well as the displayed address.
  const initializeWallet = useCallback(async (accounts) => {
    if (!accounts.length) { disconnectWallet(); return; }
    const generation = ++sessionGeneration.current;
    const session = await readWalletSession(window.ethereum, accounts, CONTRACTS.network.chainId);
    if (generation !== sessionGeneration.current) return;
    connectedRef.current = true;
    setAccount(session.account);
    setBalance(session.balance);
    setChainId(session.chainId);
    setProvider(session.provider);
    setSigner(session.signer);
    setFactoryContract(session.signer ? new ethers.Contract(CONTRACTS.factory, FactoryABI.abi, session.signer) : null);
    setError(session.balanceError);
  }, [disconnectWallet]);

  const connectWallet = async () => {
    if (!window.ethereum) { setError('Please install MetaMask or another compatible Ethereum wallet.'); return; }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) throw new Error('No wallet accounts are available.');
      await initializeWallet(accounts);
    } catch (err) { setError(readableError(err)); }
    finally { setIsConnecting(false); }
  };

  const switchNetwork = async () => {
    try {
      const chainIdHex = `0x${BigInt(CONTRACTS.network.chainId).toString(16)}`;
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
      } catch (err) {
        if (err.code !== 4902) throw err;
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
          chainId: chainIdHex, chainName: CONTRACTS.network.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [CONTRACTS.network.rpcUrl],
          ...(CONTRACTS.network.blockExplorer ? { blockExplorerUrls: [CONTRACTS.network.blockExplorer] } : {}),
        }] });
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
      }
      await initializeWallet(await window.ethereum.request({ method: 'eth_accounts' }));
    } catch (err) { setError(readableError(err)); }
  };

  const getReadProjectContract = useCallback((address) => {
    if (!ethers.isAddress(address)) throw new Error('Invalid project contract address.');
    return new ethers.Contract(address, ProjectABI.abi, readProvider);
  }, [readProvider]);

  const getProjectContract = async (address) => {
    if (!account) throw new Error('Please connect your wallet first.');
    if (!isCorrectNetwork) throw new Error(`Switch your wallet to ${CONTRACTS.network.name} before sending a transaction.`);
    if (!signer) throw new Error('Reconnect your wallet to authorize transactions.');
    if (!ethers.isAddress(address)) throw new Error('Invalid project contract address.');
    return new ethers.Contract(address, ProjectABI.abi, signer);
  };

  const executeTransaction = async (label, send, projectAddress = null) => {
    if (!account) throw new Error('Please connect your wallet first.');
    if (!isCorrectNetwork) throw new Error(`Switch your wallet to ${CONTRACTS.network.name} before sending a transaction.`);
    if (!signer) throw new Error('Reconnect your wallet to authorize transactions.');
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = { id, label, account, chainId, projectAddress, createdAt: Date.now(), status: 'awaiting signature' };
    setTransactions((previous) => [record, ...previous].slice(0, 100));
    const update = (data) => setTransactions((previous) => previous.map((item) => item.id === id ? { ...item, ...data } : item));
    try {
      const tx = await send();
      update({ hash: tx.hash, status: 'pending' });
      let receipt;
      try { receipt = await tx.wait(); }
      catch (err) {
        if (err.code === 'TRANSACTION_REPLACED' && !err.cancelled && err.receipt) receipt = err.receipt;
        else throw err;
      }
      if (!receipt || receipt.status !== 1) throw new Error('Transaction was reverted by the smart contract.');
      update({ hash: receipt.hash, status: 'confirmed', blockNumber: receipt.blockNumber, confirmedAt: Date.now() });
      try { setBalance(ethers.formatEther(await provider.getBalance(account))); } catch { /* Receipt remains confirmed. */ }
      return receipt;
    } catch (err) {
      update({ status: 'failed', error: readableError(err) });
      throw err;
    }
  };

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet) return;
    let active = true;
    const refresh = async (accounts) => {
      try { if (active) await initializeWallet(accounts); }
      catch (err) { if (active) { disconnectWallet(); setError(readableError(err)); } }
    };
    const onAccountsChanged = (accounts) => { if (connectedRef.current) refresh(accounts); };
    const onChainChanged = async () => {
      if (connectedRef.current) refresh(await wallet.request({ method: 'eth_accounts' }));
    };
    wallet.on?.('accountsChanged', onAccountsChanged);
    wallet.on?.('chainChanged', onChainChanged);
    wallet.request({ method: 'eth_accounts' }).then((accounts) => { if (accounts.length) refresh(accounts); }).catch(() => {});
    return () => {
      active = false;
      wallet.removeListener?.('accountsChanged', onAccountsChanged);
      wallet.removeListener?.('chainChanged', onChainChanged);
    };
  }, [initializeWallet, disconnectWallet]);

  return <WalletContext.Provider value={{
    account, balance, chainId, provider, signer, factoryContract, readFactoryContract,
    isConnecting, error, connectWallet, disconnectWallet, switchNetwork, isCorrectNetwork,
    getProjectContract, getReadProjectContract, executeTransaction, transactions,
    clearWalletError: () => setError(null), isConnected: !!account,
  }}>{children}</WalletContext.Provider>;
};
