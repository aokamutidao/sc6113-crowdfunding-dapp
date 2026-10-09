import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

const TransactionNotice = () => {
  const { transactions, account, chainId } = useWallet();
  const tx = transactions.find((item) => item.account?.toLowerCase() === account?.toLowerCase() && item.chainId === chainId);
  if (!tx) return null;
  const color = tx.status === 'confirmed' ? '#047857' : tx.status === 'failed' ? '#b91c1c' : '#92400e';
  return <aside role="status" aria-live="polite" style={{ padding: '0.8rem 2rem', background: tx.status === 'failed' ? '#fee2e2' : '#ecfdf5', color }}>
    <strong>{tx.label}: {tx.status}</strong>{tx.blockNumber ? ` · Block ${tx.blockNumber}` : ''}
    <Link to="/transactions" style={{ marginLeft: '1rem', color }}>View transaction history →</Link>
    {tx.hash && <div style={{ fontSize: '0.8rem', overflowWrap: 'anywhere', marginTop: '0.3rem' }}>Transaction hash: {tx.hash}</div>}
    {tx.error && <p style={{ marginTop: '0.3rem' }}>{tx.error}</p>}
  </aside>;
};

export default TransactionNotice;
