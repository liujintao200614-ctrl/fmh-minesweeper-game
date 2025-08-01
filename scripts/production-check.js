#!/usr/bin/env node

// 生产环境检查脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 执行生产环境检查...\n');

let hasErrors = false;
let hasWarnings = false;

// 检查环境变量
function checkEnvironmentVariables() {
    console.log('📋 检查环境变量...');
    
    const requiredVars = [
        'PRIVATE_KEY',
        'SERVER_PRIVATE_KEY', 
        'NEXTAUTH_URL',
        'NEXT_PUBLIC_MINESWEEPER_CONTRACT',
        'NEXT_PUBLIC_FMH_TOKEN_CONTRACT',
        'NEXT_PUBLIC_CHAIN_ID'
    ];
    
    const warnings = [];
    const errors = [];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            errors.push(`❌ ${varName} 未设置`);
        } else if (value.includes('localhost')) {
            warnings.push(`⚠️  ${varName} 包含 localhost: ${value}`);
        } else if (varName.includes('PRIVATE_KEY') && value.length < 64) {
            errors.push(`❌ ${varName} 长度不正确`);
        }
    });
    
    // 检查私钥是否相同
    if (process.env.PRIVATE_KEY && process.env.SERVER_PRIVATE_KEY) {
        if (process.env.PRIVATE_KEY === process.env.SERVER_PRIVATE_KEY) {
            errors.push('❌ PRIVATE_KEY 和 SERVER_PRIVATE_KEY 不能相同');
        }
    }
    
    if (errors.length > 0) {
        console.log('🚨 环境变量错误:');
        errors.forEach(error => console.log(`  ${error}`));
        hasErrors = true;
    }
    
    if (warnings.length > 0) {
        console.log('⚠️  环境变量警告:');
        warnings.forEach(warning => console.log(`  ${warning}`));
        hasWarnings = true;
    }
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ 环境变量检查通过');
    }
    console.log('');
}

// 检查文件权限和存在性
function checkFiles() {
    console.log('📁 检查关键文件...');
    
    const criticalFiles = [
        'package.json',
        'next.config.js',
        'lib/database.js',
        '.env.example'
    ];
    
    const missingFiles = [];
    
    criticalFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length > 0) {
        console.log('❌ 缺少关键文件:');
        missingFiles.forEach(file => console.log(`  - ${file}`));
        hasErrors = true;
    } else {
        console.log('✅ 关键文件检查通过');
    }
    console.log('');
}

// 检查安全配置
function checkSecurity() {
    console.log('🔒 检查安全配置...');
    
    const warnings = [];
    
    // 检查.env.local是否存在（生产环境不应该使用）
    if (fs.existsSync('.env.local') && process.env.NODE_ENV === 'production') {
        warnings.push('⚠️  生产环境发现 .env.local 文件，建议使用系统环境变量');
    }
    
    // 检查是否有调试代码
    const filesToCheck = [
        'src/hooks/useWeb3.ts',
        'pages/index.tsx'
    ];
    
    filesToCheck.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('console.log') && !content.includes('NODE_ENV')) {
                warnings.push(`⚠️  ${file} 包含可能的调试代码`);
            }
        }
    });
    
    if (warnings.length > 0) {
        console.log('⚠️  安全警告:');
        warnings.forEach(warning => console.log(`  ${warning}`));
        hasWarnings = true;
    } else {
        console.log('✅ 安全配置检查通过');
    }
    console.log('');
}

// 检查依赖
function checkDependencies() {
    console.log('📦 检查依赖...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredDeps = [
            'next',
            'react',
            'ethers',
            'sqlite3',
            'styled-components'
        ];
        
        const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
        
        if (missingDeps.length > 0) {
            console.log('❌ 缺少依赖:');
            missingDeps.forEach(dep => console.log(`  - ${dep}`));
            hasErrors = true;
        } else {
            console.log('✅ 依赖检查通过');
        }
    } catch (error) {
        console.log('❌ 无法读取 package.json');
        hasErrors = true;
    }
    console.log('');
}

// 执行所有检查
checkEnvironmentVariables();
checkFiles();
checkSecurity();
checkDependencies();

// 总结
console.log('📊 检查总结:');
if (hasErrors) {
    console.log('❌ 发现错误，请修复后再部署');
    process.exit(1);
} else if (hasWarnings) {
    console.log('⚠️  发现警告，建议修复后部署');
    process.exit(2);
} else {
    console.log('✅ 所有检查通过，可以安全部署');
    process.exit(0);
}