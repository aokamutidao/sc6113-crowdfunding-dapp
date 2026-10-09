import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS } from '../config/contractConfig';

const Navbar = () => {
  const { account, balance, chainId, isConnected, connectWallet, disconnectWallet, isConnecting,
    isCorrectNetwork, switchNetwork, error, clearWalletError } = useWallet();

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <><nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          🚀 Crowdfunding DApp
        </Link>

        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>Home</Link>
          <Link to="/create" style={styles.link}>Create Project</Link>
          {isConnected && (
            <Link to="/my-projects" style={styles.link}>My Projects</Link>
          )}
          {isConnected && <Link to="/transactions" style={styles.link}>Transactions</Link>}
        </div>

        <div style={styles.walletSection}>
          {isConnected ? (
            <div style={styles.walletInfo}>
              <div style={styles.balance}>
                💰 {parseFloat(balance).toFixed(4)} ETH
              </div>
              <div style={styles.account}>
                📍 {formatAddress(account)}
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{isCorrectNetwork ? CONTRACTS.network.name : `Chain ${chainId}`}</div>
              </div>
              <button onClick={disconnectWallet} style={styles.disconnectBtn}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={styles.connectBtn}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
    {error && <div role="alert" style={styles.errorBanner}>{error} <button onClick={clearWalletError} style={styles.dismissBtn}>Dismiss</button></div>}
    {isConnected && !isCorrectNetwork && <div role="alert" style={styles.networkBanner}>
      Switch to {CONTRACTS.network.name} (chain {BigInt(CONTRACTS.network.chainId).toString()}) to send transactions.
      <button onClick={switchNetwork} style={styles.connectBtn}>Switch Network</button>
    </div>}</>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#1f2937',
    padding: '1rem 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  link: {
    color: '#d1d5db',
    textDecoration: 'none',
    fontSize: '1rem',
    transition: 'color 0.2s',
  },
  walletSection: {
    display: 'flex',
    alignItems: 'center',
  },
  walletInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '1rem',
    color: '#ffffff',
  },
  balance: {
    fontSize: '0.9rem',
    color: '#10b981',
  },
  account: {
    fontSize: '0.9rem',
    color: '#9ca3af',
  },
  connectBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.2s',
  },
  disconnectBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  errorBanner: { padding: '1rem 2rem', backgroundColor: '#fee2e2', color: '#991b1b' },
  networkBanner: { padding: '1rem 2rem', backgroundColor: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  dismissBtn: { marginLeft: '1rem', border: 'none', background: 'transparent', color: '#991b1b', textDecoration: 'underline', cursor: 'pointer' },
};

export default Navbar;
