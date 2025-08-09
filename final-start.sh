#!/bin/bash

echo "🔧 FMH扫雷游戏 - 最终修复版启动"

# 停止所有进程
pkill -f "next dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 3

# 清理所有缓存
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.vite 2>/dev/null || true

echo "📦 启动Next.js后端API (端口3000)..."
NODE_ENV=development npm run dev:next &
NEXT_PID=$!

echo "⏳ 等待Next.js完全启动..."
sleep 8

# 验证Next.js是否成功启动
if ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "❌ Next.js启动失败"
    exit 1
fi

echo "🎨 启动Vite前端服务器 (端口5173)..."
npm run dev &
VITE_PID=$!

echo "⏳ 等待Vite启动..."
sleep 6

echo "🧪 测试所有API端点..."

# 测试基础API
echo "测试 /api/test ..."
if curl -s -f "http://localhost:3000/api/test" > /dev/null 2>&1; then
    echo "✅ 基础API正常"
else
    echo "❌ 基础API失败"
fi

# 测试排行榜API
echo "测试 /api/leaderboard ..."
if curl -s -f "http://localhost:3000/api/leaderboard" > /dev/null 2>&1; then
    echo "✅ 排行榜API正常"
else
    echo "⚠️ 排行榜API可能有问题"
fi

# 测试通过Vite代理的API
echo "测试 Vite代理 /api/test ..."
sleep 2
if curl -s -f "http://localhost:5173/api/test" > /dev/null 2>&1; then
    echo "✅ Vite代理正常"
else
    echo "⚠️ Vite代理可能有问题"
fi

echo ""
echo "✅ 启动完成！"
echo "📡 前端地址: http://localhost:5173"
echo "🔗 API地址: http://localhost:3000"
echo "🧪 测试API: http://localhost:3000/api/test"
echo ""
echo "📝 进程ID: Next.js=$NEXT_PID, Vite=$VITE_PID"

# 自动打开浏览器
sleep 2
open http://localhost:5173

echo "💡 按 Ctrl+C 停止所有服务器"

# 捕获中断信号
trap "echo '🛑 正在停止服务器...'; kill $NEXT_PID $VITE_PID 2>/dev/null; exit 0" INT

# 保持运行并显示状态
while true; do
    if ! kill -0 $NEXT_PID 2>/dev/null; then
        echo "❌ Next.js进程意外停止"
        break
    fi
    if ! kill -0 $VITE_PID 2>/dev/null; then
        echo "❌ Vite进程意外停止"
        break
    fi
    sleep 5
done