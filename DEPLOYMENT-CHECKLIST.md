# 🚀 生产环境部署检查清单

## ⚠️ 部署前必须完成的项目

### 🔒 安全配置
- [ ] 已从代码库中移除所有真实私钥
- [ ] 已设置生产环境的环境变量
- [ ] PRIVATE_KEY 和 SERVER_PRIVATE_KEY 使用不同的密钥
- [ ] NEXTAUTH_URL 已更新为生产域名
- [ ] 已运行 `node scripts/production-check.js` 检查
- [ ] 已阅读 DEPLOYMENT-SECURITY.md

### 🌐 网络配置
- [ ] Monad测试网配置正确 (Chain ID: 10143)
- [ ] 合约地址已部署并验证
- [ ] RPC端点可访问
- [ ] 域名DNS已配置
- [ ] SSL证书已安装

### 🏗️ 构建配置
- [ ] `npm run build` 成功执行
- [ ] `npm run compile` 智能合约编译成功
- [ ] 数据库架构已初始化
- [ ] 生产环境依赖已安装

### 🐳 容器化部署 (可选)
- [ ] Docker镜像构建成功
- [ ] 容器环境变量配置正确
- [ ] 持久化存储配置正确
- [ ] 网络配置正确

## 🚀 部署方式选择

### 方式1: Vercel部署 (推荐)
```bash
# 1. 在Vercel后台设置环境变量
PRIVATE_KEY=your_production_key
SERVER_PRIVATE_KEY=your_server_key
NEXTAUTH_URL=https://yourapp.vercel.app

# 2. 部署
vercel --prod
```

### 方式2: 传统服务器部署
```bash
# 1. 设置环境变量
export NODE_ENV=production
export PRIVATE_KEY="your_production_key"
export SERVER_PRIVATE_KEY="your_server_key"
export NEXTAUTH_URL="https://yourdomain.com"

# 2. 执行部署脚本
./deploy-production.sh
```

### 方式3: Docker部署
```bash
# 1. 构建镜像
docker build -t minesweeper-game .

# 2. 运行容器
docker run -d \
  -p 3000:3000 \
  -e PRIVATE_KEY="your_production_key" \
  -e SERVER_PRIVATE_KEY="your_server_key" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  -v $(pwd)/database:/app/database \
  minesweeper-game
```

## 🔍 部署后验证

### 基础功能测试
- [ ] 网站可正常访问
- [ ] MetaMask钱包可连接
- [ ] 网络自动切换到Monad测试网
- [ ] 游戏可正常开始
- [ ] 游戏可正常完成
- [ ] 奖励可正常领取

### 性能测试
- [ ] 页面加载速度 < 3秒
- [ ] 游戏响应速度正常
- [ ] 数据库查询性能正常
- [ ] 内存使用合理

### 安全测试
- [ ] HTTPS正常工作
- [ ] 安全头部已设置
- [ ] 私钥未在前端暴露
- [ ] API端点访问控制正确

## 🚨 紧急回滚计划

如果部署出现问题：

1. **立即停止服务**
   ```bash
   # Vercel
   vercel --prod --no-wait
   
   # 传统服务器
   pm2 stop all
   
   # Docker
   docker stop container_id
   ```

2. **回滚到上一版本**
   ```bash
   # Git回滚
   git revert HEAD
   git push origin main
   
   # 重新部署
   ./deploy-production.sh
   ```

3. **检查和修复**
   - 检查日志文件
   - 确认数据库状态
   - 验证环境配置
   - 测试基础功能

## 📊 监控设置

部署后建议设置以下监控：

- [ ] 服务器状态监控
- [ ] 应用性能监控 (APM)
- [ ] 错误日志监控
- [ ] 数据库性能监控
- [ ] 区块链交易监控

## 📞 支持联系方式

- 技术支持: [联系方式]
- 紧急联系: [联系方式]
- 文档地址: [文档链接]

---

✅ **当所有项目都完成后，您的扫雷游戏就可以安全地部署到生产环境了！**