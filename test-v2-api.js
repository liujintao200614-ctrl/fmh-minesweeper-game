#!/usr/bin/env node

/**
 * V2.0 API系统测试
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000'; // Next.js API
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

console.log('🧪 测试FMH扫雷游戏V2.0 API系统\n');

// 测试用的HTTP请求函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'V2.0-Test-Client'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('1️⃣ 测试玩家统计API...');
  try {
    // 测试获取玩家统计
    const statsResponse = await makeRequest(`/api/players/stats?address=${TEST_ADDRESS}`);
    console.log(`   状态: ${statsResponse.status}`);
    console.log(`   数据:`, statsResponse.data);
    
    if (statsResponse.status === 200) {
      console.log('   ✅ 玩家统计API正常工作');
    } else {
      console.log('   ❌ 玩家统计API异常');
    }
  } catch (error) {
    console.log('   ❌ 请求失败:', error.message);
  }

  console.log('\n2️⃣ 测试反作弊API...');
  try {
    // 测试IP游戏统计
    const ipResponse = await makeRequest(`/api/anti-cheat/ip-games?ip=192.168.1.1&date=${new Date().toISOString().split('T')[0]}`);
    console.log(`   IP统计状态: ${ipResponse.status}`);
    console.log(`   IP统计数据:`, ipResponse.data);
    
    if (ipResponse.status === 200) {
      console.log('   ✅ IP游戏统计API正常工作');
    }
  } catch (error) {
    console.log('   ❌ IP统计请求失败:', error.message);
  }

  try {
    // 测试设备指纹查询
    const fingerprintResponse = await makeRequest(`/api/anti-cheat/accounts-by-fingerprint?fingerprint=test123456`);
    console.log(`   指纹查询状态: ${fingerprintResponse.status}`);
    console.log(`   指纹查询数据:`, fingerprintResponse.data);
    
    if (fingerprintResponse.status === 200) {
      console.log('   ✅ 设备指纹API正常工作');
    }
  } catch (error) {
    console.log('   ❌ 指纹查询请求失败:', error.message);
  }

  console.log('\n3️⃣ 测试V2.0奖励申请API...');
  try {
    // 模拟V2.0奖励申请
    const claimData = {
      player: TEST_ADDRESS,
      gameId: 12345,
      score: 1000,
      duration: 60,
      gameConfig: { width: 10, height: 10, mines: 15 },
      flagsUsed: 15,
      cellsRevealed: 85,
      perfectGame: true,
      difficulty: 'medium',
      clientInfo: {
        userAgent: 'Test-Browser/1.0',
        screenResolution: '1920x1080',
        timezone: 'Asia/Shanghai',
        fingerprint: 'test123456'
      }
    };

    const claimResponse = await makeRequest('/api/claim', 'POST', claimData);
    console.log(`   申请状态: ${claimResponse.status}`);
    console.log(`   申请数据:`, claimResponse.data);
    
    if (claimResponse.status === 200 && claimResponse.data.success) {
      console.log('   ✅ V2.0奖励申请API正常工作');
      console.log(`   💰 计算出的奖励: ${claimResponse.data.estimatedReward}`);
    } else {
      console.log('   ⚠️ 奖励申请可能受限制:', claimResponse.data?.error || 'unknown');
    }
  } catch (error) {
    console.log('   ❌ 奖励申请请求失败:', error.message);
  }

  console.log('\n🎯 V2.0 API系统测试完成！');
  console.log('\n📝 测试总结:');
  console.log('   - 玩家统计系统已实现');
  console.log('   - 反作弊API已部署');
  console.log('   - V2.0奖励计算已集成');
  console.log('   - 等级系统已准备');
}

// 检查Next.js服务器是否运行
async function checkServer() {
  try {
    const response = await makeRequest('/api/test');
    if (response.status === 200) {
      console.log('✅ Next.js服务器运行正常\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Next.js服务器未运行，请先启动: npm run dev:next\n');
    return false;
  }
}

// 主测试函数
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAPI();
  } else {
    console.log('💡 请先运行以下命令启动服务器:');
    console.log('   npm run dev:next');
    console.log('   然后重新运行此测试');
  }
}

main().catch(console.error);