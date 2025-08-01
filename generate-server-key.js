#!/usr/bin/env node

// 🔐 服务器私钥生成脚本

const crypto = require('crypto');
const { ethers } = require('ethers');

console.log('🔐 FMH Minesweeper 服务器私钥生成器');
console.log('=====================================');
console.log('');

// 生成随机私钥
const privateKeyBytes = crypto.randomBytes(32);
const privateKeyHex = privateKeyBytes.toString('hex');

// 创建钱包实例获取地址
const wallet = new ethers.Wallet(privateKeyHex);

console.log('✅ 新的服务器私钥已生成：');
console.log('');
console.log('私钥 (不含0x前缀):');
console.log(`${privateKeyHex}`);
console.log('');
console.log('对应的地址:');
console.log(`${wallet.address}`);
console.log('');
console.log('🔒 安全提醒：');
console.log('1. 请将此私钥添加到 .env.local 的 SERVER_PRIVATE_KEY 字段');
console.log('2. 确保此私钥与部署私钥不同');
console.log('3. 向此地址转入一些 MON 代币用于 Gas 费用');
console.log('4. 生产环境请使用更安全的私钥管理方案');
console.log('');
console.log('📝 环境变量配置示例：');
console.log(`SERVER_PRIVATE_KEY=${privateKeyHex}`);
console.log('');
console.log('⚠️  警告：请妥善保管此私钥，不要分享给任何人！');