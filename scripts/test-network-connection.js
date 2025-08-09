#!/usr/bin/env node

// 网络连接测试脚本
const { ethers } = require('ethers');

console.log('🔍 测试Monad Testnet连接...\n');

async function testNetworkConnection() {
    try {
        // 1. 测试RPC连接
        console.log('📡 测试RPC连接...');
        const rpcUrl = 'https://testnet-rpc.monad.xyz';
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
            name: 'Monad Testnet',
            chainId: 10143,
            ensAddress: null, // 禁用 ENS 解析
        });
        
        // 获取网络信息 - 使用直接 RPC 调用避免 ENS
        const chainIdHex = await provider.send('eth_chainId', []);
        const chainId = parseInt(chainIdHex, 16);
        console.log('✅ RPC连接成功');
        console.log(`   链ID: ${chainId} (0x${chainId.toString(16)})`);
        console.log(`   链名: Monad Testnet`);
        
        // 2. 获取区块信息
        console.log('\n📦 获取最新区块...');
        const blockNumber = await provider.getBlockNumber();
        const block = await provider.getBlock('latest');
        console.log('✅ 区块信息获取成功');
        console.log(`   最新区块: ${blockNumber}`);
        console.log(`   区块时间: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        
        // 3. 测试合约地址
        console.log('\n🔍 测试合约地址...');
        const minesweeperAddress = '0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27';
        const tokenAddress = '0x83aB028468ef2a5495Cc7964B3266437956231E2';
        
        try {
            const minesweeperCode = await provider.getCode(minesweeperAddress);
            if (minesweeperCode === '0x') {
                console.log('⚠️  Minesweeper合约未部署或地址错误');
            } else {
                console.log('✅ Minesweeper合约存在');
            }
        } catch (error) {
            console.log('❌ 无法检查Minesweeper合约:', error.message);
        }
        
        try {
            const tokenCode = await provider.getCode(tokenAddress);
            if (tokenCode === '0x') {
                console.log('⚠️  FMH Token合约未部署或地址错误');
            } else {
                console.log('✅ FMH Token合约存在');
            }
        } catch (error) {
            console.log('❌ 无法检查FMH Token合约:', error.message);
        }
        
        // 4. 测试账户余额
        if (process.env.PRIVATE_KEY) {
            console.log('\n💰 测试账户余额...');
            try {
                const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
                const balance = await provider.getBalance(wallet.address);
                console.log('✅ 账户信息获取成功');
                console.log(`   地址: ${wallet.address}`);
                console.log(`   余额: ${ethers.formatEther(balance)} MON`);
                
                if (balance === 0n) {
                    console.log('⚠️  账户余额为0，可能需要获取测试代币');
                }
            } catch (error) {
                console.log('❌ 账户测试失败:', error.message);
            }
        }
        
        console.log('\n🎉 网络连接测试完成！');
        return true;
        
    } catch (error) {
        console.error('❌ 网络连接测试失败:', error.message);
        console.log('\n🔧 可能的解决方案:');
        console.log('1. 检查网络连接');
        console.log('2. 确认RPC URL是否正确');
        console.log('3. 检查防火墙设置');
        console.log('4. 尝试其他RPC节点');
        return false;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    // 加载环境变量
    require('dotenv').config({ path: '.env.local' });
    
    testNetworkConnection()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('未捕获的错误:', error);
            process.exit(1);
        });
}

module.exports = { testNetworkConnection };