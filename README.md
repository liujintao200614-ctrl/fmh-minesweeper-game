# FMH Minesweeper Game

A blockchain-based minesweeper game that rewards players with FMH tokens for winning games on the Monad testnet.

## Features

- **Classic Minesweeper Gameplay**: Traditional minesweeper with modern React interface
- **FMH Token Rewards**: Earn FMH tokens for winning games
- **Multiple Difficulty Levels**: Easy, Medium, Hard presets plus custom settings
- **Bonus Rewards**: Extra tokens for perfect games and speed completions
- **Web3 Integration**: MetaMask wallet connection for Monad testnet
- **Player Statistics**: Track your wins, games played, and total rewards

## Reward System

- **Base Win Reward**: 10 FMH tokens
- **Perfect Game Bonus**: +50 FMH (completed in <60 seconds with score ≥1000)
- **Speed Bonuses**:
  - Under 30 seconds: +20 FMH
  - Under 120 seconds: +5 FMH
- **Game Fee**: 0.001 MON per game

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

For issues and questions, please create an issue in the repository.