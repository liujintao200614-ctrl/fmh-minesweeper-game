#!/bin/bash

# 生产环境构建脚本
set -e

echo "🏗️  扫雷游戏2.0 - 生产环境构建"
echo "============================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查配置文件
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ 错误: 找不到 .env.production 文件${NC}"
    echo -e "${YELLOW}💡 请先运行 './setup-production.sh' 创建配置${NC}"
    exit 1
fi

echo -e "${BLUE}📋 加载生产环境配置...${NC}"
set -a  # 自动导出变量
source .env.production
set +a

echo -e "${GREEN}✅ 配置加载完成${NC}"
echo ""

# 运行安全检查
echo -e "${BLUE}🔒 运行安全检查...${NC}"
node scripts/production-check.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 安全检查失败，请修复问题后重试${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 安全检查通过${NC}"
echo ""

# 清理旧构建
echo -e "${BLUE}🧹 清理旧构建文件...${NC}"
rm -rf .next
rm -rf out
rm -f nextjs.log
rm -f nextjs.pid
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 安装依赖
echo -e "${BLUE}📦 安装生产依赖...${NC}"
npm ci --only=production
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  生产依赖安装失败，尝试完整安装...${NC}"
    npm install
fi
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 编译智能合约
echo -e "${BLUE}🔧 编译智能合约...${NC}"
npm run compile
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 合约编译失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 合约编译完成${NC}"
echo ""

# 构建Next.js应用
echo -e "${BLUE}🏗️  构建Next.js应用...${NC}"
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 应用构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 应用构建完成${NC}"
echo ""

# 初始化数据库
echo -e "${BLUE}🗄️  初始化数据库...${NC}"
if [ ! -f "database/minesweeper.db" ]; then
    npm run db:init
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据库已存在，跳过初始化${NC}"
fi
echo ""

# 创建启动脚本
echo -e "${BLUE}📝 创建启动脚本...${NC}"
cat > start-production.sh << 'EOF'
#!/bin/bash

# 生产环境启动脚本
echo "🚀 启动扫雷游戏2.0生产环境..."

# 加载环境变量
if [ -f ".env.production" ]; then
    set -a
    source .env.production
    set +a
    echo "✅ 环境变量加载完成"
else
    echo "❌ 错误: 找不到 .env.production 文件"
    exit 1
fi

# 设置生产环境
export NODE_ENV=production
export PORT=${PORT:-3000}

# 启动应用
echo "🌟 在端口 $PORT 启动应用..."
npm start
EOF

chmod +x start-production.sh
echo -e "${GREEN}✅ 启动脚本创建完成${NC}"
echo ""

# 创建PM2配置
echo -e "${BLUE}📝 创建PM2配置...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'minesweeper-game',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PRIVATE_KEY: '$PRIVATE_KEY',
      SERVER_PRIVATE_KEY: '$SERVER_PRIVATE_KEY',
      NEXTAUTH_URL: '$NEXTAUTH_URL',
      NEXT_PUBLIC_MINESWEEPER_CONTRACT: '$NEXT_PUBLIC_MINESWEEPER_CONTRACT',
      NEXT_PUBLIC_FMH_TOKEN_CONTRACT: '$NEXT_PUBLIC_FMH_TOKEN_CONTRACT',
      NEXT_PUBLIC_CHAIN_ID: '$NEXT_PUBLIC_CHAIN_ID',
      NEXT_PUBLIC_NETWORK_NAME: '$NEXT_PUBLIC_NETWORK_NAME',
      MONAD_TESTNET_RPC: '$MONAD_TESTNET_RPC',
      MONAD_RPC_URL: '$MONAD_RPC_URL',
      DISABLE_ESLINT: '$DISABLE_ESLINT',
      GENERATE_SOURCEMAP: '$GENERATE_SOURCEMAP',
      NEXT_TELEMETRY_DISABLED: '$NEXT_TELEMETRY_DISABLED'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

echo -e "${GREEN}✅ PM2配置创建完成${NC}"
echo ""

# 创建日志目录
mkdir -p logs
echo -e "${GREEN}✅ 日志目录创建完成${NC}"
echo ""

# 创建部署包
echo -e "${BLUE}📦 创建部署包...${NC}"
DEPLOY_PACKAGE="minesweeper-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "$DEPLOY_PACKAGE" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache \
    --exclude="*.log" \
    --exclude=".env.local" \
    .

echo -e "${GREEN}✅ 部署包创建完成: $DEPLOY_PACKAGE${NC}"
echo ""

# 显示构建总结
echo -e "${GREEN}🎉 构建完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 构建输出:${NC}"
echo "  📁 .next/ - Next.js构建输出"
echo "  📁 database/ - 数据库文件"
echo "  📄 ecosystem.config.js - PM2配置"
echo "  📄 start-production.sh - 启动脚本"
echo "  📦 $DEPLOY_PACKAGE - 部署包"
echo ""

echo -e "${YELLOW}🚀 下一步选择:${NC}"
echo "1. 本地测试: ./start-production.sh"
echo "2. PM2启动: pm2 start ecosystem.config.js"
echo "3. 服务器部署: 上传 $DEPLOY_PACKAGE 到服务器"
echo ""

echo -e "${BLUE}💡 提示:${NC}"
echo "- 本地测试地址: http://localhost:3000"
echo "- 生产环境地址: $NEXTAUTH_URL"
echo "- 查看日志: pm2 logs minesweeper-game"
echo "- 停止服务: pm2 stop minesweeper-game"
echo ""

echo -e "${GREEN}✨ 构建脚本执行完成！${NC}"