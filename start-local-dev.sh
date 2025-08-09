#!/bin/bash

echo "🚀 FMH扫雷游戏 - 本地开发环境启动脚本"
echo "=================================="

# 获取端口参数，默认3001
PORT=${1:-3001}

# 检查Node.js版本
node_version=$(node --version)
echo "📋 Node.js版本: $node_version"

# 检查npm版本  
npm_version=$(npm --version)
echo "📋 npm版本: $npm_version"

# 检查端口占用
echo "🔍 检查端口 $PORT 是否可用..."
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，尝试使用端口 3002..."
    PORT=3002
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo "⚠️  端口 3002 也被占用，尝试使用端口 3003..."
        PORT=3003
    fi
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install --legacy-peer-deps
fi

# 初始化数据库（如果需要）
echo "🗄️  初始化数据库..."
npm run db:init

# 启动开发服务器
echo "🌐 启动Next.js开发服务器..."
echo "📍 访问地址: http://localhost:$PORT"
echo "🔧 开发工具: TypeScript + Next.js + SQLite"
echo "⚡ Web3功能: 支持MetaMask连接Monad测试网"
echo ""
echo "💡 使用方法："
echo "   ./start-local-dev.sh       # 默认端口3001"
echo "   ./start-local-dev.sh 3005  # 指定端口3005"
echo ""
echo "按Ctrl+C停止服务器"
echo "=================================="

npx next dev --port $PORT