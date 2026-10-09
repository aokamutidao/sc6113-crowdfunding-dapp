import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import TransactionNotice from './components/TransactionNotice';
import Home from './pages/Home';
import CreateProject from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';
import MyProjects from './pages/MyProjects';
import Transactions from './pages/Transactions';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div style={styles.app}>
          <Navbar />
          <TransactionNotice />
          <main style={styles.main}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateProject />} />
              <Route path="/project/:address" element={<ProjectDetail />} />
              <Route path="/my-projects" element={<MyProjects />} />
              <Route path="/transactions" element={<Transactions />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  main: {
    minHeight: 'calc(100vh - 80px)',
  },
};

export default App;
