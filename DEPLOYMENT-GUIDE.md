# 🚀 FMH Minesweeper 部署指南

## 📋 部署前检查清单

### ✅ 环境要求
- [x] Node.js 18+
- [x] npm 或 yarn
- [ ] 服务器私钥配置
- [ ] Monad 测试网 MON 代币（用于 Gas 费用）

### ✅ 账户准备
1. **部署账户**: 用于部署合约
2. **服务器账户**: 用于后端自动处理奖励（需要不同的私钥）

---

## 🔧 第一步：环境配置

### 1. 安装依赖
```bash
cd /Users/liujintao/扫雷游戏2.0
npm install
```

### 2. 配置环境变量
你需要在 `.env.local` 中设置 `SERVER_PRIVATE_KEY`：

```bash
# 生成新的服务器私钥（与部署私钥不同）
# 可以使用 MetaMask 创建新账户或使用以下命令生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 获取 MON 测试代币
- 访问 Monad 测试网水龙头获取 MON 代币
- 确保部署账户和服务器账户都有足够的 MON

---

## 🏗 第二步：智能合约部署

### 1. 编译合约
```bash
npm run compile
```

### 2. 部署合约
```bash
npm run deploy
```

### 3. 更新合约地址
部署成功后，更新 `.env.local` 中的合约地址：
```env
NEXT_PUBLIC_MINESWEEPER_CONTRACT=新部署的游戏合约地址
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=新部署的代币合约地址
```

---

## 🌐 第三步：前端部署

### 本地测试部署
```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
```

### Vercel 部署（推荐）
1. 将项目推送到 GitHub
2. 在 Vercel 中连接仓库
3. 配置环境变量
4. 自动部署

### 环境变量配置（Vercel）
在 Vercel 项目设置中添加：
```
PRIVATE_KEY=你的部署私钥
SERVER_PRIVATE_KEY=你的服务器私钥
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXTAUTH_URL=https://yourdomain.vercel.app
NEXT_PUBLIC_MINESWEEPER_CONTRACT=合约地址
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=代币合约地址
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_NETWORK_NAME=Monad Testnet
```

---

## 🔐 第四步：安全配置

### 1. 私钥安全
- ✅ 使用不同的私钥用于部署和服务器运行
- ✅ 绝不在代码中硬编码私钥
- ✅ 生产环境使用全新的私钥对

### 2. 权限配置
```bash
# 设置 FMH Token 的游戏合约权限
# 这需要在合约部署后手动执行
```

---

## 🧪 第五步：测试部署

### 1. 功能测试
- [ ] 连接 MetaMask 钱包
- [ ] 开始新游戏
- [ ] 完成游戏获得奖励
- [ ] 查看排行榜
- [ ] 检查 FMH 代币余额

### 2. 安全测试
- [ ] 尝试作弊（应该被后端验证拦截）
- [ ] 测试 API 速率限制
- [ ] 验证签名机制

---

## 📊 监控和维护

### 1. 日志监控
- 监控 API 调用频率
- 检查错误日志
- 监控合约交互

### 2. 账户监控
```bash
# 检查服务器账户余额
# 当余额低于阈值时需要补充
```

### 3. 数据库备份
```bash
# 如果使用持久化数据库，定期备份游戏记录
```

---

## 🚨 故障排除

### 常见问题

#### 1. 合约部署失败
```bash
Error: insufficient funds for gas
```
**解决**: 确保部署账户有足够的 MON 代币

#### 2. 前端连接失败
```bash
Error: Contract address not configured
```
**解决**: 检查环境变量中的合约地址配置

#### 3. 奖励发放失败
```bash
Error: SERVER_PRIVATE_KEY not configured
```
**解决**: 确保服务器私钥正确配置

#### 4. MetaMask 网络问题
**解决**: 确保 MetaMask 已添加 Monad 测试网络

---

## 🎯 部署检查清单

### 部署前
- [ ] 依赖安装完成
- [ ] 环境变量配置正确
- [ ] 账户有足够 MON 代币
- [ ] 代码已通过测试

### 部署中
- [ ] 合约编译成功
- [ ] 合约部署成功
- [ ] 前端构建成功
- [ ] 环境变量更新

### 部署后
- [ ] 功能测试通过
- [ ] 安全测试通过  
- [ ] 监控系统正常
- [ ] 文档更新完成

---

## 📞 技术支持

如遇到部署问题：
1. 检查错误日志
2. 验证环境配置
3. 参考故障排除指南
4. 联系开发团队

**部署成功后，你的 FMH Minesweeper 就可以正式运行了！** 🎉