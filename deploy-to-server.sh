#!/bin/bash

# 服务器部署脚本
set -e

echo "🌐 扫雷游戏2.0 - 服务器部署脚本"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 收集服务器信息
echo -e "${BLUE}📋 请提供服务器信息...${NC}"
read -p "服务器IP地址: " SERVER_IP
read -p "SSH用户名: " SSH_USER
read -p "SSH端口 [默认22]: " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

read -p "部署目录 [默认/opt/minesweeper]: " DEPLOY_DIR
DEPLOY_DIR=${DEPLOY_DIR:-/opt/minesweeper}

echo ""
echo -e "${YELLOW}🔐 SSH连接配置:${NC}"
echo "服务器: $SSH_USER@$SERVER_IP:$SSH_PORT"
echo "部署目录: $DEPLOY_DIR"
echo ""

read -p "确认继续部署? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "部署取消"
    exit 1
fi

# 检查部署包
DEPLOY_PACKAGE=$(ls -t minesweeper-deploy-*.tar.gz 2>/dev/null | head -1)
if [ -z "$DEPLOY_PACKAGE" ]; then
    echo -e "${RED}❌ 错误: 找不到部署包${NC}"
    echo -e "${YELLOW}💡 请先运行 './build-production.sh' 创建部署包${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 找到部署包: $DEPLOY_PACKAGE${NC}"
echo ""

# 测试SSH连接
echo -e "${BLUE}🔗 测试SSH连接...${NC}"
ssh -p $SSH_PORT -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "echo 'SSH连接成功'" || {
    echo -e "${RED}❌ SSH连接失败${NC}"
    echo "请检查:"
    echo "1. 服务器IP和端口是否正确"
    echo "2. SSH密钥是否已配置"
    echo "3. 服务器是否运行SSH服务"
    exit 1
}

echo -e "${GREEN}✅ SSH连接正常${NC}"
echo ""

# 创建服务器安装脚本
echo -e "${BLUE}📝 创建服务器安装脚本...${NC}"
cat > server-install.sh << 'EOF'
#!/bin/bash

# 服务器端安装脚本
set -e

DEPLOY_DIR="$1"
PACKAGE_NAME="$2"

echo "🚀 开始服务器端安装..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 安装Node.js...${NC}"
    # 检测系统类型
    if command -v apt &> /dev/null; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install nodejs npm
    else
        echo -e "${RED}❌ 无法自动安装Node.js，请手动安装${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Node.js版本: $(node --version)${NC}"

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 安装PM2...${NC}"
    sudo npm install -g pm2
fi

echo -e "${GREEN}✅ PM2版本: $(pm2 --version)${NC}"

# 创建部署目录
sudo mkdir -p "$DEPLOY_DIR"
sudo chown $USER:$USER "$DEPLOY_DIR"

# 停止旧服务
echo -e "${BLUE}🛑 停止旧服务...${NC}"
pm2 stop minesweeper-game 2>/dev/null || true
pm2 delete minesweeper-game 2>/dev/null || true

# 备份旧版本
if [ -d "$DEPLOY_DIR/current" ]; then
    echo -e "${BLUE}💾 备份旧版本...${NC}"
    mv "$DEPLOY_DIR/current" "$DEPLOY_DIR/backup-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
fi

# 创建新目录
mkdir -p "$DEPLOY_DIR/current"
cd "$DEPLOY_DIR"

# 解压部署包
echo -e "${BLUE}📦 解压部署包...${NC}"
tar -xzf "$PACKAGE_NAME" -C current

cd current

# 安装依赖
echo -e "${BLUE}📦 安装依赖...${NC}"
npm ci --only=production

# 启动服务
echo -e "${BLUE}🚀 启动服务...${NC}"
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup | grep -v PM2 | bash || true

echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 服务状态:${NC}"
pm2 status

echo ""
echo -e "${BLUE}💡 常用命令:${NC}"
echo "查看日志: pm2 logs minesweeper-game"
echo "重启服务: pm2 restart minesweeper-game"
echo "停止服务: pm2 stop minesweeper-game"
echo "查看状态: pm2 status"
EOF

chmod +x server-install.sh

# 上传文件到服务器
echo -e "${BLUE}📤 上传文件到服务器...${NC}"

# 上传部署包
echo "上传部署包..."
scp -P $SSH_PORT "$DEPLOY_PACKAGE" $SSH_USER@$SERVER_IP:/tmp/

# 上传安装脚本
echo "上传安装脚本..."
scp -P $SSH_PORT server-install.sh $SSH_USER@$SERVER_IP:/tmp/

echo -e "${GREEN}✅ 文件上传完成${NC}"
echo ""

# 在服务器上执行安装
echo -e "${BLUE}🚀 在服务器上执行安装...${NC}"
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "chmod +x /tmp/server-install.sh && /tmp/server-install.sh '$DEPLOY_DIR' '/tmp/$DEPLOY_PACKAGE'"

echo ""
echo -e "${GREEN}🎉 服务器部署完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 获取服务器状态
echo -e "${BLUE}📊 获取服务器状态...${NC}"
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "cd $DEPLOY_DIR/current && pm2 status"

echo ""
echo -e "${BLUE}🌐 访问信息:${NC}"
if [ -f ".env.production" ]; then
    DOMAIN_URL=$(grep NEXTAUTH_URL .env.production | cut -d'=' -f2)
    echo "应用地址: $DOMAIN_URL"
else
    echo "应用地址: http://$SERVER_IP:3000"
fi

echo ""
echo -e "${BLUE}💡 远程管理命令:${NC}"
echo "查看日志: ssh -p $SSH_PORT $SSH_USER@$SERVER_IP 'pm2 logs minesweeper-game'"
echo "重启应用: ssh -p $SSH_PORT $SSH_USER@$SERVER_IP 'pm2 restart minesweeper-game'"
echo "查看状态: ssh -p $SSH_PORT $SSH_USER@$SERVER_IP 'pm2 status'"

# 清理临时文件
rm -f server-install.sh

echo ""
echo -e "${GREEN}✨ 部署脚本执行完成！${NC}"