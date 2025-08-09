#!/bin/bash

echo "🔧 FMH扫雷游戏 - 健壮版启动脚本"

# 函数：清理进程
cleanup() {
    echo "🛑 清理所有进程..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    sleep 2
}

# 函数：检查端口
check_port() {
    local port=$1
    nc -z localhost $port 2>/dev/null
}

# 函数：等待端口可用
wait_for_port() {
    local port=$1
    local timeout=30
    local counter=0
    
    echo "⏳ 等待端口 $port 启动..."
    while ! check_port $port && [ $counter -lt $timeout ]; do
        sleep 1
        counter=$((counter + 1))
        echo "   尝试 $counter/$timeout..."
    done
    
    if check_port $port; then
        echo "✅ 端口 $port 已就绪"
        return 0
    else
        echo "❌ 端口 $port 启动超时"
        return 1
    fi
}

# 清理现有进程
cleanup

# 清理缓存
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.vite 2>/dev/null || true

# 启动Next.js API服务器
echo "📦 启动Next.js API服务器..."
NODE_ENV=development npm run dev:next 2>&1 | grep -v "webpack devtool" > next-server.log &
NEXT_PID=$!

# 等待Next.js启动
if wait_for_port 3000; then
    echo "✅ Next.js API服务器启动成功"
else
    echo "❌ Next.js启动失败，查看日志:"
    tail -10 next-server.log
    cleanup
    exit 1
fi

# 测试API端点
echo "🧪 测试API端点..."
if curl -s -f "http://localhost:3000/api/test" > /dev/null 2>&1; then
    echo "✅ API测试通过"
else
    echo "⚠️ API测试失败，但继续启动前端..."
fi

# 启动Vite前端服务器
echo "🎨 启动Vite前端服务器..."
npm run dev 2>&1 | grep -v "webpack devtool" > vite-server.log &
VITE_PID=$!

# 等待Vite启动
if wait_for_port 5173; then
    echo "✅ Vite前端服务器启动成功"
else
    echo "❌ Vite启动失败，查看日志:"
    tail -10 vite-server.log
    cleanup
    exit 1
fi

# 测试代理
echo "🔗 测试Vite代理..."
sleep 3
if curl -s -f "http://localhost:5173/api/test" > /dev/null 2>&1; then
    echo "✅ 代理工作正常"
else
    echo "⚠️ 代理可能有问题"
fi

echo ""
echo "🎉 所有服务启动成功！"
echo "📡 前端游戏: http://localhost:5173"
echo "🔗 API服务: http://localhost:3000"
echo "📊 排行榜: http://localhost:5173/api/leaderboard"
echo ""
echo "📝 进程ID: Next.js=$NEXT_PID, Vite=$VITE_PID"
echo "📋 日志文件: next-server.log, vite-server.log"

# 自动打开浏览器
sleep 1
open http://localhost:5173

echo ""
echo "💡 按 Ctrl+C 停止所有服务器"

# 捕获信号并清理
trap cleanup INT TERM

# 监控进程状态
while true; do
    if ! kill -0 $NEXT_PID 2>/dev/null; then
        echo "❌ Next.js进程停止，重新启动..."
        NODE_ENV=development npm run dev:next 2>&1 | grep -v "webpack devtool" > next-server.log &
        NEXT_PID=$!
        wait_for_port 3000
    fi
    
    if ! kill -0 $VITE_PID 2>/dev/null; then
        echo "❌ Vite进程停止，重新启动..."
        npm run dev 2>&1 | grep -v "webpack devtool" > vite-server.log &
        VITE_PID=$!
        wait_for_port 5173
    fi
    
    sleep 10
done