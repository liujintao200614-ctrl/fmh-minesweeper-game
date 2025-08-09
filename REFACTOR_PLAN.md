# 扫雷游戏前端重构计划

## 新目录结构

```
src/
├── components/           # UI组件层 (最多8个文件夹)
│   ├── ui/              # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBoundary.tsx
│   ├── game/            # 游戏相关组件
│   │   ├── GameBoard/
│   │   │   ├── index.tsx        # 主游戏板组件
│   │   │   ├── Cell.tsx         # 单元格组件
│   │   │   ├── MineCounter.tsx  # 地雷计数器
│   │   │   └── GameTimer.tsx    # 游戏计时器
│   │   └── GameControls/
│   │       ├── index.tsx        # 游戏控制面板
│   │       ├── DifficultySelect.tsx
│   │       └── GameActions.tsx
│   ├── wallet/          # 钱包相关组件
│   │   ├── WalletConnect.tsx
│   │   ├── WalletStatus.tsx
│   │   └── WalletErrorHelper.tsx
│   ├── network/         # 网络相关组件
│   │   ├── NetworkStatus.tsx
│   │   ├── NetworkGuide.tsx
│   │   └── NetworkDiagnostic.tsx
│   ├── leaderboard/     # 排行榜组件
│   │   ├── index.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── PlayerStats.tsx
│   └── layout/          # 布局组件
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── GameLayout.tsx
│
├── hooks/               # React hooks (最多8个文件)
│   ├── useWeb3.ts              # 统一的Web3 hook
│   ├── useGameContract.ts      # 游戏合约交互
│   ├── useGameState.ts         # 游戏状态管理
│   ├── useUserProfile.ts       # 用户档案
│   ├── useGameHistory.ts       # 游戏历史
│   ├── useLeaderboard.ts       # 排行榜数据
│   ├── useNetworkStatus.ts     # 网络状态
│   └── useLocalStorage.ts      # 本地存储
│
├── services/            # 业务逻辑层 (最多8个文件)
│   ├── web3/
│   │   ├── provider.ts         # Web3 provider管理
│   │   ├── contracts.ts        # 合约实例管理
│   │   └── transactions.ts     # 交易处理
│   ├── game/
│   │   ├── gameEngine.ts       # 游戏引擎核心逻辑
│   │   ├── gameValidator.ts    # 游戏验证逻辑
│   │   └── scoreCalculator.ts  # 积分计算
│   ├── api/
│   │   ├── client.ts           # API客户端
│   │   ├── endpoints.ts        # API端点定义
│   │   └── types.ts            # API类型定义
│   └── storage/
│       ├── gameStorage.ts      # 游戏数据存储
│       └── userStorage.ts      # 用户数据存储
│
├── store/               # 状态管理 (最多8个文件)
│   ├── index.ts                # Store根配置
│   ├── gameSlice.ts            # 游戏状态切片
│   ├── userSlice.ts            # 用户状态切片
│   ├── web3Slice.ts            # Web3状态切片
│   ├── networkSlice.ts         # 网络状态切片
│   ├── leaderboardSlice.ts     # 排行榜状态切片
│   ├── settingsSlice.ts        # 设置状态切片
│   └── middleware.ts           # 中间件
│
├── types/               # 类型定义 (最多8个文件)
│   ├── game.ts                 # 游戏相关类型
│   ├── user.ts                 # 用户相关类型
│   ├── web3.ts                 # Web3相关类型
│   ├── network.ts              # 网络相关类型
│   ├── api.ts                  # API相关类型
│   ├── contract.ts             # 合约相关类型
│   ├── storage.ts              # 存储相关类型
│   └── common.ts               # 通用类型
│
├── utils/               # 工具函数 (最多8个文件)
│   ├── constants.ts            # 常量定义
│   ├── helpers.ts              # 通用帮助函数
│   ├── formatters.ts           # 格式化函数
│   ├── validators.ts           # 验证函数
│   ├── errorHandler.ts         # 错误处理
│   ├── performance.ts          # 性能优化工具
│   ├── network.ts              # 网络工具
│   └── metamask.ts             # MetaMask工具
│
└── styles/              # 样式文件 (最多8个文件)
    ├── globals.css             # 全局样式
    ├── variables.css           # CSS变量
    ├── components.css          # 组件样式
    ├── game.css                # 游戏样式
    ├── wallet.css              # 钱包样式
    ├── responsive.css          # 响应式样式
    └── themes/
        ├── light.css
        └── dark.css
```

## 重构原则

1. **单一职责**：每个文件只负责一个功能
2. **松耦合**：降低模块间依赖
3. **高内聚**：相关功能组织在一起
4. **可复用**：组件和工具函数可重复使用
5. **可测试**：便于编写单元测试

## 代码坏味道消除

1. **大类拆分**：将大文件拆分为多个小文件
2. **冗余消除**：合并重复的useWeb3 hooks
3. **依赖整理**：明确模块间依赖关系
4. **状态集中**：使用集中式状态管理
5. **类型统一**：统一类型定义和使用

## 文件大小限制

- 每个文件不超过200行代码
- 复杂组件拆分为子组件
- 长函数拆分为多个小函数
- 使用组合模式而非继承