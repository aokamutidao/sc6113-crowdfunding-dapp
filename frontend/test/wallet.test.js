import test from 'node:test';
import assert from 'node:assert/strict';
import { readWalletSession } from '../src/utils/walletSession.js';
const account = '0x0000000000000000000000000000000000000001';

test('an offline wrong network still exposes the account and switch target without reading its balance', async () => {
  const methods = [];
  const wallet = { request: async ({ method }) => {
    methods.push(method);
    if (method === 'eth_chainId') return '0x7a69';
    throw new Error('Old local RPC is offline');
  } };
  const session = await readWalletSession(wallet, [account], '0xaa36a7');
  assert.equal(session.account, account);
  assert.equal(session.chainId, '31337');
  assert.equal(session.signer, null);
  assert.equal(session.balance, null);
  assert.deepEqual(methods, ['eth_chainId']);
  session.provider.destroy();
});
test('an authorized Sepolia account receives the correct signer and exact balance', async () => {
  const wallet = { request: async ({ method }) => {
    if (method === 'eth_chainId') return '0xaa36a7';
    if (method === 'eth_accounts') return [account];
    if (method === 'eth_getBalance') return '0xde0b6b3a7640000';
    throw new Error(method);
  } };
  const session = await readWalletSession(wallet, [account], '0xaa36a7');
  assert.equal(await session.signer.getAddress(), account);
  assert.equal(session.balance, '1.0');
  assert.equal(session.balanceError, null);
  session.provider.destroy();
});
test('a failed balance read preserves the authorized signer instead of disconnecting', async () => {
  const wallet = { request: async ({ method }) => {
    if (method === 'eth_chainId') return '0xaa36a7';
    if (method === 'eth_accounts') return [account];
    throw { code: -32603, message: 'RPC unavailable' };
  } };
  const session = await readWalletSession(wallet, [account], '0xaa36a7');
  assert.equal(session.account, account);
  assert.ok(session.signer);
  assert.equal(session.balance, null);
  assert.match(session.balanceError, /RPC/);
  session.provider.destroy();
});
test('an empty account list is disconnected without requesting network state', async () => {
  const wallet = { request: async () => { throw new Error('Unexpected request'); } };
  assert.equal(await readWalletSession(wallet, [], '0xaa36a7'), null);
});
