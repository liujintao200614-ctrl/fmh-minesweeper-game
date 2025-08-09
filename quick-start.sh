#\!/bin/bash

echo "🚀 快速启动FMH扫雷游戏..."

# 停止所有现有进程
pkill -f "next dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# 清理缓存
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

echo "📦 启动Next.js API服务器..."
NODE_ENV=development npm run dev:next &
API_PID=$\!

sleep 6

echo "🎨 启动Vite前端服务器..."  
npm run dev &
FRONTEND_PID=$\!

sleep 3

echo "✅ 服务器启动完成\!"
echo "📡 前端: http://localhost:5173"
echo "🔗 API: http://localhost:3000"

# 快速测试
echo "🧪 测试连接..."
sleep 2

# 测试API
if curl -s -f "http://localhost:3000/api/leaderboard" >/dev/null 2>&1; then
    echo "✅ API服务正常"
else
    echo "⚠️ API可能还在启动中..."
fi

# 打开浏览器
echo "🌐 打开浏览器..."
sleep 1
open http://localhost:5173

echo "📝 PID: API=$API_PID, Frontend=$FRONTEND_PID"
echo "💡 按Ctrl+C停止所有服务器"

trap "echo '🛑 停止服务器...'; kill $API_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# 保持运行
while true; do
    sleep 1
done
EOF < /dev/null