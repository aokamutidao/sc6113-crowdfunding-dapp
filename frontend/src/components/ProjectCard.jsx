import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { PROJECT_STATUS, STATUS_COLORS } from '../config/contractConfig';

const ProjectCard = ({ project }) => {
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (wei) => {
    return ethers.formatEther(wei);
  };

  const calculateProgress = (raised, goal) => {
    if (!goal || goal === '0') return 0;
    const progress = (parseFloat(raised) / parseFloat(goal)) * 100;
    return Math.min(progress, 100).toFixed(2);
  };

  const getStatusText = (status) => {
    return PROJECT_STATUS[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const statusText = getStatusText(status);
    return STATUS_COLORS[statusText] || '#6b7280';
  };

  const progress = calculateProgress(project.totalRaised, project.goalAmount);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{project.title}</h3>
        <span style={{ ...styles.status, backgroundColor: getStatusColor(project.status) }}>
          {getStatusText(project.status)}
        </span>
      </div>

      <div style={styles.info}>
        <div style={styles.infoRow}>
          <span style={styles.label}>Category:</span>
          <span style={styles.value}>{project.category}</span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.label}>Creator:</span>
          <span style={styles.value}>{formatAddress(project.creator)}</span>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.label}>Progress:</span>
            <span style={styles.progressPercent}>{progress}%</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
                backgroundColor: getStatusColor(project.status),
              }}
            />
          </div>
          <div style={styles.progressInfo}>
            <span>{formatEther(project.totalRaised)} ETH</span>
            <span>Goal: {formatEther(project.goalAmount)} ETH</span>
          </div>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.label}>Deadline:</span>
          <span style={styles.value}>
            {new Date(parseInt(project.deadline) * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Link to={`/project/${project.address}`} style={styles.viewBtn}>
        View Details →
      </Link>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
    flex: 1,
  },
  status: {
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.875rem',
    color: '#ffffff',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  value: {
    fontSize: '0.875rem',
    color: '#1f2937',
    fontWeight: '500',
  },
  progressSection: {
    marginTop: '0.5rem',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  progressPercent: {
    fontSize: '0.875rem',
    color: '#1f2937',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: '0.5rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '0.25rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  viewBtn: {
    display: 'block',
    textAlign: 'center',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
};

export default ProjectCard;
