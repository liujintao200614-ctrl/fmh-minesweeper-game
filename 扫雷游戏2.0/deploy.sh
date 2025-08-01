#!/bin/bash

# 🚀 FMH Minesweeper 自动部署脚本
# 作者：刘晋滔 & Claude

set -e  # 遇到错误立即退出

echo "🚀 开始部署 FMH Minesweeper..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    log_info "✅ 依赖工具检查完成"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    if [ ! -f ".env.local" ]; then
        log_error ".env.local 文件不存在"
        log_info "请复制 .env.example 到 .env.local 并配置必要参数"
        exit 1
    fi
    
    # 检查关键环境变量
    source .env.local
    
    if [ -z "$PRIVATE_KEY" ]; then
        log_error "PRIVATE_KEY 未配置"
        exit 1
    fi
    
    if [ "$SERVER_PRIVATE_KEY" = "your_server_private_key_here_without_0x_prefix" ]; then
        log_error "SERVER_PRIVATE_KEY 需要配置为真实的私钥"
        exit 1
    fi
    
    log_info "✅ 环境变量检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    npm install
    log_info "✅ 依赖安装完成"
}

# 编译合约
compile_contracts() {
    log_info "编译智能合约..."
    npm run compile
    log_info "✅ 合约编译完成"
}

# 部署合约
deploy_contracts() {
    log_info "部署智能合约到 Monad 测试网..."
    
    # 检查账户余额
    log_info "检查部署账户余额..."
    
    # 部署合约
    npm run deploy
    
    if [ $? -eq 0 ]; then
        log_info "✅ 合约部署完成"
        log_warn "请检查部署日志，更新 .env.local 中的合约地址"
    else
        log_error "合约部署失败"
        exit 1
    fi
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_info "✅ 前端构建完成"
    else
        log_error "前端构建失败"
        exit 1
    fi
}

# 运行测试
run_tests() {
    log_info "运行基础测试..."
    
    # TypeScript 编译检查
    npx tsc --noEmit
    
    if [ $? -eq 0 ]; then
        log_info "✅ TypeScript 编译测试通过"
    else
        log_error "TypeScript 编译测试失败"
        exit 1
    fi
}

# 启动本地服务器
start_local_server() {
    log_info "启动本地开发服务器..."
    log_info "服务器将在 http://localhost:3000 启动"
    log_info "使用 Ctrl+C 停止服务器"
    npm run dev
}

# 显示部署后信息
show_deployment_info() {
    echo ""
    echo "🎉 部署完成！"
    echo "=================================="
    log_info "本地开发: npm run dev"
    log_info "生产构建: npm run build"
    log_info "生产启动: npm run start"
    echo ""
    log_info "📋 部署后检查清单："
    echo "  □ 更新 .env.local 中的合约地址"
    echo "  □ 测试钱包连接功能"
    echo "  □ 测试游戏完整流程"
    echo "  □ 检查排行榜功能"
    echo "  □ 验证奖励发放机制"
    echo ""
    log_warn "🔐 安全提醒："
    echo "  - 生产环境请使用不同的私钥"
    echo "  - 定期监控服务器账户余额"
    echo "  - 设置异常交易告警"
    echo ""
}

# 主函数
main() {
    echo "FMH Minesweeper 部署脚本"
    echo "当前目录: $(pwd)"
    echo "时间: $(date)"
    echo ""
    
    # 执行部署步骤
    check_dependencies
    check_env
    install_dependencies
    run_tests
    compile_contracts
    
    # 询问是否继续部署合约
    read -p "是否继续部署智能合约？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_contracts
    else
        log_info "跳过合约部署"
    fi
    
    build_frontend
    show_deployment_info
    
    # 询问是否启动本地服务器
    read -p "是否启动本地开发服务器？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_local_server
    else
        log_info "部署完成，使用 'npm run dev' 启动开发服务器"
    fi
}

# 脚本参数处理
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "FMH Minesweeper 部署脚本"
        echo ""
        echo "用法: ./deploy.sh [选项]"
        echo ""
        echo "选项:"
        echo "  help, -h, --help    显示帮助信息"
        echo "  contracts           仅部署合约"
        echo "  frontend            仅构建前端"
        echo "  test                仅运行测试"
        echo ""
        echo "无参数运行将执行完整部署流程"
        exit 0
        ;;
    "contracts")
        check_dependencies
        check_env
        install_dependencies
        compile_contracts
        deploy_contracts
        ;;
    "frontend")
        check_dependencies
        install_dependencies
        run_tests
        build_frontend
        ;;
    "test")
        check_dependencies
        install_dependencies
        run_tests
        ;;
    *)
        main
        ;;
esac