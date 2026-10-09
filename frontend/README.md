# Crowdfunding DApp Frontend

基于 React + Vite 构建的去中心化众筹平台前端应用。

## 🌟 功能特性

- ✅ MetaMask 钱包连接
- ✅ 项目列表浏览和筛选
- ✅ 项目详情查看
- ✅ 创建新项目
- ✅ 投资项目
- ✅ 提取资金（创建者）
- ✅ 申请退款（投资者）
- ✅ 发布项目更新
- ✅ 我的项目管理
- ✅ 响应式设计

## 🚀 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 3. 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/        # 可复用组件
│   │   ├── Navbar.jsx
│   │   └── ProjectCard.jsx
│   ├── pages/             # 页面组件
│   │   ├── Home.jsx
│   │   ├── CreateProject.jsx
│   │   ├── ProjectDetail.jsx
│   │   └── MyProjects.jsx
│   ├── context/           # React Context
│   │   └── WalletContext.jsx
│   ├── utils/             # 工具函数
│   ├── config/            # 配置文件
│   │   ├── contractConfig.js
│   │   ├── CrowdfundingFactory.json
│   │   └── CrowdfundingProject.json
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── config/                # 合约ABI文件
├── public/
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ 技术栈

- **React 19** - UI 框架
- **Vite 9** - 构建工具
- **Ethers.js 6** - 区块链交互
- **React Router DOM 7** - 路由管理
- **Axios** - HTTP 请求

## 📱 页面说明

### Home（首页）
- 显示所有项目列表
- 按类别和状态筛选
- 项目统计信息

### Create Project（创建项目）
- 创建新的众筹项目
- 表单验证
- 提交到区块链

### Project Detail（项目详情）
- 项目完整信息
- 筹款进度
- 投资功能
- 提取资金（创建者）
- 申请退款（投资者）
- 发布更新（创建者）
- 投资记录
- 项目更新列表

### My Projects（我的项目）
- 显示当前用户创建的项目
- 快速管理入口

## 🔗 合约配置

编辑 `config/contractConfig.js` 更新合约地址：

```javascript
export const CONTRACTS = {
  factory: '0x...', // 你的工厂合约地址
  network: {
    chainId: '0xaa36a7', // 11155111 (Sepolia)
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
};
```

## 🎨 样式

项目使用内联样式，无需额外的 CSS 框架。所有组件都包含完整的样式定义。

## 📡 API 集成

前端默认连接后端 API（http://localhost:3000/api）。如果 API 不可用，会直接从区块链读取数据。

## 🐛 故障排查

### MetaMask 无法连接
- 确保已安装 MetaMask 扩展
- 检查网络设置是否正确
- 刷新页面重试

### 合约交互失败
- 检查合约地址是否正确
- 确保已连接正确的网络
- 查看浏览器控制台错误信息

### 项目列表为空
- 检查后端 API 是否运行
- 检查合约是否有项目数据
- 查看浏览器控制台错误

## 📚 参考资源

- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Ethers.js 文档](https://docs.ethers.org/)
- [React Router 文档](https://reactrouter.com/)

---

**注意**：确保后端服务器和区块链节点正在运行。
