# 📋 手动部署完整指南

## 🎯 部署概述

本指南将帮您一步步手动部署扫雷游戏到生产环境。

## ⚠️ 部署前准备

### 1. 系统要求
- Node.js 18+
- npm 或 yarn
- 服务器（VPS、云服务器等）
- 域名（可选，建议使用）

### 2. 需要准备的信息
- 🔐 部署私钥（用于合约部署）
- 🔐 服务器私钥（用于奖励签名，必须与部署私钥不同）
- 🌐 生产域名（如：https://yourdomain.com）
- 📋 合约地址（如果已部署）

## 🔧 步骤1: 准备服务器环境

### 1.1 连接到服务器
```bash
ssh user@your-server-ip
```

### 1.2 安装Node.js (如果未安装)
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs npm

# 验证安装
node --version
npm --version
```

### 1.3 安装PM2 (进程管理器)
```bash
sudo npm install -g pm2
```

## 📂 步骤2: 上传代码

### 2.1 方式1: 使用Git
```bash
# 在服务器上克隆代码
cd /var/www  # 或您选择的目录
git clone https://github.com/your-username/your-repo.git minesweeper
cd minesweeper
```

### 2.2 方式2: 直接上传
```bash
# 在本地打包
tar -czf minesweeper.tar.gz --exclude=node_modules --exclude=.git .

# 上传到服务器
scp minesweeper.tar.gz user@your-server:/var/www/

# 在服务器上解压
cd /var/www
tar -xzf minesweeper.tar.gz
mv 扫雷游戏2.0 minesweeper  # 重命名为简单名称
cd minesweeper
```

## 🔐 步骤3: 配置环境变量

### 3.1 创建生产环境配置
```bash
cd /var/www/minesweeper

# 创建.env.production文件
nano .env.production
```

### 3.2 环境变量内容 (复制并修改)
```bash
# 生产环境配置
NODE_ENV=production

# 私钥配置 (⚠️ 请使用您的真实私钥)
PRIVATE_KEY=你的部署私钥_不要包含0x前缀
SERVER_PRIVATE_KEY=你的服务器私钥_必须与部署私钥不同

# 网络配置
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 应用URL (⚠️ 修改为您的域名)
NEXTAUTH_URL=https://yourdomain.com
# 如果没有域名，可以临时使用IP
# NEXTAUTH_URL=http://your-server-ip:3000

# 合约地址 (如果已部署，请填入实际地址)
NEXT_PUBLIC_MINESWEEPER_CONTRACT=0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=0x83aB028468ef2a5495Cc7964B3266437956231E2

# 网络信息
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_NETWORK_NAME=Monad Testnet

# 生产优化
DISABLE_ESLINT=true
GENERATE_SOURCEMAP=false
NEXT_TELEMETRY_DISABLED=1
```

### 3.3 设置系统环境变量 (推荐)
```bash
# 将环境变量添加到系统配置
sudo nano /etc/environment

# 添加以下内容
NODE_ENV=production
PRIVATE_KEY=你的部署私钥
SERVER_PRIVATE_KEY=你的服务器私钥
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_MINESWEEPER_CONTRACT=0x你的合约地址
NEXT_PUBLIC_FMH_TOKEN_CONTRACT=0x你的代币地址
NEXT_PUBLIC_CHAIN_ID=10143

# 重新加载环境变量
source /etc/environment
```

## 📦 步骤4: 安装依赖和构建

### 4.1 安装依赖
```bash
cd /var/www/minesweeper

# 安装生产依赖
npm ci --only=production

# 如果需要开发依赖来构建
npm install
```

### 4.2 编译智能合约
```bash
npm run compile
```

### 4.3 构建Next.js应用
```bash
NODE_ENV=production npm run build
```

### 4.4 初始化数据库
```bash
npm run db:init
```

## 🔧 步骤5: 服务器配置

### 5.1 配置防火墙
```bash
# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 5.2 配置Nginx反向代理 (可选但推荐)
```bash
# 安装Nginx
sudo apt install nginx  # Ubuntu/Debian
# sudo yum install nginx  # CentOS/RHEL

# 创建配置文件
sudo nano /etc/nginx/sites-available/minesweeper
```

Nginx配置内容：
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/minesweeper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.3 配置SSL证书 (使用Let's Encrypt)
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 步骤6: 启动应用

### 6.1 使用PM2启动 (推荐)
```bash
cd /var/www/minesweeper

# 创建PM2配置文件
nano ecosystem.config.js
```

PM2配置内容：
```javascript
module.exports = {
  apps: [{
    name: 'minesweeper',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/minesweeper',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

启动应用：
```bash
# 创建日志目录
mkdir logs

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs minesweeper

# 设置开机自启
pm2 startup
pm2 save
```

### 6.2 直接启动 (简单方式)
```bash
cd /var/www/minesweeper

# 设置环境变量
export NODE_ENV=production

# 启动应用
npm start

# 或后台运行
nohup npm start > app.log 2>&1 &
```

## ✅ 步骤7: 验证部署

### 7.1 检查服务状态
```bash
# 检查PM2状态
pm2 status

# 检查端口监听
netstat -tulpn | grep :3000

# 检查Nginx状态
sudo systemctl status nginx
```

### 7.2 功能测试
- 访问您的域名或IP地址
- 测试钱包连接
- 测试游戏功能
- 检查网络切换

### 7.3 性能监控
```bash
# PM2监控面板
pm2 monit

# 查看系统资源
htop
# 或
top
```

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 端口被占用
```bash
# 查找占用进程
sudo lsof -i :3000
# 杀死进程
sudo kill -9 <PID>
```

#### 2. 权限问题
```bash
# 修改文件权限
sudo chown -R $USER:$USER /var/www/minesweeper
chmod -R 755 /var/www/minesweeper
```

#### 3. 数据库问题
```bash
# 重新初始化数据库
rm database/minesweeper.db
npm run db:init
```

#### 4. 内存不足
```bash
# 增加swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 监控和维护

### 日志查看
```bash
# PM2日志
pm2 logs minesweeper

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u nginx -f
```

### 定期维护
```bash
# 数据库维护
npm run db:maintenance

# 清理日志
pm2 flush

# 更新应用
git pull origin main
npm install
npm run build
pm2 restart minesweeper
```

## 🎉 部署完成！

如果按照以上步骤操作，您的扫雷游戏应该已经成功部署到生产环境。

### 下一步建议：
1. 设置域名DNS解析
2. 配置监控系统
3. 设置数据备份
4. 配置日志轮转
5. 优化性能参数

有问题请查看日志或联系技术支持！🚀