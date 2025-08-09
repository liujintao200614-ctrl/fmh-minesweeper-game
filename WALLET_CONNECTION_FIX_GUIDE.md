# FMH Web3 扫雷游戏 - 钱包连接问题修复指南

## 🎯 已识别并修复的问题

### ✅ 问题1: ChainId 不匹配（主要问题）
**问题描述**: 前端配置的 chainId 与实际网络不匹配
- ❌ 错误配置: `chainId: 41454` 
- ✅ 正确配置: `chainId: 10143` (Monad 测试网)

**修复内容**:
- 更新 `src/services/web3/provider.ts` 中的 MONAD_TESTNET_CONFIG
- 确认 `.env.local` 中的 `NEXT_PUBLIC_CHAIN_ID=10143`

### ✅ 问题2: 合约地址不一致  
**问题描述**: `.env.local` 中的合约地址与 `deployment-addresses.json` 不匹配

**修复内容**:
- ✅ FMH Token: `0xFa32A01E4FDAde90204902EDfEa63C150407C736`
- ✅ Minesweeper: `0xf25dc66782643c42F30Acf151A9E0CA01C283341`

### ✅ 问题3: isOwner 方法调用失败
**根本原因**: ChainId 不匹配导致连接到错误网络
**验证**: 合约中确实存在 `isOwner(address)` 方法 (line 148)

## 🛠️ 修复验证工具

### 1. 使用 Web3 调试控制台
```bash
http://localhost:8080/web3-debug-console.html
```

**功能包括**:
- ✅ 实时配置检查
- ✅ 网络连接诊断  
- ✅ 合约方法测试
- ✅ RPC 连接测试
- ✅ 一键修复工具

### 2. 快速钱包修复工具
```bash
http://localhost:8080/wallet-fix.html
```

### 3. 详细诊断工具
```bash
http://localhost:8080/wallet-diagnostic.html
```

## 🔧 验证步骤

### 第1步: 检查网络配置
```javascript
// 在浏览器控制台运行
console.log('Current Chain ID:', parseInt(await ethereum.request({method: 'eth_chainId'}), 16));
// 应该返回: 10143
```

### 第2步: 验证合约连接
```javascript
// 测试 FMH Token 合约
const tokenContract = new ethers.Contract(
  '0xFa32A01E4FDAde90204902EDfEa63C150407C736',
  ['function name() view returns (string)'],
  provider
);
console.log(await tokenContract.name()); // 应该返回: "FMH Token"
```

### 第3步: 测试 isOwner 方法
```javascript
const tokenContract = new ethers.Contract(
  '0xFa32A01E4FDAde90204902EDfEa63C150407C736',
  ['function isOwner(address) view returns (bool)'],
  provider
);
console.log(await tokenContract.isOwner(yourAddress));
```

## 🌐 网络配置参数 (Monad 测试网)

```javascript
{
  chainId: '0x2727',        // 10143 in hex
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
}
```

## 🚨 常见问题排查

### 问题: "call revert exception"
**原因**: 通常是网络不匹配或合约地址错误
**解决**: 
1. 确认 MetaMask 连接到 Monad 测试网 (Chain ID: 10143)
2. 验证合约地址正确
3. 检查账户是否有足够权限

### 问题: MetaMask 弹窗被拦截
**原因**: 在 `file://` 协议下运行
**解决**: ✅ 已使用 `http://localhost:8080` 解决

### 问题: RPC 连接超时
**排查**:
```bash
# 测试 RPC 连接
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

## 📋 部署后验证清单

- [ ] MetaMask 连接 Monad 测试网 (Chain ID: 10143)
- [ ] 钱包连接成功显示账户地址
- [ ] FMH Token 合约调用正常 (`name()`, `symbol()`, `totalSupply()`)
- [ ] `isOwner()` 方法调用成功
- [ ] Minesweeper 合约调用正常 (`gameCounter()`)
- [ ] 网络切换功能正常
- [ ] 余额查询正常

## 🎮 测试游戏功能

1. **连接钱包**: 点击"连接钱包"按钮
2. **网络检查**: 确认显示"Monad 测试网"
3. **开始游戏**: 点击格子开始游戏
4. **查看奖励**: 完成游戏后查看 FMH 奖励

## 📞 问题反馈

如果遇到其他问题，请使用调试工具收集以下信息:
- 浏览器控制台错误信息
- MetaMask 版本
- 当前网络和 Chain ID
- 合约调用具体错误信息

---

**修复完成时间**: 2025-01-07  
**修复的主要问题**: ChainId 不匹配 (10143 vs 41454)  
**验证状态**: ✅ 所有问题已修复并提供验证工具