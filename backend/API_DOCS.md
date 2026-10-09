# API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **响应格式**: JSON
- **认证**: 无需认证（公开 API）

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### 错误响应
```json
{
  "success": false,
  "error": "Error message"
}
```

## 端点详情

### 1. 健康检查

**GET** `/health`

检查服务器状态

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-02T10:00:00.000Z"
}
```

---

### 2. 获取所有项目

**GET** `/api/projects`

获取所有众筹项目列表

**查询参数**:
- `status` (可选) - 过滤状态：active, successful, failed, fundsWithdrawn
- `category` (可选) - 过滤类别
- `sortBy` (可选) - 排序字段，默认：createdAt
- 可用排序字段：createdAt、updatedAt、deadline、title、status；其他值返回 400
- `order` (可选) - 排序方向：ASC, DESC

**响应示例**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "address": "0x...",
      "creator": "0x...",
      "title": "Project Title",
      "description": "Project description",
      "category": "Technology",
      "goalAmount": "10000000000000000000",
      "deadline": 1699999999,
      "totalRaised": "5000000000000000000",
      "status": "active",
      "fundsWithdrawn": false,
      "contributionCount": 5,
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z"
    }
  ]
}
```

---

### 3. 获取项目详情

**GET** `/api/projects/:address`

获取单个项目的详细信息

**路径参数**:
- `address` (必需) - 项目合约地址

**响应示例**:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "creator": "0x...",
    "title": "Project Title",
    "description": "Project description",
    "category": "Technology",
    "goalAmount": "10000000000000000000",
    "deadline": 1699999999,
    "totalRaised": "5000000000000000000",
    "status": "active",
    "fundsWithdrawn": false,
    "contributionCount": 5,
    "createdAt": "2026-10-02T10:00:00.000Z",
    "updatedAt": "2026-10-02T10:00:00.000Z"
  }
}
```

**错误响应** (404):
```json
{
  "success": false,
  "error": "Project not found"
}
```

---

### 4. 获取项目投资记录

**GET** `/api/projects/:address/contributions`

获取指定项目的所有投资记录

**路径参数**:
- `address` (必需) - 项目合约地址

**响应示例**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "projectAddress": "0x...",
      "contributor": "0x...",
      "amount": "1000000000000000000",
      "timestamp": 1699999000,
      "refunded": false,
      "transactionHash": "0x...",
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z"
    }
  ]
}
```

---

### 5. 获取项目更新

**GET** `/api/projects/:address/updates`

获取指定项目的所有更新

**路径参数**:
- `address` (必需) - 项目合约地址

**响应示例**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "projectAddress": "0x...",
      "content": "Project update content",
      "timestamp": 1699999000,
      "transactionHash": "0x...",
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z"
    }
  ]
}
```

---

### 6. 获取项目统计

**GET** `/api/projects/:address/stats`

获取项目的统计信息

**路径参数**:
- `address` (必需) - 项目合约地址

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalRaised": "5000000000000000000",
    "goalAmount": "10000000000000000000",
    "progress": "50.00",
    "totalContributors": 5,
    "averageContribution": "1000000000000000000",
    "contributionCount": 5
  }
}
```

---

### 7. 同步单个项目

**POST** `/api/projects/:address/sync`

从区块链同步单个项目的最新数据

**路径参数**:
- `address` (必需) - 项目合约地址

**响应示例**:
```json
{
  "success": true,
  "message": "Project synced successfully"
}
```

---

### 8. 获取创建者的项目

**GET** `/api/creators/:creator/projects`

获取指定地址创建的所有项目

**路径参数**:
- `creator` (必需) - 创建者地址

**响应示例**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "address": "0x...",
      "creator": "0x...",
      "title": "Project 1",
      "description": "Description",
      "category": "Technology",
      "goalAmount": "10000000000000000000",
      "deadline": 1699999999,
      "totalRaised": "5000000000000000000",
      "status": "active",
      "fundsWithdrawn": false,
      "contributionCount": 5,
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z"
    }
  ]
}
```

---

### 9. 获取投资者的投资记录

**GET** `/api/contributors/:contributor/contributions`

获取指定地址的所有投资记录

**路径参数**:
- `contributor` (必需) - 投资者地址

**响应示例**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "projectAddress": "0x...",
      "contributor": "0x...",
      "amount": "1000000000000000000",
      "timestamp": 1699999000,
      "refunded": false,
      "transactionHash": "0x...",
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z",
      "project": {
        "address": "0x...",
        "title": "Project Title",
        "creator": "0x...",
        "status": "active"
      }
    }
  ]
}
```

---

### 10. 同步所有项目

**POST** `/api/sync/all`

从区块链同步所有项目的最新数据

**响应示例**:
```json
{
  "success": true,
  "message": "All projects synced successfully"
}
```

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |
| 503 | 区块链同步未配置或配置无效 |

## 数据格式说明

### 金额字段
所有金额字段都以 Wei 为单位（字符串格式），使用 Ethers v6 的 `ethers.formatEther()` 转换为 ETH。

**示例**:
```javascript
const amountInWei = "1000000000000000000";
const amountInEth = ethers.formatEther(amountInWei); // "1.0"
```

### 时间戳字段
时间戳为 Unix 时间戳（秒），需要转换为 Date 对象。

**示例**:
```javascript
const timestamp = 1699999999;
const date = new Date(timestamp * 1000);
```

### 状态字段
项目状态可能的值：
- `active` - 进行中
- `successful` - 成功（达到目标）
- `failed` - 失败（未达到目标）
- `fundsWithdrawn` - 资金已提取

## 使用示例

### JavaScript (Fetch API)

```javascript
// 获取所有项目
const response = await fetch('http://localhost:3000/api/projects');
const data = await response.json();
console.log(data);

// 获取项目详情
const address = '0x...';
const response = await fetch(`http://localhost:3000/api/projects/${address}`);
const data = await response.json();
console.log(data);

// 获取项目统计
const response = await fetch(`http://localhost:3000/api/projects/${address}/stats`);
const data = await response.json();
console.log(`进度: ${data.data.progress}%`);
```

### cURL

```bash
# 获取所有项目
curl http://localhost:3000/api/projects

# 获取项目详情
curl http://localhost:3000/api/projects/0x...

# 同步项目
curl -X POST http://localhost:3000/api/projects/0x.../sync
```

## 错误处理

所有错误都会返回统一的格式：

```json
{
  "success": false,
  "error": "Error message"
}
```

在开发模式下，还会包含错误堆栈：

```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack trace"
}
```

## 速率限制

当前版本没有速率限制。建议在生产环境中添加速率限制以防止滥用。

## CORS

API 默认启用 CORS，允许所有来源访问。可以在 `server.js` 中配置 CORS 选项。

## 完整交易事件历史（新增）

**GET** `/api/projects/:address/transactions`

返回该项目已同步的 `Contributed`、`FundsWithdrawn`、`Refunded`、`UpdatePosted` 事件。响应为 `{ success: true, count, data }`，`data` 按 `blockNumber` 和 `logIndex` 降序排列。每项包含：

| 字段 | 含义 |
|------|------|
| `id` | 项目地址、真实交易哈希和日志序号组成的稳定标识 |
| `projectAddress` | 项目合约地址 |
| `transactionHash` | RPC 事件日志中的真实交易哈希 |
| `blockNumber` / `logIndex` | 事件所在区块、该区块的日志序号 |
| `eventName` | Contributed / FundsWithdrawn / Refunded / UpdatePosted |
| `actor` | 贡献者、退款者或项目创建者 |
| `amount` | Wei 字符串；UpdatePosted 为 null |
| `content` | 项目更新内容；金额事件为 null |
| `timestamp` | 事件携带的 Unix 秒时间戳 |
| `status` | confirmed，表示该日志已被打包到区块；不表示多确认最终性 |

路径中的项目、创建者、贡献者地址必须是合法以太坊地址，服务会转换为 checksum 地址。未知项目返回 404，无效参数返回 400。

`/contributions` 每次 `Contributed` 事件返回一行，区别于合约 `getContributions()` 中每个贡献者的累计金额。`/stats` 的 `totalContributors` 统计不同钱包地址，`contributionCount` 统计贡献交易次数，`averageContribution` 是每笔贡献平均金额（Wei 整数，向下取整）。`progress` 使用 BigInt 计算并截断至两位小数；项目详情中的 `contributionCount` 则保留合约返回的贡献者数量。

两个 POST 同步端点无需请求体。单项目同步拒绝不属于当前 factory 注册表的地址；成功响应的 `data` 包含同步区块信息。单项目同步同时重建状态和完整事件历史；重复同步不会增加历史行数。贡献/更新的自增 `id` 是缓存标识，重建时可能变化，应使用交易哈希和日志序号追踪事件。

启动时回放历史，随后监听新项目及项目事件，并每 15 秒重新同步，恢复遗漏事件和仅由时间引起的状态变化。API 读取缓存存在短暂延迟；交易回执后可主动 POST 单项目同步。后端不提交链上交易，也不保存钱包私钥。
