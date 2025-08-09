# FMH Minesweeper Game

A modern blockchain-based minesweeper game with beautiful UI and Web3 integration that rewards players with FMH tokens on the Monad testnet.

## 🎮 Features

- **Modern Responsive Design**: Beautiful gradient UI with responsive layout for all devices
- **Custom Color Themes**: Choose from 4 preset themes (Classic, Dark, Ocean, Forest)
- **Real-time Scoring**: Live score calculation with time and efficiency bonuses
- **Mine Revelation**: All mines are revealed at game end with special effects
- **FMH Token Rewards**: Earn FMH tokens for winning games with Web3 integration
- **Multiple Game Modes**: Web3 mode with rewards or Local mode for practice
- **Touch Optimized**: Advanced mobile controls with long-press flagging
- **Progressive Enhancement**: Works seamlessly across desktop and mobile

## 🧪 测试期奖励系统 (超值体验！)

- **游戏费用**: 仅 0.001 MON (降低1000倍!)
- **基础奖励**: 100 FMH (提升2倍)
- **完美游戏**: +200 FMH (<60秒 + 高分)
- **速度奖励**:
  - 超快速 <30秒: +100 FMH
  - 快速 <120秒: +50 FMH
- **单次最高**: 1000 FMH
- **每日上限**: 50000 FMH

> ⚡ **测试期特惠**：几乎零成本体验，超高代币奖励！

## Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- MON tokens for Monad testnet (for game fees)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fmh-minesweeper
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your private key to `.env.local` for contract deployment:
```
PRIVATE_KEY=your_private_key_here
```

## Contract Deployment

1. Compile contracts:
```bash
npm run compile
```

2. Deploy to Monad testnet:
```bash
npm run deploy
```

3. Update contract addresses in `src/hooks/useGameContract.ts` with the deployed addresses from `deployment-addresses.json`.

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Connect your MetaMask wallet and switch to Monad testnet

4. Start playing and earning FMH tokens!

## Project Structure

```
├── contracts/               # Solidity smart contracts
│   ├── FMHToken.sol        # ERC20 token contract
│   └── MinesweeperGame.sol # Game logic contract
├── src/
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Game logic utilities
├── pages/                 # Next.js pages
├── scripts/               # Deployment scripts
└── hardhat.config.js      # Hardhat configuration
```

## Smart Contracts

### FMHToken.sol
- ERC20 token implementation
- Mintable by the game contract
- Symbol: FMH, Decimals: 18

### MinesweeperGame.sol
- Handles game lifecycle (start, complete, claim rewards)
- Validates game results
- Distributes FMH token rewards
- Tracks player statistics

## Game Rules

1. Click cells to reveal them
2. Numbers indicate adjacent mines
3. Right-click to flag suspected mines
4. Win by revealing all non-mine cells
5. Lose by clicking a mine
6. Connect wallet and pay game fee to earn token rewards

## Network Configuration

**Monad Testnet**:
- Chain ID: 41454
- RPC: https://testnet-rpc.monad.xyz
- Explorer: https://testnet-explorer.monad.xyz

## Development

To add the Monad testnet to MetaMask:
1. Open MetaMask
2. Go to Settings > Networks > Add Network
3. Enter the network details above

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.# 强制部署触发器 Sat Aug  9 10:47:39 CST 2025
