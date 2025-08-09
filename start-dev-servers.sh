#!/bin/bash

echo "🚀 启动FMH扫雷游戏开发环境..."

# 停止现有的服务器
echo "🛑 停止现有服务器..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# 等待端口释放
sleep 3

# 检查数据库文件
echo "🗄️ 检查数据库..."
if [ ! -f "database/minesweeper.db" ]; then
    echo "⚠️ 数据库文件不存在，运行初始化脚本..."
    npm run db:init
fi

echo "📦 启动Next.js API服务器 (端口3000)..."
NODE_ENV=development npm run dev:next -- --port 3000 > next.log 2>&1 &
NEXTJS_PID=$!

# 等待Next.js启动并检查日志
echo "⏳ 等待Next.js启动..."
sleep 8

# 检查Next.js是否成功启动
if ! kill -0 $NEXTJS_PID 2>/dev/null; then
    echo "❌ Next.js启动失败，查看日志:"
    tail -20 next.log
    exit 1
fi

# 检查端口是否监听
if ! nc -z localhost 3000 2>/dev/null; then
    echo "❌ Next.js未监听3000端口，查看日志:"
    tail -20 next.log
    exit 1
fi

echo "✅ Next.js API服务器启动成功"

echo "🎨 启动Vite前端服务器 (端口5173)..."
npm run dev > vite.log 2>&1 &
VITE_PID=$!

# 等待Vite启动
sleep 5

echo "✅ 开发服务器已启动!"
echo "📡 前端地址: http://localhost:5173"
echo "🔗 API地址: http://localhost:3000"
echo ""
echo "🧪 测试API连接..."
if curl -s "http://localhost:3000/api/leaderboard" > /dev/null; then
    echo "✅ API连接正常"
else
    echo "❌ API连接失败，检查日志:"
    echo "Next.js日志:"
    tail -10 next.log
fi

echo ""
echo "💡 按 Ctrl+C 停止所有服务器"
echo "📝 日志文件: next.log (API服务器), vite.log (前端服务器)"

# 等待用户中断
trap "echo '🛑 停止所有服务器...'; kill $NEXTJS_PID $VITE_PID 2>/dev/null; exit 0" INT

wait