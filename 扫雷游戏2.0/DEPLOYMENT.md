# 🚀 FMH 扫雷游戏部署指南

## 快速部署选项

### 方案1: Vercel 部署 (推荐)

1. **注册 Vercel 账号**: https://vercel.com
2. **连接 GitHub**:
   ```bash
   # 上传代码到 GitHub
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/fmh-minesweeper
   git push -u origin main
   ```

3. **Vercel 导入项目**:
   - 登录 Vercel 控制台
   - 点击 "Import Project"
   - 选择你的 GitHub 仓库
   - 自动部署完成

4. **获得公开链接**: `https://your-project.vercel.app`

### 方案2: Netlify 部署

1. **构建项目**:
   ```bash
   npm run build
   ```

2. **上传到 Netlify**:
   - 访问 https://netlify.com
   - 拖拽 `.next` 文件夹到 Netlify
   - 获得公开链接

### 方案3: GitHub Pages

1. **安装 gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **添加部署脚本**到 package.json:
   ```json
   {
     "scripts": {
       "export": "next build && next export",
       "deploy": "npm run export && gh-pages -d out"
     }
   }
   ```

3. **部署**:
   ```bash
   npm run deploy
   ```

## 合约地址配置

确保以下环境变量正确设置:

```bash
NEXT_PUBLIC_MINESWEEPER_CONTRACT=0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=0x83aB028468ef2a5495Cc7964B3266437956231E2
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_NETWORK_NAME=Monad Testnet
```

## 玩家使用指南

### 前置条件
- MetaMask 钱包
- Monad 测试网 MON 代币 (用于游戏费用)

### 游戏流程
1. 访问游戏链接
2. 连接 MetaMask 钱包
3. 切换到 Monad 测试网
4. 支付 0.001 MON 开始游戏
5. 胜利后领取 FMH 代币奖励

## 网络配置

玩家需要添加 Monad 测试网:
- 网络名称: Monad Testnet
- RPC URL: https://testnet-rpc.monad.xyz
- 链 ID: 10143
- 货币符号: MON
- 区块浏览器: https://testnet-explorer.monad.xyz

## 技术支持

如果遇到问题，请检查:
1. MetaMask 是否连接到正确网络
2. 是否有足够的 MON 代币支付费用
3. 浏览器是否支持 Web3

---

🎮 享受 Web3 扫雷游戏！