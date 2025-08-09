# FMH扫雷游戏 - 本地部署指南

## 🚀 快速开始

### 系统要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### 一键启动
```bash
# 默认端口3001
./start-local-dev.sh

# 指定端口
./start-local-dev.sh 3005
```

### 端口说明
- **默认端口**: 3001 (避免与其他服务冲突)
- **自动检测**: 脚本会自动检测端口占用并选择可用端口
- **手动指定**: 可通过参数指定特定端口

## 📋 详细部署步骤

### 1. 环境准备
```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version
```

### 2. 安装依赖
```bash
npm install --legacy-peer-deps
```

### 3. 环境变量配置
项目已包含 `.env.local` 文件，包含以下配置：
```env
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_MINESWEEPER_CONTRACT=0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=0x83aB028468ef2a5495Cc7964B3266437956231E2
```

### 4. 数据库初始化
```bash
npm run db:init
```

### 5. 启动开发服务器
```bash
npm run dev:next
```

## 🌐 访问应用

- **主页面**: http://localhost:3001 (或启动时显示的端口)
- **开发服务器**: Next.js (默认端口3001，可自定义)
- **数据库**: SQLite (`database/minesweeper.db`)

## 🎮 功能特性

### 已实现功能
- ✅ 扫雷游戏核心逻辑
- ✅ Web3钱包连接 (MetaMask)
- ✅ 成就系统 (19个成就)
- ✅ 用户统计和排行榜
- ✅ 代币奖励系统
- ✅ 移动端适配
- ✅ 反作弊检测
- ✅ 数据库持久化

### Web3功能
- **网络**: Monad 测试网
- **钱包支持**: MetaMask
- **智能合约**: 游戏合约 + FMH代币合约
- **奖励机制**: 完成游戏获得FMH代币

## 🛠️ 开发命令

```bash
# 开发相关
npm run dev:next        # 启动Next.js开发服务器
npm run build:next      # 构建Next.js项目
npm run start          # 启动生产服务器

# 数据库相关  
npm run db:init        # 初始化数据库

# 智能合约相关
npm run hardhat:compile  # 编译智能合约
npm run hardhat:deploy   # 部署智能合约

# 代码质量
npm run lint           # ESLint检查
npm run clean          # 清理构建文件
```

## 📁 项目结构

```
fmh-minesweeper-game/
├── pages/              # Next.js页面
│   ├── index.tsx      # 主游戏页面
│   ├── _app.tsx       # 应用入口
│   └── api/           # API路由
├── src/                # 源代码
│   ├── components/    # React组件
│   ├── hooks/         # 自定义Hooks
│   ├── utils/         # 工具函数
│   └── types/         # TypeScript类型
├── contracts/          # 智能合约
│   ├── FMHToken.sol   # FMH代币合约
│   └── MinesweeperGame.sol # 游戏合约
├── database/          # 数据库
│   ├── schema.sql     # 数据库结构
│   └── minesweeper.db # SQLite数据库文件
├── lib/               # 后端逻辑库
└── scripts/           # 脚本文件
```

## 🎯 成就系统

项目包含19个预设成就：

### 基础成就 (1⭐)
- 初战告捷: 完成第一次游戏胜利

### 进阶成就 (2⭐) 
- 小有成就: 累计获得10次胜利
- 千分达人: 单局得分达到1000分  
- 闪电速度: 30秒内完成游戏
- 连胜开始: 连续获得3次胜利
- 简单模式大师: 在简单模式获得50次胜利

### 高级成就 (3⭐)
- 百战不殆: 累计获得100次胜利
- 高分玩家: 单局得分达到5000分
- 超音速: 15秒内完成游戏
- 连胜达人: 连续获得10次胜利  
- 中等模式大师: 在中等模式获得50次胜利
- 完美游戏: 在60秒内完成高分游戏
- 无旗胜利: 不使用任何旗帜完成游戏
- 代币收集者: 累计获得1000 FMH代币

### 传奇成就 (4⭐)
- 扫雷大师: 累计获得1000次胜利
- 分数之王: 单局得分达到10000分
- 光速扫雷: 10秒内完成游戏
- 不败传说: 连续获得25次胜利
- 困难模式大师: 在困难模式获得50次胜利

## 🔧 故障排除

### 常见问题

1. **端口占用**
```bash
# 查看端口占用
lsof -i :3000
# 终止进程
kill -9 PID
```

2. **依赖安装失败**
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

3. **数据库问题**
```bash
# 重新初始化数据库
rm database/minesweeper.db
npm run db:init
```

4. **Web3连接问题**
- 确保安装了MetaMask浏览器扩展
- 切换到Monad测试网络
- 检查网络连接

## 📞 支持

如遇到问题，请检查：
1. Node.js和npm版本是否符合要求
2. 网络连接是否正常
3. 防火墙是否阻止了3000端口
4. 浏览器是否支持Web3功能

---

🎮 享受扫雷游戏，赢取FMH代币！