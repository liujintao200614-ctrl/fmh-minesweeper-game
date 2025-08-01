# 🔒 部署安全指南

⚠️ **在部署到公网之前，请务必阅读并执行以下安全措施！**

## 🚨 关键安全问题

### 1. 私钥安全 (Critical)
- ❌ **绝不能**将真实私钥提交到代码仓库
- ❌ **绝不能**在.env.local中使用生产私钥
- ✅ 使用环境变量或密钥管理服务
- ✅ 为不同环境使用不同的私钥

### 2. 环境变量配置

#### 开发环境 (.env.local)
```bash
PRIVATE_KEY=your_test_private_key
SERVER_PRIVATE_KEY=different_test_private_key
NEXTAUTH_URL=http://localhost:3000
```

#### 生产环境
```bash
PRIVATE_KEY=production_private_key_from_secure_storage
SERVER_PRIVATE_KEY=production_server_key_from_secure_storage
NEXTAUTH_URL=https://yourdomain.com
```

## 🛡️ 部署前检查清单

### [ ] 1. 私钥管理
- [ ] 从.env.local删除生产私钥
- [ ] 在服务器环境变量中设置私钥
- [ ] 确认deployment和server使用不同私钥
- [ ] 测试私钥权限（最小权限原则）

### [ ] 2. 域名和URL配置
- [ ] 更新NEXTAUTH_URL为生产域名
- [ ] 配置CORS设置
- [ ] 设置安全头部

### [ ] 3. 数据库安全
- [ ] 设置数据库访问权限
- [ ] 启用数据库备份
- [ ] 配置数据库连接加密

### [ ] 4. 网络安全
- [ ] 启用HTTPS
- [ ] 配置防火墙规则
- [ ] 设置速率限制

### [ ] 5. 代码安全
- [ ] 删除调试日志
- [ ] 移除开发工具
- [ ] 启用生产模式

## 🔧 推荐的部署方式

### 1. Vercel部署
```bash
# 1. 在Vercel中设置环境变量
PRIVATE_KEY=your_production_private_key
SERVER_PRIVATE_KEY=your_server_private_key
NEXTAUTH_URL=https://yourapp.vercel.app

# 2. 部署
vercel --prod
```

### 2. Docker部署
```dockerfile
# 使用环境变量，不要在镜像中包含密钥
ENV PRIVATE_KEY=${PRIVATE_KEY}
ENV SERVER_PRIVATE_KEY=${SERVER_PRIVATE_KEY}
```

### 3. 传统服务器部署
```bash
# 1. 设置系统环境变量
export PRIVATE_KEY="your_private_key"
export SERVER_PRIVATE_KEY="your_server_private_key"

# 2. 启动应用
npm run start
```

## 🚨 紧急安全措施

如果私钥意外泄露：

1. **立即停止所有服务**
2. **更换所有相关私钥**
3. **检查区块链上的异常交易**
4. **更新所有环境配置**
5. **重新部署应用**

## 🔍 安全监控

建议设置以下监控：

- 异常登录检测
- 大额代币转账警报
- API调用频率监控
- 错误日志监控

## 📞 安全联系方式

如发现安全问题，请立即联系：
- 技术负责人: [联系方式]
- 安全团队: [联系方式]

---

⚠️ **记住：安全是第一优先级！宁可多花时间确保安全，也不要冒险部署有漏洞的代码。**