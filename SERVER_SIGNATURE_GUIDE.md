# Server Signature System - 部署和使用指南

## 🎯 系统概览

新的服务器签名系统通过以下方式优化用户体验：

1. **用户体验优化**: 玩家只需连接钱包一次，游戏过程中无需频繁签名
2. **安全性保障**: 使用 EIP-712 标准签名 + 防重放攻击机制
3. **后端验证**: 服务器验证游戏结果防止作弊
4. **一键领奖**: 游戏胜利后一键交易完成奖励领取

## 🔧 系统架构

```
1. 玩家开始游戏 → 前端本地游戏
2. 玩家获胜 → 前端调用 /api/claim
3. 服务器验证 → 生成 EIP-712 签名
4. 前端收到签名 → 调用合约 claimWithSignature()
5. 合约验证签名 → 铸造代币奖励
```

## 📋 部署步骤

### 1. 服务器配置

确保 `.env.local` 包含正确的服务器私钥：

```bash
# 服务器签名私钥（与部署私钥不同）
SERVER_PRIVATE_KEY=5827b4dbec1610beb68c920da0839b5d300f2dba8952b78f88556c7e8dbf1489
```

### 2. 获取服务器地址

```bash
node scripts/get-server-address.js
```

输出：
```
Server Address: 0x7aE370E427d908383b735de3cEdca06f69297538
```

### 3. 更新合约部署

修改合约部署脚本，在构造函数中传入服务器地址：

```javascript
// 部署脚本示例
const MinesweeperGame = await ethers.getContractFactory("MinesweeperGame");
const game = await MinesweeperGame.deploy(
    fmhTokenAddress,
    "0x7aE370E427d908383b735de3cEdca06f69297538"  // 服务器签名地址
);
```

### 4. 合约安全特性

- **ReentrancyGuard**: 防止重入攻击
- **EIP-712签名**: 标准化的类型化数据签名
- **Nonce机制**: 防止重放攻击
- **时间期限**: 签名有效期为10分钟
- **权限验证**: 只有正确的服务器签名才能通过验证

## 🔐 安全机制详解

### EIP-712 域和类型定义

```solidity
// 合约中的类型定义
bytes32 public constant DOMAIN_TYPEHASH = keccak256(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
);

bytes32 public constant CLAIM_TYPEHASH = keccak256(
    "Claim(address player,uint256 gameId,uint256 score,uint256 duration,uint256 nonce,uint256 deadline)"
);
```

### 防重放攻击

```solidity
// nonce 存储映射
mapping(address => mapping(uint256 => bool)) public usedNonces;

// 验证时检查 nonce
require(!usedNonces[player][nonce], "Nonce already used");
usedNonces[player][nonce] = true;
```

### 服务器端验证逻辑

```javascript
// 游戏结果合理性检查
function isValidGameResult(score, duration) {
    if (score > 10000) return false;        // 分数上限
    if (duration < 3) return false;         // 最短时间
    if (score / duration > 100) return false; // 效率上限
    return true;
}
```

## 🚀 API 使用方法

### 申请奖励签名

**POST** `/api/claim`

```json
{
    "player": "0x...",
    "gameId": 123,
    "score": 1500,
    "duration": 45
}
```

**响应:**
```json
{
    "success": true,
    "claimData": {
        "player": "0x...",
        "gameId": 123,
        "score": 1500,
        "duration": 45,
        "nonce": 1703123456789,
        "deadline": 1703124056
    },
    "serverSignature": "0x...",
    "estimatedReward": "80"
}
```

### 前端调用示例

```javascript
// 1. 获取服务器签名
const response = await fetch('/api/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        player: userAddress,
        gameId: gameId,
        score: finalScore,
        duration: timeElapsed
    })
});

const { claimData, serverSignature } = await response.json();

// 2. 调用合约
const tx = await contract.claimWithSignature(
    claimData.player,
    claimData.gameId,
    claimData.score,
    claimData.duration,
    claimData.nonce,
    claimData.deadline,
    serverSignature
);

await tx.wait();
```

## ⚠️ 重要安全注意事项

1. **私钥安全**: 服务器私钥绝对不能泄露，建议使用环境变量存储
2. **分离部署**: 服务器签名私钥应与合约部署私钥分离
3. **网络安全**: 生产环境应使用 HTTPS
4. **监控告警**: 建议对异常申请进行监控和告警
5. **定期轮换**: 定期更换服务器签名私钥

## 🔄 现有合约升级

如果你已经部署了旧版本合约，需要：

1. 部署新版本合约（包含服务器签名功能）
2. 迁移用户数据和代币余额
3. 更新前端合约地址配置
4. 测试完整流程后切换到新系统

## 🧪 测试清单

- [ ] 服务器签名生成正确
- [ ] 合约验证签名通过
- [ ] nonce 防重放机制生效  
- [ ] 签名过期机制生效
- [ ] 奖励计算正确
- [ ] 事件日志记录完整
- [ ] 前端界面更新正确

## 📞 故障排除

### 常见错误及解决方案

1. **"Invalid signature"**
   - 检查服务器私钥是否正确
   - 确认 EIP-712 域参数一致

2. **"Nonce already used"**
   - 正常的防重放保护，重新申请即可

3. **"Signature expired"**
   - 签名超过10分钟有效期，重新申请

4. **"Game not won"**
   - 只有获胜的游戏才能申请奖励

## 📈 性能优化建议

1. **缓存机制**: 对频繁查询的数据进行缓存
2. **批量处理**: 考虑批量签名减少服务器负载
3. **异步处理**: 将签名生成异步化提升响应速度
4. **错误重试**: 实现自动重试机制提升成功率

---

🎉 **系统已完成！用户现在可以享受无缝的Web3游戏体验！**