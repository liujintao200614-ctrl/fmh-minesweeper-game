import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
const MINESWEEPER_CONTRACT = process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT || '0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27';
const FMH_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_FMH_TOKEN_CONTRACT || '0x83aB028468ef2a5495Cc7964B3266437956231E2';

const MINESWEEPER_ABI = [
  "function startGame(uint8 width, uint8 height, uint8 mines) external payable returns (uint256)",
  "function GAME_FEE() external view returns (uint256)",
  "function gameCounter() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function paused() external view returns (bool)"
];

const TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 开始合约诊断...');
    
    // 创建提供商
    const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
    
    const diagnosis: any = {
      network: {},
      minesweeperContract: {},
      tokenContract: {},
      errors: []
    };

    // 1. 检查网络连接
    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      diagnosis.network = {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber,
        status: 'connected'
      };
      console.log('✅ 网络连接正常:', diagnosis.network);
    } catch (error: any) {
      diagnosis.network = { status: 'error', message: error.message };
      diagnosis.errors.push(`Network connection failed: ${error.message}`);
    }

    // 2. 检查扫雷合约
    try {
      const gameContract = new ethers.Contract(MINESWEEPER_CONTRACT, MINESWEEPER_ABI, provider);
      
      // 检查合约是否存在
      const code = await provider.getCode(MINESWEEPER_CONTRACT);
      if (code === '0x') {
        throw new Error('Contract not deployed');
      }

      const [gameFee, gameCounter, owner, paused] = await Promise.all([
        gameContract.GAME_FEE().catch(() => 'N/A'),
        gameContract.gameCounter().catch(() => 'N/A'),
        gameContract.owner().catch(() => 'N/A'),
        gameContract.paused().catch(() => 'N/A')
      ]);

      diagnosis.minesweeperContract = {
        address: MINESWEEPER_CONTRACT,
        deployed: true,
        gameFee: gameFee.toString(),
        gameCounter: gameCounter.toString(),
        owner,
        paused,
        status: 'accessible'
      };
      console.log('✅ 扫雷合约可访问:', diagnosis.minesweeperContract);
    } catch (error: any) {
      diagnosis.minesweeperContract = { 
        address: MINESWEEPER_CONTRACT,
        status: 'error', 
        message: error.message 
      };
      diagnosis.errors.push(`Minesweeper contract error: ${error.message}`);
    }

    // 3. 检查代币合约
    try {
      const tokenContract = new ethers.Contract(FMH_TOKEN_CONTRACT, TOKEN_ABI, provider);
      
      const code = await provider.getCode(FMH_TOKEN_CONTRACT);
      if (code === '0x') {
        throw new Error('Token contract not deployed');
      }

      const [name, symbol, totalSupply] = await Promise.all([
        tokenContract.name().catch(() => 'N/A'),
        tokenContract.symbol().catch(() => 'N/A'),
        tokenContract.totalSupply().catch(() => 'N/A')
      ]);

      diagnosis.tokenContract = {
        address: FMH_TOKEN_CONTRACT,
        deployed: true,
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        status: 'accessible'
      };
      console.log('✅ 代币合约可访问:', diagnosis.tokenContract);
    } catch (error: any) {
      diagnosis.tokenContract = { 
        address: FMH_TOKEN_CONTRACT,
        status: 'error', 
        message: error.message 
      };
      diagnosis.errors.push(`Token contract error: ${error.message}`);
    }

    // 4. 测试合约调用（模拟）
    try {
      const gameContract = new ethers.Contract(MINESWEEPER_CONTRACT, MINESWEEPER_ABI, provider);
      
      // 尝试估算 Gas（不实际执行）
      const testParams = [9, 9, 10]; // 简单模式参数
      console.log('🧪 测试参数验证:', testParams);
      
      // 这里不能真正调用 estimateGas，因为需要支付费用
      // 但我们可以检查参数是否会导致溢出
      const [width, height, mines] = testParams;
      const totalCells = width * height;
      
      diagnosis.parameterTest = {
        testParams: { width, height, mines },
        totalCells,
        validForUint8: totalCells <= 255,
        mineRatio: mines / totalCells,
        status: totalCells <= 255 ? 'valid' : 'invalid'
      };

      if (totalCells > 255) {
        diagnosis.errors.push(`Parameter combination causes uint8 overflow: ${width} * ${height} = ${totalCells} > 255`);
      }

    } catch (error: any) {
      diagnosis.parameterTest = { status: 'error', message: error.message };
      diagnosis.errors.push(`Parameter test failed: ${error.message}`);
    }

    diagnosis.summary = {
      overallStatus: diagnosis.errors.length === 0 ? 'healthy' : 'issues_detected',
      totalErrors: diagnosis.errors.length,
      recommendations: []
    };

    if (diagnosis.network.status === 'error') {
      diagnosis.summary.recommendations.push('Check Monad testnet RPC connection');
    }
    if (diagnosis.minesweeperContract.status === 'error') {
      diagnosis.summary.recommendations.push('Verify Minesweeper contract deployment');
    }
    if (diagnosis.tokenContract.status === 'error') {
      diagnosis.summary.recommendations.push('Verify FMH token contract deployment');
    }
    if (diagnosis.parameterTest?.status === 'invalid') {
      diagnosis.summary.recommendations.push('Use smaller game board dimensions');
    }

    res.status(200).json(diagnosis);

  } catch (error: any) {
    console.error('🚫 诊断失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Contract diagnosis failed'
    });
  }
}