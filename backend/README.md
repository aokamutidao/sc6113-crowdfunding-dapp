# Crowdfunding DApp Backend

Node.js + Express 后端 API，为去中心化众筹平台提供数据缓存和查询服务。

## 🌟 功能特性

- ✅ RESTful API 设计
- ✅ SQLite 数据库缓存
- ✅ 区块链事件监听
- ✅ 实时数据同步
- ✅ 完整的错误处理
- ✅ 日志记录系统
- ✅ 项目统计查询

## 📋 API 端点

### 项目相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/projects` | 获取所有项目列表 |
| GET | `/api/projects/:address` | 获取项目详情 |
| GET | `/api/projects/:address/contributions` | 获取项目投资记录 |
| GET | `/api/projects/:address/updates` | 获取项目更新 |
| GET | `/api/projects/:address/stats` | 获取项目统计 |
| POST | `/api/projects/:address/sync` | 同步单个项目 |

### 用户相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/creators/:creator/projects` | 获取创建者的项目 |
| GET | `/api/contributors/:contributor/contributions` | 获取投资者的投资记录 |

### 系统相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/sync/all` | 同步所有项目 |

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
PORT=3000
NODE_ENV=development
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
FACTORY_CONTRACT_ADDRESS=0x... # 你的工厂合约地址
LOG_LEVEL=info
```

### 3. 启动服务器

开发模式（热重载）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

### 4. 测试 API

```bash
# 健康检查
curl http://localhost:3000/health

# 获取所有项目
curl http://localhost:3000/api/projects

# 获取项目详情
curl http://localhost:3000/api/projects/0x...
```

## 📊 数据库结构

### Projects 表
```sql
- address (PK)
- creator
- title
- description
- category
- goalAmount
- deadline
- totalRaised
- status (active/successful/failed/fundsWithdrawn)
- fundsWithdrawn
- contributionCount
- lastUpdated
```

### Contributions 表
```sql
- id (PK)
- projectAddress (FK)
- contributor
- amount
- timestamp
- refunded
- transactionHash
```

### ProjectUpdates 表
```sql
- id (PK)
- projectAddress (FK)
- content
- timestamp
- transactionHash
```

## 🔗 区块链集成

### 事件监听

后端会自动监听以下区块链事件：

1. **ProjectCreated** - 新项目创建
2. **Contributed** - 新投资
3. **FundsWithdrawn** - 资金提取
4. **Refunded** - 退款
5. **UpdatePosted** - 项目更新

### 数据同步

- **自动同步**：通过事件监听实时同步
- **手动同步**：通过 API 端点手动触发同步

## 📝 使用示例

### 获取所有项目

```javascript
const response = await fetch('http://localhost:3000/api/projects');
const data = await response.json();
console.log(data);
```

### 获取项目详情

```javascript
const address = '0x...';
const response = await fetch(`http://localhost:3000/api/projects/${address}`);
const data = await response.json();
console.log(data);
```

### 获取用户投资

```javascript
const contributor = '0x...';
const response = await fetch(`http://localhost:3000/api/contributors/${contributor}/contributions`);
const data = await response.json();
console.log(data);
```

## 🧪 测试

```bash
npm test
```

## 📦 技术栈

- **Express** - Web 框架
- **Sequelize** - ORM
- **SQLite3** - 数据库
- **Ethers.js** - 区块链交互
- **Winston** - 日志记录
- **Helmet** - 安全增强
- **Morgan** - HTTP 请求日志
- **Jest** - 测试框架

## 🔒 安全特性

- ✅ Helmet 安全头
- ✅ CORS 配置
- ✅ 输入验证
- ✅ 错误处理
- ✅ SQL 注入防护（通过 Sequelize）

## 📈 性能优化

- ✅ 数据库索引
- ✅ 事件驱动架构
- ✅ 缓存策略
- ✅ 异步处理

## 🐛 故障排查

### 数据库连接失败
- 检查 `db/` 目录权限
- 确保 SQLite 已安装

### 区块链连接失败
- 检查 RPC URL 是否正确
- 检查合约地址是否正确
- 确保智能合约已部署

### 事件监听不工作
- 检查日志输出
- 确保合约地址正确
- 检查网络连接

## 📚 API 文档

### 响应格式

成功响应：
```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

错误响应：
```json
{
  "success": false,
  "error": "Error message"
}
```

### 查询参数

获取项目列表支持的查询参数：
- `status` - 过滤状态（active/successful/failed/fundsWithdrawn）
- `category` - 过滤类别
- `sortBy` - 排序字段（默认：createdAt）
- `order` - 排序方向（ASC/DESC）

## 🚧 开发计划

- [ ] 添加 API 认证
- [ ] 实现速率限制
- [ ] 添加缓存层（Redis）
- [ ] 实现 WebSocket 实时推送
- [ ] 添加 API 文档（Swagger）
- [x] 添加 API 参数与计算测试
- [x] 添加真实链只读集成测试

## 📄 许可证

MIT License

---

**注意**：后端是可选的，DApp 可以直接通过前端与区块链交互。后端主要用于数据缓存和快速查询。

## 已验证的运行方式与限制（2026-10-09）

项目根目录先执行 `npm run compile`，后端直接读取根目录 `artifacts/contracts` 的 ABI。无需复制到 `backend/artifacts`。

本地链启动并部署 factory 后，后端可通过环境变量独立运行：

```bash
RPC_URL=http://127.0.0.1:8545 \
FACTORY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 \
PORT=3000 \
DATABASE_PATH=/absolute/path/database.sqlite \
npm start
```

`RPC_URL` 优先于 `SEPOLIA_RPC_URL`。`DATABASE_PATH` 未设置时使用 `backend/db/database.sqlite`，测试默认使用内存数据库。旧版 `backend/src/db/database.sqlite` 不再被默认加载；当前链数据会自动重建缓存。公共测试网应设置 `FACTORY_DEPLOYMENT_BLOCK` 为实际部署区块以减少历史扫描。`CORS_ORIGIN` 可设置逗号分隔的允许来源列表。

新增 GET `/api/projects/:address/transactions` 返回贡献、提款、退款、更新事件的真实交易哈希、区块号和日志序号。所有地址/状态/排序参数经过验证。启动会回放项目和事件历史；新项目自动注册监听；每 15 秒刷新状态。幂等同步以一个固定区块读取状态及日志，在 SQLite 事务中替换缓存，避免旧版同步重复记录。后端只读区块链，不持有钱包私钥。

```bash
npm test
# 读取已经部署且含项目的 factory，不发链交易；使用独立内存数据库
RPC_URL=http://127.0.0.1:8545 FACTORY_CONTRACT_ADDRESS=0x... npm run test:integration
```

已验证 15 项 API 测试，以及真实本地链的项目、金额、事件哈希/回执/日志序号、贡献者关联和重复同步。最终 UI 运行后还通过 GET-only 核验：4 个项目、7 条事件、提款与退款哈希及余额，以及一次自动刷新前后缓存的幂等性。证据位于提交包 `evidence/backend-tests.txt` 和 `evidence/final-chain-verification.txt`。集成测试需本地 HTTP/RPC 网络权限。

这仍是教学原型：默认 CORS 开放、同步端点公开、无身份认证/速率限制、仅用已打包区块作为确认状态、无生产数据库迁移工具。全历史扫描与 15 秒刷新适合少量本地项目；规模扩大需持久区块游标、增量索引、确认深度和重组处理。SQLite 是可重建查询缓存，合约才是资金与授权的依据。停止服务会关闭事件监听、HTTP 服务与数据库。
