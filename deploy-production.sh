#!/bin/bash

# 🚀 生产环境部署脚本
# 请在执行前仔细阅读DEPLOYMENT-SECURITY.md

set -e  # 遇到错误立即退出

echo "🚀 开始生产环境部署..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要的环境变量
echo "🔍 检查环境变量..."
required_vars=("PRIVATE_KEY" "SERVER_PRIVATE_KEY" "NEXTAUTH_URL" "NEXT_PUBLIC_MINESWEEPER_CONTRACT" "NEXT_PUBLIC_FMH_TOKEN_CONTRACT")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ 错误: 环境变量 $var 未设置${NC}"
        echo "请设置所有必要的环境变量后重新运行。"
        echo "参考 .env.example 文件。"
        exit 1
    fi
done

echo -e "${GREEN}✅ 环境变量检查通过${NC}"

# 安全检查
echo "🔒 执行安全检查..."

# 检查是否在生产模式
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  警告: NODE_ENV 不是 'production'${NC}"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查私钥是否不同
if [ "$PRIVATE_KEY" = "$SERVER_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ 错误: PRIVATE_KEY 和 SERVER_PRIVATE_KEY 不能相同${NC}"
    exit 1
fi

# 检查URL是否正确
if [[ $NEXTAUTH_URL == *"localhost"* ]]; then
    echo -e "${RED}❌ 错误: NEXTAUTH_URL 仍然指向localhost${NC}"
    echo "请更新为生产域名。"
    exit 1
fi

echo -e "${GREEN}✅ 安全检查通过${NC}"

# 清理和准备
echo "🧹 清理旧文件..."
rm -rf .next
rm -rf node_modules/.cache
rm -f nextjs.log
rm -f nextjs.pid

# 安装依赖
echo "📦 安装生产依赖..."
npm ci --only=production

# 编译智能合约
echo "🔧 编译智能合约..."
npm run compile

# 构建Next.js应用
echo "🏗️  构建Next.js应用..."
NODE_ENV=production npm run build

# 运行测试（如果有）
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "🧪 运行测试..."
    npm test || {
        echo -e "${RED}❌ 测试失败${NC}"
        read -p "是否忽略测试失败继续部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
fi

# 数据库初始化（如果需要）
if [ ! -f "database/minesweeper.db" ]; then
    echo "🗄️  初始化数据库..."
    npm run db:init
fi

echo -e "${GREEN}✅ 构建完成！${NC}"

# 部署选项
echo "🚀 选择部署方式:"
echo "1) 启动本地生产服务器"
echo "2) 生成部署包"
echo "3) 仅构建，不启动"

read -p "请选择 (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🌟 启动生产服务器..."
        NODE_ENV=production npm start
        ;;
    2)
        echo "📦 生成部署包..."
        tar -czf "minesweeper-$(date +%Y%m%d-%H%M%S).tar.gz" \
            --exclude=node_modules \
            --exclude=.git \
            --exclude=.next/cache \
            --exclude="*.log" \
            .
        echo -e "${GREEN}✅ 部署包已生成${NC}"
        ;;
    3)
        echo -e "${GREEN}✅ 构建完成，可以手动部署${NC}"
        ;;
    *)
        echo "无效选择，退出。"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 部署流程完成！${NC}"
echo ""
echo "⚠️  请确保:"
echo "- 域名DNS已正确配置"
echo "- SSL证书已安装"
echo "- 防火墙规则已设置"
echo "- 监控系统已启用"