import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import ProjectCard from '../components/ProjectCard';
import { projectFromChain } from '../utils/blockchain';

const MyProjects = () => {
  const { readFactoryContract, getReadProjectContract, account, isConnected } = useWallet();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyProjects = useCallback(async () => {
    if (!account) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 获取用户创建的项目
      const projectAddresses = await readFactoryContract.getUserProjects(account);
      const projectDetails = [];

      for (const address of projectAddresses) {
        try {
          const projectContract = getReadProjectContract(address);
          const info = await projectContract.getProjectInfo();
          projectDetails.push(projectFromChain(address, info));
        } catch (projectErr) {
          console.error(`Error loading project ${address}:`, projectErr);
        }
      }

      setProjects(projectDetails);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load your projects');
    } finally {
      setLoading(false);
    }
  }, [readFactoryContract, getReadProjectContract, account]);

  useEffect(() => {
    const timer = setTimeout(loadMyProjects, 0);
    return () => clearTimeout(timer);
  }, [loadMyProjects]);

  if (!isConnected) {
    return (
      <div style={styles.container}>
        <div style={styles.notConnected}>
          <h2>Wallet Not Connected</h2>
          <p>Please connect your wallet to view your projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Projects</h1>
        <p style={styles.subtitle}>Projects you have created</p>
      </div>

      <div style={styles.actions}>
        <Link to="/create" style={styles.createBtn}>
          + Create New Project
        </Link>
        <button onClick={loadMyProjects} style={styles.refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>
          <p>Loading your projects...</p>
        </div>
      ) : error ? (
        <div style={styles.error}>❌ {error}</div>
      ) : projects.length === 0 ? (
        <div style={styles.empty}>
          <p>You haven't created any projects yet.</p>
          <Link to="/create" style={styles.emptyLink}>
            Create your first project →
          </Link>
        </div>
      ) : (
        <div style={styles.projectGrid}>
          {projects.map((project) => (
            <ProjectCard key={project.address} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
  },
  notConnected: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#fef3c7',
    borderRadius: '0.5rem',
    color: '#92400e',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
  },
  createBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  refreshBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    color: '#6b7280',
  },
  emptyLink: {
    display: 'inline-block',
    marginTop: '1rem',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '500',
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
};

export default MyProjects;
