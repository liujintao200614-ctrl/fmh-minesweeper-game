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