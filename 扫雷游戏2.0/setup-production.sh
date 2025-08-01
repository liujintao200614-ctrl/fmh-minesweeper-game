#!/bin/bash

# 生产环境配置向导
set -e

echo "🚀 扫雷游戏2.0 - 生产环境配置向导"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${BLUE}📋 我们需要收集一些信息来配置生产环境...${NC}"
echo ""

# 收集配置信息
echo -e "${YELLOW}🔐 区块链配置${NC}"
read -p "请输入部署私钥 (不包含0x): " PRIVATE_KEY
echo ""

read -p "请输入服务器私钥 (不包含0x, 必须与部署私钥不同): " SERVER_PRIVATE_KEY
echo ""

if [ "$PRIVATE_KEY" = "$SERVER_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ 错误: 部署私钥和服务器私钥不能相同！${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 域名配置${NC}"
read -p "请输入您的域名 (如: https://yourdomain.com，或http://your-ip:3000): " DOMAIN_URL
echo ""

echo -e "${YELLOW}📋 合约地址配置${NC}"
echo "如果您还没有部署合约，可以先使用默认地址，稍后更新。"
read -p "Minesweeper合约地址 [回车使用默认]: " MINESWEEPER_CONTRACT
read -p "FMH Token合约地址 [回车使用默认]: " FMH_TOKEN_CONTRACT
echo ""

# 设置默认值
MINESWEEPER_CONTRACT=${MINESWEEPER_CONTRACT:-"0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27"}
FMH_TOKEN_CONTRACT=${FMH_TOKEN_CONTRACT:-"0x83aB028468ef2a5495Cc7964B3266437956231E2"}

echo -e "${BLUE}📝 生成配置文件...${NC}"

# 创建生产环境配置文件
cat > .env.production << EOF
# 🚀 生产环境配置
# 生成时间: $(date)
NODE_ENV=production

# 🔐 区块链私钥配置
PRIVATE_KEY=$PRIVATE_KEY
SERVER_PRIVATE_KEY=$SERVER_PRIVATE_KEY

# 🌐 网络配置
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 🏠 应用URL
NEXTAUTH_URL=$DOMAIN_URL

# 📋 合约地址
NEXT_PUBLIC_MINESWEEPER_CONTRACT=$MINESWEEPER_CONTRACT
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=$FMH_TOKEN_CONTRACT

# ⚙️ 网络信息
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_NETWORK_NAME=Monad Testnet

# 🎯 生产优化
DISABLE_ESLINT=true
GENERATE_SOURCEMAP=false
NEXT_TELEMETRY_DISABLED=1
EOF

# 设置文件权限
chmod 600 .env.production

echo -e "${GREEN}✅ 配置文件已创建: .env.production${NC}"
echo ""

# 显示配置摘要
echo -e "${BLUE}📊 配置摘要:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 域名: $DOMAIN_URL"
echo "📋 Minesweeper合约: $MINESWEEPER_CONTRACT"
echo "📋 FMH Token合约: $FMH_TOKEN_CONTRACT"
echo "⛓️  链ID: 10143 (Monad Testnet)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. .env.production 文件包含敏感信息，已设置为只读权限"
echo "2. 请不要将此文件提交到代码仓库"
echo "3. 在服务器上需要设置相同的环境变量"
echo ""

echo -e "${GREEN}🎉 配置完成！下一步可以运行构建脚本。${NC}"
echo -e "${BLUE}💡 提示: 运行 './build-production.sh' 开始构建${NC}"