const { ethers, JsonRpcProvider, Contract } = require('ethers');

// 网络配置
const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz';
const FMH_CONTRACT_ADDRESS = '0xFa32A01E4FDAde90204902EDfEa63C150407C736';

// 简化ABI - 只包含我们要测试的方法
const TEST_ABI = [
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function totalSupply() external view returns (uint256)",
    "function getTotalBurned() external view returns (uint256)",
    "function getBurnRate() external view returns (uint256)"
];

async function testContractMethods() {
    console.log('🧪 测试FMH合约方法调用...');
    console.log(`合约地址: ${FMH_CONTRACT_ADDRESS}`);
    console.log(`RPC节点: ${MONAD_TESTNET_RPC}`);
    console.log('─'.repeat(60));
    
    try {
        // 创建Provider
        console.log('📡 连接到Monad测试网...');
        const provider = new JsonRpcProvider(MONAD_TESTNET_RPC);
        
        // 验证网络
        const network = await provider.getNetwork();
        console.log(`✅ 网络连接成功: Chain ID ${network.chainId}`);
        
        // 创建合约实例
        const contract = new Contract(FMH_CONTRACT_ADDRESS, TEST_ABI, provider);
        console.log('✅ 合约实例创建成功');
        
        console.log('\n📊 测试基础ERC20方法:');
        
        // 测试基础方法
        try {
            const name = await contract.name();
            console.log(`   代币名称: ${name} ✅`);
        } catch (error) {
            console.log(`   代币名称: ❌ ${error.message}`);
        }
        
        try {
            const symbol = await contract.symbol();
            console.log(`   代币符号: ${symbol} ✅`);
        } catch (error) {
            console.log(`   代币符号: ❌ ${error.message}`);
        }
        
        try {
            const totalSupply = await contract.totalSupply();
            console.log(`   总供应量: ${ethers.formatEther(totalSupply)} ✅`);
        } catch (error) {
            console.log(`   总供应量: ❌ ${error.message}`);
        }
        
        console.log('\n🔥 测试销毁相关方法:');
        
        // 测试 getTotalBurned
        try {
            const totalBurned = await contract.getTotalBurned();
            console.log(`   总销毁量: ${ethers.formatEther(totalBurned)} FMH ✅`);
        } catch (error) {
            console.log(`   总销毁量: ❌ ${error.message}`);
            if (error.code) console.log(`   错误代码: ${error.code}`);
        }
        
        // 测试 getBurnRate  
        try {
            const burnRate = await contract.getBurnRate();
            console.log(`   销毁率: ${burnRate.toString()} (万分比) ✅`);
        } catch (error) {
            console.log(`   销毁率: ❌ ${error.message}`);
            if (error.code) console.log(`   错误代码: ${error.code}`);
        }
        
        console.log('\n🔍 RPC节点测试:');
        
        // 测试网络延迟
        const start = Date.now();
        await provider.getBlockNumber();
        const latency = Date.now() - start;
        console.log(`   网络延迟: ${latency}ms`);
        
        // 测试连续请求
        console.log('   测试连续请求稳定性...');
        let successCount = 0;
        const testCount = 5;
        
        for (let i = 0; i < testCount; i++) {
            try {
                await contract.name();
                successCount++;
            } catch (error) {
                console.log(`   请求 ${i+1} 失败: ${error.message}`);
            }
        }
        
        console.log(`   成功率: ${successCount}/${testCount} (${(successCount/testCount*100).toFixed(1)}%)`);
        
        if (successCount === testCount) {
            console.log('\n✅ 所有测试通过！合约方法和RPC节点正常工作');
        } else {
            console.log('\n⚠️ 部分测试失败，可能存在网络或合约问题');
        }
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        
        if (error.message.includes('network')) {
            console.log('💡 建议: 检查网络连接或尝试其他RPC节点');
        } else if (error.message.includes('contract')) {
            console.log('💡 建议: 验证合约地址或ABI配置');
        }
    }
}

// 执行测试
testContractMethods();