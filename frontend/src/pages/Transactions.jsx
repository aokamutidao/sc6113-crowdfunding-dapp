import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS } from '../config/contractConfig';

const Transactions = () => {
  const { account, chainId, transactions, isConnected } = useWallet();
  const history = transactions.filter((tx) => tx.account?.toLowerCase() === account?.toLowerCase() && tx.chainId === chainId);
  return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
    <h1 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>Transaction History</h1>
    <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Transactions submitted from this browser. Project pages also show on-chain event history.</p>
    {!isConnected ? <p>Please connect your wallet to view your submitted transactions.</p> : history.length === 0 ? <p>No transactions submitted from this browser for this account and network.</p> :
      <div style={{ display: 'grid', gap: '1rem' }}>{history.map((tx) => <article key={tx.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <strong>{tx.label}</strong>
          <span style={{ color: tx.status === 'confirmed' ? '#047857' : tx.status === 'failed' ? '#b91c1c' : '#92400e', textTransform: 'capitalize', fontWeight: 600 }}>{tx.status}</span>
        </div>
        <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>{new Date(tx.createdAt).toLocaleString()} · Chain {tx.chainId}{tx.blockNumber ? ` · Block ${tx.blockNumber}` : ''}</p>
        {tx.hash && <p style={{ overflowWrap: 'anywhere' }}>Transaction: {CONTRACTS.network.blockExplorer ? <a href={`${CONTRACTS.network.blockExplorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash}</a> : <code>{tx.hash}</code>}</p>}
        {tx.projectAddress && <p style={{ marginTop: '0.5rem' }}><Link to={`/project/${tx.projectAddress}`}>View project →</Link></p>}
        {tx.error && <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>{tx.error}</p>}
      </article>)}</div>}
  </div>;
};

export default Transactions;
