import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import ProjectCard from '../components/ProjectCard';
import axios from 'axios';
import { API_CONFIG, CATEGORIES } from '../config/contractConfig';
import { normalizeProject, projectFromChain } from '../utils/blockchain';

const Home = () => {
  const { readFactoryContract, getReadProjectContract } = useWallet();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    category: 'All',
    status: 'All',
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 从后端API获取项目列表
      const response = await axios.get(`${API_CONFIG.baseUrl}/projects`, { timeout: API_CONFIG.timeout });

      if (response.data.success) {
        setProjects(response.data.data.map(normalizeProject));
      } else {
        throw new Error('Failed to load projects from API');
      }
    } catch (err) {
      console.error('Error loading projects:', err);

      // 如果API失败，直接从区块链获取
      try {
        const projectAddresses = await readFactoryContract.getAllProjects();
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
      } catch (blockchainErr) {
        setError('Failed to load projects. Please try again.');
        console.error('Blockchain error:', blockchainErr);
      }
    } finally {
      setLoading(false);
    }
  }, [readFactoryContract, getReadProjectContract]);

  useEffect(() => {
    // Cancel the first scheduled fetch during React StrictMode's effect replay.
    const timer = setTimeout(loadProjects, 0);
    return () => clearTimeout(timer);
  }, [loadProjects]);

  const filteredProjects = projects.filter((project) => {
    if (filter.category !== 'All' && project.category !== filter.category) {
      return false;
    }
    if (filter.status !== 'All' && project.status.toString() !== filter.status) {
      return false;
    }
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Crowdfunding Projects</h1>
        <p style={styles.subtitle}>
          Discover and support innovative projects on the blockchain
        </p>
      </div>

      {/* 过滤器 */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Category:</label>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            style={styles.select}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status:</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={styles.select}
          >
            <option value="All">All Status</option>
            <option value="0">Active</option>
            <option value="1">Successful</option>
            <option value="2">Failed</option>
            <option value="3">Funds Withdrawn</option>
          </select>
        </div>

        <button onClick={loadProjects} style={styles.refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div style={styles.loading}>
          <p>Loading projects...</p>
        </div>
      ) : error ? (
        <div style={styles.error}>
          <p>❌ {error}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={styles.empty}>
          <p>No projects found.</p>
          <p style={styles.emptyHint}>Create a project to start a crowdfunding campaign.</p>
        </div>
      ) : (
        <div style={styles.projectGrid}>
          {filteredProjects.map((project) => (
            <ProjectCard key={project.address} project={project} />
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {projects.length > 0 && (
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>{projects.length}</h3>
            <p style={styles.statLabel}>Total Projects</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>
              {projects.filter((p) => p.status === 0).length}
            </h3>
            <p style={styles.statLabel}>Active</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>
              {projects.filter((p) => p.status === 1).length}
            </h3>
            <p style={styles.statLabel}>Successful</p>
          </div>
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
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  select: {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  refreshBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginLeft: 'auto',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  error: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#fee2e2',
    borderRadius: '0.5rem',
    color: '#991b1b',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: '0.875rem',
    marginTop: '0.5rem',
    color: '#9ca3af',
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '3rem',
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#3b82f6',
    margin: '0 0 0.5rem 0',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
};

export default Home;
