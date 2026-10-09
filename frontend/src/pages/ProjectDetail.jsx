import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import axios from 'axios';
import { API_CONFIG, PROJECT_STATUS, STATUS_COLORS } from '../config/contractConfig';
import { normalizeProject, projectFromChain, parsePositiveEther, readableError, syncBackend } from '../utils/blockchain';

const ProjectDetail = () => {
  const { address } = useParams();
  const { account, getProjectContract, getReadProjectContract, executeTransaction, isConnected, isCorrectNetwork } = useWallet();
  const [project, setProject] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const loadProjectDetails = useCallback(async () => {
    try {
      setLoading(true);
      setProject(null);
      setError(null);

      const contract = getReadProjectContract(address);
      const responses = await Promise.allSettled(['', '/contributions', '/updates', '/transactions'].map((suffix) =>
        axios.get(`${API_CONFIG.baseUrl}/projects/${address}${suffix}`, { timeout: API_CONFIG.timeout })
      ));
      const apiData = (index) => responses[index].status === 'fulfilled' && responses[index].value.data.success
        ? responses[index].value.data.data : null;
      // Status depends on block time, so read current contract state even when
      // the backend cache has not received a new event at the deadline.
      let currentProject;
      try { currentProject = projectFromChain(address, await contract.getProjectInfo()); }
      catch (err) { if (!apiData(0)) throw err; currentProject = normalizeProject(apiData(0)); }
      setProject(currentProject);
      const rawContributions = apiData(1) || await contract.getContributions();
      setContributions(rawContributions.map((item) => ({
        ...item, contributor: item.contributor, amount: item.amount.toString(),
        timestamp: Number(item.timestamp), refunded: item.refunded,
      })));
      const rawUpdates = apiData(2) || await contract.getUpdates();
      setUpdates(rawUpdates.map((item) => ({ ...item, content: item.content, timestamp: Number(item.timestamp) })));
      if (apiData(3)) setHistory(apiData(3));
      else {
        const logs = (await Promise.all(['Contributed', 'FundsWithdrawn', 'Refunded', 'UpdatePosted'].map((eventName) => contract.queryFilter(eventName, 0, 'latest')))).flat();
        setHistory(logs.map((log) => ({
          transactionHash: log.transactionHash, eventName: log.fragment.name,
          actor: log.args.contributor || log.args.creator || currentProject.creator,
          amount: log.args.amount?.toString(), content: log.args.content,
          timestamp: Number(log.args.timestamp), blockNumber: log.blockNumber, logIndex: log.index,
          status: 'confirmed',
        })).sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex));
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }, [address, getReadProjectContract]);

  useEffect(() => {
    const timer = setTimeout(loadProjectDetails, 0);
    return () => clearTimeout(timer);
  }, [loadProjectDetails]);

  const handleContribute = async () => {
    try {
      const amountWei = parsePositiveEther(contributeAmount);
      setActionLoading(true);
      setError(null);

      const projectContract = await getProjectContract(address);
      await executeTransaction('Contribute', () => projectContract.contribute({ value: amountWei }), address);
      setContributeAmount('');
      await syncBackend(address);
      await loadProjectDetails();
    } catch (err) {
      console.error('Error contributing:', err);
      setError(readableError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const projectContract = await getProjectContract(address);
      await executeTransaction('Withdraw funds', () => projectContract.withdrawFunds(), address);
      await syncBackend(address);
      await loadProjectDetails();
    } catch (err) {
      console.error('Error withdrawing:', err);
      setError(readableError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const projectContract = await getProjectContract(address);
      await executeTransaction('Request refund', () => projectContract.refund(), address);
      await syncBackend(address);
      await loadProjectDetails();
    } catch (err) {
      console.error('Error refunding:', err);
      setError(readableError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim()) {
      setError('Please enter update content');
      return;
    }
    if (ethers.toUtf8Bytes(updateContent.trim()).length > 1000) {
      setError('Update must be at most 1000 UTF-8 bytes');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const projectContract = await getProjectContract(address);
      await executeTransaction('Post update', () => projectContract.postUpdate(updateContent.trim()), address);
      setUpdateContent('');
      setShowUpdateForm(false);
      await syncBackend(address);
      await loadProjectDetails();
    } catch (err) {
      console.error('Error posting update:', err);
      setError(readableError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const isCreator = project && account && project.creator.toLowerCase() === account.toLowerCase();
  const isContributor = contributions.some(c => c.contributor.toLowerCase() === account?.toLowerCase() && !c.refunded);

  const getStatusText = (status) => PROJECT_STATUS[status] || 'Unknown';
  const getStatusColor = (status) => STATUS_COLORS[getStatusText(status)] || '#6b7280';

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>❌ {error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <p>Project not found</p>
      </div>
    );
  }

  const progress = (parseFloat(project.totalRaised) / parseFloat(project.goalAmount)) * 100;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← Back to Projects</Link>
      <button onClick={loadProjectDetails} style={{ ...styles.updateBtn, marginLeft: '1rem' }}>Refresh</button>

      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{project.title}</h1>
          <span style={{ ...styles.status, backgroundColor: getStatusColor(project.status) }}>
            {getStatusText(project.status)}
          </span>
        </div>
        <p style={styles.category}>Category: {project.category}</p>
      </div>

      {error && <div style={styles.error}>❌ {error}</div>}

      {/* 项目信息 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Project Information</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Contract:</span>
            <span style={styles.infoValue}>{address}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Creator:</span>
            <span style={styles.infoValue}>{project.creator}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Deadline:</span>
            <span style={styles.infoValue}>
              {new Date(parseInt(project.deadline) * 1000).toLocaleString()}
            </span>
          </div>
        </div>
        <p style={styles.description}>{project.description}</p>
      </div>

      {/* 筹款进度 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Funding Progress</h2>
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.progressAmount}>
              {ethers.formatEther(project.totalRaised)} ETH
            </span>
            <span style={styles.progressGoal}>
              Goal: {ethers.formatEther(project.goalAmount)} ETH
            </span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: getStatusColor(project.status),
              }}
            />
          </div>
          <p style={styles.progressPercent}>{progress.toFixed(2)}%</p>
        </div>
      </div>

      {/* 操作区域 */}
      {isConnected && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Actions</h2>

          {/* 投资 */}
          {project.status === 0 && (
            <div style={styles.actionBox}>
              <h3 style={styles.actionTitle}>Contribute to this project</h3>
              <div style={styles.contributeForm}>
                <input
                  type="number"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="Amount in ETH"
                  style={styles.input}
                  step="any"
                  min="0.000000000000000001"
                  disabled={actionLoading || !isCorrectNetwork}
                />
                <button
                  onClick={handleContribute}
                  style={styles.contributeBtn}
                  disabled={actionLoading || !isCorrectNetwork}
                >
                  {actionLoading ? 'Processing...' : 'Contribute'}
                </button>
              </div>
            </div>
          )}

          {/* 创建者操作 */}
          {isCreator && project.status === 1 && !project.fundsWithdrawn && (
            <div style={styles.actionBox}>
              <h3 style={styles.actionTitle}>Withdraw Funds</h3>
              <p style={styles.actionDesc}>Project is successful! You can withdraw the funds now.</p>
              <button
                onClick={handleWithdraw}
                style={styles.withdrawBtn}
                disabled={actionLoading || !isCorrectNetwork}
              >
                {actionLoading ? 'Processing...' : 'Withdraw Funds'}
              </button>
            </div>
          )}

          {/* 投资者退款 */}
          {isContributor && project.status === 2 && (
            <div style={styles.actionBox}>
              <h3 style={styles.actionTitle}>Request Refund</h3>
              <p style={styles.actionDesc}>Project failed. You can request a refund.</p>
              <button
                onClick={handleRefund}
                style={styles.refundBtn}
                disabled={actionLoading || !isCorrectNetwork}
              >
                {actionLoading ? 'Processing...' : 'Request Refund'}
              </button>
            </div>
          )}

          {/* 发布更新 */}
          {isCreator && (
            <div style={styles.actionBox}>
              <h3 style={styles.actionTitle}>Project Updates</h3>
              {!showUpdateForm ? (
                <button
                  onClick={() => setShowUpdateForm(true)}
                  style={styles.updateBtn}
                >
                  Post Update
                </button>
              ) : (
                <div>
                  <textarea
                    value={updateContent}
                    onChange={(e) => setUpdateContent(e.target.value)}
                    placeholder="Write your update..."
                    style={styles.textarea}
                    rows={4}
                    maxLength={1000}
                    disabled={actionLoading}
                  />
                  <div style={styles.updateActions}>
                    <button
                      onClick={handlePostUpdate}
                      style={styles.submitUpdateBtn}
                      disabled={actionLoading || !isCorrectNetwork}
                    >
                      {actionLoading ? 'Posting...' : 'Submit'}
                    </button>
                    <button
                      onClick={() => {
                        setShowUpdateForm(false);
                        setUpdateContent('');
                      }}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 投资记录 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Contributions ({contributions.length})</h2>
        {contributions.length === 0 ? (
          <p style={styles.emptyText}>No contributions yet</p>
        ) : (
          <div style={styles.contributionList}>
            {contributions.map((contrib, index) => (
              <div key={index} style={styles.contributionItem}>
                <div style={styles.contribInfo}>
                  <span style={styles.contribAddress}>{contrib.contributor}</span>
                  <span style={styles.contribAmount}>
                    {ethers.formatEther(contrib.amount)} ETH
                  </span>
                </div>
                <span style={styles.contribTime}>
                  {new Date(contrib.timestamp * 1000).toLocaleString()}
                </span>
                {contrib.refunded && <span style={styles.refundedBadge}>Refunded</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 项目更新 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>On-chain Transaction History ({history.length})</h2>
        {history.length === 0 ? <p style={styles.emptyText}>No project transactions yet.</p> :
          <div style={{ display: 'grid', gap: '1rem' }}>{history.map((tx) => <article key={`${tx.transactionHash}-${tx.logIndex}`} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}><strong>{tx.eventName}</strong><span style={{ color: '#047857' }}>Confirmed · Block {tx.blockNumber}</span></div>
            <p style={{ overflowWrap: 'anywhere', fontSize: '0.8rem' }}>Transaction hash: <code>{tx.transactionHash}</code></p>
            <p style={{ overflowWrap: 'anywhere', fontSize: '0.875rem', marginTop: '0.5rem' }}>Account: {tx.actor}{tx.amount ? ` · ${ethers.formatEther(tx.amount)} ETH` : ''}</p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>{new Date(Number(tx.timestamp) * 1000).toLocaleString()}</p>
          </article>)}</div>}
      </div>

      {/* 项目更新 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Updates ({updates.length})</h2>
        {updates.length === 0 ? (
          <p style={styles.emptyText}>No updates yet</p>
        ) : (
          <div style={styles.updateList}>
            {updates.map((update, index) => (
              <div key={index} style={styles.updateItem}>
                <p style={styles.updateContent}>{update.content}</p>
                <span style={styles.updateTime}>
                  {new Date(update.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '1rem',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  header: {
    marginBottom: '2rem',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  status: {
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.875rem',
    color: '#ffffff',
    fontWeight: '500',
  },
  category: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  infoGrid: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '1rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '0.875rem',
    color: '#1f2937',
    wordBreak: 'break-all',
  },
  description: {
    fontSize: '1rem',
    color: '#374151',
    lineHeight: '1.6',
  },
  progressSection: {
    marginTop: '1rem',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  progressAmount: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  progressGoal: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  progressBar: {
    width: '100%',
    height: '0.75rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '0.25rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  progressPercent: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.5rem',
  },
  actionBox: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
  },
  actionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  actionDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.75rem',
  },
  contributeForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
  },
  contributeBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  withdrawBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  refundBtn: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  updateBtn: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '0.5rem',
    boxSizing: 'border-box',
  },
  updateActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  submitUpdateBtn: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  cancelBtn: {
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  contributionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  contributionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  contribInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  contribAddress: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  contribAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#10b981',
  },
  contribTime: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  refundedBadge: {
    fontSize: '0.75rem',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
  },
  updateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  updateItem: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
  },
  updateContent: {
    fontSize: '1rem',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  updateTime: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
};

export default ProjectDetail;
