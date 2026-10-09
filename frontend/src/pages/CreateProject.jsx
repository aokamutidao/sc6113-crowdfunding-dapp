import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { CATEGORIES } from '../config/contractConfig';
import { parsePositiveEther, readableError, syncBackend } from '../utils/blockchain';

const CreateProject = () => {
  const navigate = useNavigate();
  const { factoryContract, readFactoryContract, isConnected, isCorrectNetwork, executeTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    goalAmount: '',
    duration: '30', // 天数
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (ethers.toUtf8Bytes(formData.title.trim()).length < 5) {
      setError('Title must be at least 5 UTF-8 bytes');
      return false;
    }
    if (ethers.toUtf8Bytes(formData.title.trim()).length > 100) {
      setError('Title must be at most 100 UTF-8 bytes');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (ethers.toUtf8Bytes(formData.description.trim()).length < 10) {
      setError('Description must be at least 10 UTF-8 bytes');
      return false;
    }
    if (ethers.toUtf8Bytes(formData.description.trim()).length > 1000) {
      setError('Description must be at most 1000 UTF-8 bytes');
      return false;
    }
    try {
      if (parsePositiveEther(formData.goalAmount) < ethers.parseEther('0.01')) throw new Error('Goal amount must be at least 0.01 ETH');
    } catch (err) {
      setError(readableError(err));
      return false;
    }
    if (!Number.isInteger(Number(formData.duration)) || Number(formData.duration) < 1) {
      setError('Duration must be a whole number of days from 1 to 90');
      return false;
    }
    if (Number(formData.duration) > 90) {
      setError('Duration must be at most 90 days');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!factoryContract) {
      setError('Contract not initialized');
      return;
    }
    if (!isCorrectNetwork) {
      setError('Switch your wallet to the configured network before creating a project');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 计算截止时间
      const block = await readFactoryContract.runner.getBlock('latest');
      const deadline = block.timestamp + (Number(formData.duration) * 24 * 60 * 60);

      // 转换目标金额为Wei
      const goalAmountWei = ethers.parseEther(formData.goalAmount);

      console.log('Creating project with:', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        goalAmount: goalAmountWei.toString(),
        deadline: deadline,
      });

      // 调用合约创建项目
      const receipt = await executeTransaction('Create project', () => factoryContract.createProject(
        formData.title.trim(),
        formData.description.trim(),
        formData.category,
        goalAmountWei,
        deadline
      ));
      console.log('Transaction confirmed:', receipt.hash);

      // 获取项目地址
      const event = receipt.logs.find(log => log.topics[0] === factoryContract.interface.getEvent('ProjectCreated').topicHash);
      if (event) {
        const decoded = factoryContract.interface.decodeEventLog('ProjectCreated', event.data, event.topics);
        const projectAddress = decoded.projectAddress;
        console.log('Project created at:', projectAddress);
        await syncBackend(projectAddress);

        // 跳转到项目详情页
        navigate(`/project/${projectAddress}`);
      } else {
        // 如果找不到事件，跳转到首页
        navigate('/');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div style={styles.container}>
        <div style={styles.notConnected}>
          <h2>Wallet Not Connected</h2>
          <p>Please connect your wallet to create a project.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create New Project</h1>
        <p style={styles.subtitle}>Launch your crowdfunding campaign on the blockchain</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.error}>❌ {error}</div>}

        {/* 项目标题 */}
        <div style={styles.formGroup}>
          <label htmlFor="title" style={styles.label}>Project Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter project title (5-100 characters)"
            style={styles.input}
            disabled={loading}
            maxLength={100}
          />
        </div>

        {/* 项目描述 */}
        <div style={styles.formGroup}>
          <label htmlFor="description" style={styles.label}>Description *</label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your project (10-1000 characters)"
            style={styles.textarea}
            disabled={loading}
            rows={6}
            maxLength={1000}
          />
          <span style={styles.charCount}>
            {ethers.toUtf8Bytes(formData.description).length}/1000 UTF-8 bytes
          </span>
        </div>

        {/* 项目分类 */}
        <div style={styles.formGroup}>
          <label htmlFor="category" style={styles.label}>Category *</label>
          <select
            name="category"
            id="category"
            value={formData.category}
            onChange={handleChange}
            style={styles.select}
            disabled={loading}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 目标金额 */}
        <div style={styles.formGroup}>
          <label htmlFor="goalAmount" style={styles.label}>Goal Amount (ETH) *</label>
          <input
            type="number"
            name="goalAmount"
            id="goalAmount"
            value={formData.goalAmount}
            onChange={handleChange}
            placeholder="0.01"
            style={styles.input}
            disabled={loading}
            step="any"
            min="0.01"
          />
          <span style={styles.hint}>Minimum: 0.01 ETH</span>
        </div>

        {/* 持续时间 */}
        <div style={styles.formGroup}>
          <label htmlFor="duration" style={styles.label}>Duration (days) *</label>
          <input
            type="number"
            name="duration"
            id="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="30"
            style={styles.input}
            disabled={loading}
            min="1"
            max="90"
            step="1"
          />
          <span style={styles.hint}>Maximum: 90 days</span>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          style={{
            ...styles.submitBtn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          disabled={loading}
        >
          {loading ? 'Creating Project...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    textAlign: 'center',
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
  form: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '0.75rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
    position: 'relative',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  charCount: {
    position: 'absolute',
    right: '0.75rem',
    bottom: '0.75rem',
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  hint: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
};

export default CreateProject;
