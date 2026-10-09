# Decentralized Crowdfunding Platform — SC6113

This financial DApp lets a creator open an ETH crowdfunding campaign, supporters contribute to a contract-held escrow, and users inspect funding progress and transaction history. After the deadline, the creator can withdraw if the funding target was reached. Otherwise, each supporter requests their own refund through `refund()`. Refunds are **manual pull payments**, not automatic transfers.

The source includes the Solidity contracts, a React web interface, and a Node.js/Express backend with a rebuildable SQLite cache. The default configuration is **Hardhat Local, chain ID 31337**. The submission includes automated evidence from an isolated local chain and a separate manual MetaMask session on the local chain at `http://127.0.0.1:8545`. It does not establish a Sepolia deployment, Etherscan verification, or public hosting.

## Implementation

- `CrowdfundingFactory` validates new campaigns and indexes their addresses by creator and category.
- `CrowdfundingProject` records contributions and updates, computes campaign status, and enforces creator withdrawal and contributor refund rules.
- The frontend supports an injected Ethereum wallet such as MetaMask, read-only browsing, campaign creation, contributions, withdrawal, refunds, creator updates, and transaction status/history.
- The backend reads contract state and event logs through Ethers.js, persists a SQLite cache, and exposes project, contribution, update, transaction and statistics APIs. It does not sign financial transactions or hold wallet private keys.

Campaigns stay `Active` until the deadline even when their target has already been reached. At the deadline, they become `Successful` or `Failed`. A successful withdrawal changes the status to `FundsWithdrawn`. Overfunding is allowed. `totalRaised` preserves the gross historical contribution amount after withdrawals or refunds; it is not the current escrow balance.

## Requirements and versions

Use Node.js **22.12 or later** and npm. The submitted checks ran with Node.js **24.11.1**. The frontend's Vite dependency requires Node.js `^20.19.0 || >=22.12.0`; older Node.js 18 installations are insufficient.

The lockfiles provide the dependency versions. The contract toolchain uses Hardhat 2.29.1, the locally installed **Solidity compiler 0.8.26**, OpenZeppelin Contracts 5.6.1, optimizer 200 runs and the Paris EVM target. The contracts retain the compatible `^0.8.20` source pragma. Hardhat uses the installed solc-js compiler without a separate compiler download. The frontend uses React 19, Vite 8 and Ethers.js 6; the backend uses Express, Sequelize and SQLite3.

## Run locally in three terminals

Run the commands from the `crowdfunding-dapp` directory unless a `cd` command changes it. Install each package from its lockfile. Keep the blockchain node running while deploying and using the application.

**Terminal 1 — contracts and local blockchain**

```bash
npm ci
npm run compile
npm test
npm run node
```

The node listens at `http://127.0.0.1:8545` and creates funded development accounts. A root `.env` file is not needed for this local flow. Remove unfilled `PRIVATE_KEY` placeholders if an existing root `.env` contains them.

**Terminal 2 — deploy and start the backend**

```bash
npm run deploy:local
cd backend
npm ci
cp .env.example .env
```

Before starting the backend, edit `backend/.env` to use the factory address and deployment block printed by deployment and saved in `deployment-localhost.json`:

```env
PORT=3000
NODE_ENV=development
RPC_URL=http://127.0.0.1:8545
FACTORY_CONTRACT_ADDRESS=YOUR_DEPLOYED_FACTORY_ADDRESS
FACTORY_DEPLOYMENT_BLOCK=YOUR_FACTORY_DEPLOYMENT_BLOCK
LOG_LEVEL=info
```

Use actual values for both placeholders. `RPC_URL` takes precedence over `SEPOLIA_RPC_URL`. SQLite is created automatically at `backend/db/database.sqlite` unless `DATABASE_PATH` selects another location.

```bash
npm start
```

The local deployment script waits for one confirmation, so it completes on an automining development chain. Public-network deployments wait for five confirmations.

**Terminal 3 — frontend**

```bash
cd frontend
npm ci
```

Copy `frontend/.env.example` to `frontend/.env.local` and set the same factory address:

```env
VITE_FACTORY_ADDRESS=YOUR_DEPLOYED_FACTORY_ADDRESS
VITE_CHAIN_ID=0x7a69
VITE_NETWORK_NAME=Hardhat Local
VITE_RPC_URL=http://127.0.0.1:8545
VITE_API_URL=http://localhost:3000/api
VITE_BLOCK_EXPLORER=
```

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Restart Vite after changing environment variables. Read-only project browsing does not require connecting a wallet. A backend cache refresh failure does not change an already confirmed blockchain transaction into a failed transaction.

## MetaMask local workflow

1. Add a network with RPC `http://127.0.0.1:8545`, chain ID `31337`, currency `ETH`, and no block explorer.
2. Import one of the **development-only** private keys printed by the Hardhat node into a separate test wallet/account. These accounts are publicly known. Use them only on the local Hardhat network, never for personal funds or public-network activity.
3. Connect the wallet through the application and select Hardhat Local. Use one account to create a campaign and another to contribute.
4. Approve the wallet request and inspect the application's signature, pending, confirmed or failed status. Successful receipts provide a transaction hash and block number.
5. Withdraw only after a funded campaign's deadline, or request a refund after an underfunded campaign's deadline.

The user manually verified the actual MetaMask extension connection and approved creation of **MetaMask Student Learning Fund**. The six user-supplied screenshots numbered `09`–`14` show the connection request, connected account, creation form, transaction approval, created campaign and confirmed transaction history. Independent RPC verification records chain ID `31337`, successful receipt status `1`, block `3` and transaction `0x1b276db6e36795bd81a6cb35834ffed87c3df693b01abb8741f000c9969ea913` in `evidence/metamask-verification.json`. The wallet approval screenshot displays the inconsistent custom network name **GoChain Testnet**; the verified transaction belongs to the local Hardhat chain, not the public GoChain testnet. Screenshots `01`–`08` remain automated EIP-1193 bridge evidence and must not be described as actual MetaMask screenshots.

## Optional Sepolia configuration

### Render: one public URL for the web app and API

The repository is available at https://github.com/aokamutidao/sc6113-crowdfunding-dapp. `render.yaml` defines a free Node.js Web Service. The backend serves the compiled React app and the API at `/api` on the same origin. Keep Render's Root Directory empty because Solidity artifacts are compiled at the repository root.

Create a Web Service using this repository and configure:

- Build Command: `npm ci --include=dev && npm run build:render`
- Start Command: `npm start --prefix backend`
- Health Check Path: `/health`
- `NODE_VERSION=24.11.1`, `NODE_ENV=production`, `SERVE_FRONTEND=true`, `REQUIRE_BLOCKCHAIN_SYNC=true`
- `RPC_URL`: a public HTTPS Sepolia RPC endpoint
- `FACTORY_CONTRACT_ADDRESS`: the actual deployed factory address
- `FACTORY_DEPLOYMENT_BLOCK`: the actual deployment receipt's block number

The build sets Sepolia chain ID `11155111`, uses `/api` for the browser's API requests, and compiles the factory ABI. Private keys are not needed on Render. Free instances can sleep after inactivity and lose their SQLite cache on restart; startup rebuilds that cache from the configured chain. Blockchain data remains authoritative. The public URL will be documented after deployment and verification.

For deployment through the existing MetaMask wallet without exporting a private key, run `npm run compile`, then `node scripts/prepare-wallet-deployment.js`, start the frontend development server, and open `http://localhost:5173/deploy-factory.html` in the browser containing MetaMask. Connect to Sepolia, approve a factory deployment using test ETH, and record its address, transaction hash and block number. This generated helper is local only and is excluded from Git.

Sepolia is the testnet recommended in the assignment. To run there, obtain a Sepolia RPC URL and use a separate test wallet with test ETH. Create the root `.env` using the variable names in `.env.example` and replace all placeholders before running:

```bash
npm run deploy:sepolia
```

Configure the backend with the same RPC URL, factory address and actual deployment block. Set the frontend's `VITE_CHAIN_ID=0xaa36a7`, `VITE_NETWORK_NAME=Sepolia Testnet`, `VITE_RPC_URL`, `VITE_FACTORY_ADDRESS` and `VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io`; then restart the frontend. `ETHERSCAN_API_KEY` enables the deployment script's verification attempt. Treat verification as successful only if the command reports success. No public deployment is included in the present evidence.

Never put a private key in a `VITE_` variable, frontend code, screenshots, or a submitted source archive. Only the root deployment configuration uses `PRIVATE_KEY`; user transactions are signed by the user's wallet.

## Verification and evidence

The real, uninstrumented Hardhat suite contains **45 passing tests** covering valid and invalid campaign creation, registry indexes, contribution accounting, deadlines, permissions, successful withdrawal, failed-campaign refunds, repeated refund prevention, update validation, reentrancy attempts, and transfer failure rollback/retry.

Representative transaction gas, measured with compiler 0.8.26 and optimizer 200:

| Operation | Gas used |
| --- | ---: |
| Factory deployment | 2,582,580 |
| Campaign creation | 1,736,214 |
| First contribution | 165,308 |
| Repeat contribution | 49,896 |
| Creator update | 93,526 |
| Creator withdrawal | 63,673 |
| Contributor refund | 70,119 |

Gas varies with inputs and contract state. These values are local transaction gas measurements, not a public-network fee quote. The full command output is included in the submission's `evidence/contract-tests.txt`. `contracts/test/PaymentReceiver.sol` is an adversarial test fixture and is not deployed by the application deployment script.

Backend checks run from `backend` with `npm test`; the submitted backend suite has 15 passing checks. Frontend checks run from `frontend` with `npm run lint` and `npm run build`; both completed successfully, with zero lint warnings. The production bundle emitted a size warning at approximately 696.58 kB minified (215.37 kB gzip), which remains a performance limitation. The submitted evidence records the checks that were actually performed; the source archive does not claim that a clean internet-connected installation was tested.

The `scripts/prepare-evidence.js` utility seeds a **fresh, isolated** Hardhat chain with example active, successful and failed campaigns. Its default RPC is `http://127.0.0.1:18545`, and it refuses a chain whose block number is not zero. It uses unlocked local test accounts and local time control. Do not use it on an existing application chain. Its receipts and screenshots describe the automated local run; the separate manual MetaMask run is documented in `evidence/metamask-verification.json` and screenshots `09`–`14`. Neither run establishes public-chain deployment.

## Useful API endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API health and blockchain synchronization state |
| `GET /api/projects` | Cached campaigns and filters |
| `GET /api/projects/:address` | Campaign detail |
| `GET /api/projects/:address/transactions` | Confirmed on-chain event history |
| `GET /api/projects/:address/contributions` | Contribution event records |
| `GET /api/projects/:address/updates` | Creator updates |
| `GET /api/projects/:address/stats` | Campaign statistics |
| `POST /api/projects/:address/sync` | Refresh one registered campaign |
| `POST /api/sync/all` | Refresh the factory registry and its campaigns |

The SQLite database is a cache; contract state and transaction receipts are authoritative. The backend rebuilds history from event logs, listens for new events and periodically refreshes time-dependent statuses. On a local chain reset, redeploy the contracts, update both environment files, and restart the backend/frontend. Browser-local transaction history can still contain receipts from an earlier chain session.

## Source layout and submission

```text
contracts/                 Production contracts and a security test fixture
test/                      Hardhat tests
scripts/deploy.js          Local/Sepolia deployment
scripts/prepare-evidence.js Local evidence preparation
hardhat.config.js          Offline compiler and network configuration
backend/                   Express API, blockchain sync, models, validation and tests
frontend/src/              React pages, wallet state, validation and contract ABIs
package-lock.json          Contract dependency lockfile
backend/package-lock.json  Backend dependency lockfile
frontend/package-lock.json Frontend dependency lockfile
```

The submission contains `SC6113_Final_Report.pdf`, `source_code.zip`, `screenshots.zip`, the combined `113_submission.zip`, and supporting execution evidence. The source archive excludes `.env`, `node_modules` and the pre-existing user database. `sample-data/evidence.sqlite` is a snapshot from the new local evidence run, not a live ledger. A fresh chain must be deployed and synchronized; the snapshot cannot recreate blockchain state. The latest assignment requirements explicitly state that no video recording is needed.

The complete assignment text allows Flask **or** Node.js, and this implementation uses Node.js. The course portal's separate inline submission text mentions **python flask** and a **render link**. The Flask wording requires clarification with the instructor; no Flask backend is included. A public Render deployment link is still missing and must be completed if that portal requirement applies. The current local application URL is not a public deployment link.

## Limitations

This is a course prototype without an independent security audit, emergency pause, upgrade mechanism or milestone-based spending controls. Contract authorization protects who can withdraw, but cannot prove that a creator spends funds as promised. Wallet addresses, amounts, campaign text and updates are public on the blockchain. String limits are measured in UTF-8 bytes, and categories are required to be nonempty rather than restricted to the suggested list. Full-array reads and on-chain text become costly at scale. API sync endpoints need additional access control and rate limits before public operation; the SQLite cache and browser-local history are not independent financial ledgers.

License: MIT, as declared in the package metadata.
