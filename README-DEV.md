# 🔧 FMH开发环境使用指南

解决 `file://` 协议下MetaMask弹窗被拦截的问题，提供完整的本地开发服务器环境。

## 🚀 快速启动

### 方法1: Python脚本 (推荐)
```bash
# 进入项目目录
cd /Users/liujintao/fmh-minesweeper-game

# 启动开发服务器
python3 start-dev-server.py
```

### 方法2: Shell脚本
```bash
# 启动开发服务器
./start-dev-server.sh
```

### 方法3: NPM命令
```bash
# 启动开发服务器
npm run dev
# 或
npm start
```

### 方法4: Live Server (需要安装)
```bash
# 安装live-server
npm install

# 启动live-server
npm run live-server
```

## ✅ 解决的问题

### 🚫 **原问题**
- 使用 `file://protocol` 打开HTML文件
- MetaMask弹窗被浏览器拦截
- 连接请求超时，无法正常测试

### ✅ **现解决方案**
- 使用 `http://localhost:8080` 本地服务器
- MetaMask弹窗正常显示
- 完整支持钱包连接和交互流程

## 📁 项目结构

```
fmh-minesweeper-game/
├── FMH-Management-Panel.html          # 主管理面板
├── FMH-Connection-Diagnostic.html     # 连接诊断工具
├── start-dev-server.py               # Python开发服务器
├── start-dev-server.sh               # Shell开发服务器
├── package.json                      # NPM配置
└── README-DEV.md                     # 开发指南
```

## 🌐 访问地址

启动服务器后，可以访问：

- **主页**: http://localhost:8080
- **管理面板**: http://localhost:8080/FMH-Management-Panel.html
- **诊断工具**: http://localhost:8080/FMH-Connection-Diagnostic.html

## 🔧 开发流程

1. **启动服务器**
   ```bash
   python3 start-dev-server.py
   ```

2. **自动打开浏览器**
   - 服务器会自动打开默认浏览器
   - 直接访问管理面板页面

3. **正常连接MetaMask**
   - 点击"连接MetaMask钱包"按钮
   - MetaMask弹窗正常显示
   - 完成授权和网络切换

4. **热重载开发**
   - 修改HTML文件
   - 刷新浏览器即可看到更新
   - 无需重启服务器

5. **停止服务器**
   - 按 `Ctrl+C` 停止服务器

## ⚙️ 配置选项

### 端口设置
- 默认端口: `8080`
- 自动查找可用端口
- 如果8080被占用，会自动使用8081, 8082等

### 自定义启动
```bash
# 指定端口启动
python3 -m http.server 8081

# 使用不同主机
python3 -m http.server 8080 --bind 0.0.0.0
```

## 🔒 安全特性

- **CORS头部**: 支持跨域请求
- **安全头部**: 防止XSS和点击劫持
- **本地访问**: 只监听localhost，确保安全

## 🐛 故障排除

### 问题1: Python未找到
```bash
# 检查Python版本
python3 --version

# macOS安装Python3
brew install python3
```

### 问题2: 端口被占用
```bash
# 查看端口占用
lsof -i :8080

# 杀死占用进程
kill -9 <PID>
```

### 问题3: 权限问题
```bash
# 给脚本执行权限
chmod +x start-dev-server.sh
chmod +x start-dev-server.py
```

### 问题4: MetaMask仍然不弹窗
1. 确保使用 `http://localhost:8080` 访问（不是file://）
2. 检查浏览器弹窗设置
3. 重启MetaMask扩展
4. 清除浏览器缓存

## 📊 性能优化

### 缓存策略
- HTML文件不缓存，支持热重载
- 静态资源合理缓存

### 开发建议
- 使用浏览器开发者工具调试
- 启用Console查看详细日志
- 使用Network面板监控请求

## 🔗 相关链接

- **MetaMask开发者文档**: https://docs.metamask.io/
- **Ethereum Web3文档**: https://web3js.readthedocs.io/
- **Ethers.js文档**: https://docs.ethers.io/

## 💡 最佳实践

1. **总是使用本地服务器进行Web3开发**
2. **保持MetaMask和浏览器更新**
3. **使用HTTPS（生产环境）**
4. **添加适当的错误处理**
5. **测试不同浏览器兼容性**

---

🎯 **现在你可以在 `http://localhost:8080` 下正常调试FMH管理面板了！**