#!/bin/bash

# FMH开发服务器启动脚本 (Bash版本)
# 解决file://协议下MetaMask弹窗被拦截的问题

PORT=8080
HOST="localhost"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 打印彩色输出
print_color() {
    echo -e "${1}${2}${NC}"
}

# 检查端口是否可用
check_port() {
    local port=$1
    if ! lsof -i :$port > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 查找可用端口
find_available_port() {
    local start_port=$1
    local max_attempts=10
    
    for ((port=start_port; port<start_port+max_attempts; port++)); do
        if check_port $port; then
            echo $port
            return 0
        fi
    done
    
    echo $start_port
    return 1
}

# 启动服务器
start_server() {
    # 切换到脚本所在目录
    cd "$(dirname "$0")"
    
    # 查找可用端口
    AVAILABLE_PORT=$(find_available_port $PORT)
    if [ $? -eq 0 ]; then
        PORT=$AVAILABLE_PORT
        print_color $GREEN "✅ 使用端口: $PORT"
    else
        print_color $YELLOW "⚠️  端口 $PORT 可能被占用，继续尝试..."
    fi
    
    SERVER_URL="http://$HOST:$PORT"
    
    print_color $CYAN "=" "=========================================================="
    print_color $WHITE "🚀 FMH开发服务器启动中..."
    print_color $CYAN "=" "=========================================================="
    print_color $BLUE "📁 工作目录: $(pwd)"
    print_color $BLUE "📡 服务器地址: $SERVER_URL"
    print_color $BLUE "🎯 管理面板: $SERVER_URL/FMH-Management-Panel.html"
    print_color $BLUE "🔧 调试面板: $SERVER_URL/FMH-Connection-Diagnostic.html"
    print_color $CYAN "=" "=========================================================="
    print_color $GREEN "💡 提示:"
    print_color $WHITE "  • 现在MetaMask弹窗应该可以正常显示"
    print_color $WHITE "  • 按 Ctrl+C 停止服务器"
    print_color $WHITE "  • 修改HTML文件后刷新浏览器即可看到更新"
    print_color $CYAN "=" "=========================================================="
    
    # 延迟打开浏览器
    (
        sleep 3
        print_color $CYAN "🌐 正在打开浏览器..."
        
        if [ -f "FMH-Management-Panel.html" ]; then
            open "$SERVER_URL/FMH-Management-Panel.html" 2>/dev/null || \
            xdg-open "$SERVER_URL/FMH-Management-Panel.html" 2>/dev/null
            print_color $GREEN "✅ 已打开管理面板: FMH-Management-Panel.html"
        elif [ -f "FMH-Connection-Diagnostic.html" ]; then
            open "$SERVER_URL/FMH-Connection-Diagnostic.html" 2>/dev/null || \
            xdg-open "$SERVER_URL/FMH-Connection-Diagnostic.html" 2>/dev/null
            print_color $GREEN "✅ 已打开诊断面板: FMH-Connection-Diagnostic.html"
        else
            open "$SERVER_URL" 2>/dev/null || xdg-open "$SERVER_URL" 2>/dev/null
            print_color $GREEN "✅ 已打开服务器主页"
        fi
    ) &
    
    # 启动HTTP服务器
    print_color $YELLOW "⏳ 服务器运行中..."
    
    # 优先使用Python3，然后尝试Python
    if command -v python3 &> /dev/null; then
        python3 -m http.server $PORT --bind $HOST
    elif command -v python &> /dev/null; then
        python -m http.server $PORT --bind $HOST
    else
        print_color $RED "❌ 未找到Python，请安装Python3"
        exit 1
    fi
}

# 检查文件
check_files() {
    local missing_files=()
    
    if [ ! -f "FMH-Management-Panel.html" ]; then
        missing_files+=("FMH-Management-Panel.html")
    fi
    
    if [ ! -f "FMH-Connection-Diagnostic.html" ]; then
        missing_files+=("FMH-Connection-Diagnostic.html")
    fi
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_color $YELLOW "⚠️  以下文件不存在:"
        for file in "${missing_files[@]}"; do
            print_color $WHITE "   - $file"
        done
        print_color $BLUE "💡 请确保HTML文件在当前目录中"
        return 1
    fi
    
    return 0
}

# 显示帮助
show_help() {
    cat << EOF

🔧 FMH开发服务器使用说明
========================================

基本用法:
  ./start-dev-server.sh          # 启动开发服务器
  ./start-dev-server.sh --help   # 显示此帮助

功能特点:
  ✅ 解决file://协议下MetaMask弹窗被拦截问题
  ✅ 自动查找可用端口（8080起）
  ✅ 自动打开浏览器
  ✅ 支持热重载（修改文件后刷新即可）
  ✅ 跨平台支持（macOS/Linux）

开发流程:
  1. 运行此脚本启动服务器
  2. 在浏览器中访问 http://localhost:8080
  3. 正常连接MetaMask进行测试
  4. 修改HTML文件，刷新浏览器查看效果
  5. 按Ctrl+C停止服务器

故障排除:
  • 如果端口被占用，脚本会自动找下一个可用端口
  • 确保Python3已安装
  • 确保HTML文件在脚本同一目录下
  • 给脚本执行权限: chmod +x start-dev-server.sh

EOF
}

# 清理函数
cleanup() {
    print_color $YELLOW "\n👋 FMH开发服务器已停止"
    print_color $CYAN "=========================================================="
    exit 0
}

# 捕获Ctrl+C信号
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    # 检查命令行参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi
    
    print_color $CYAN "🚀 正在启动FMH开发服务器..."
    
    # 检查文件
    if ! check_files; then
        print_color $BLUE "💡 提示: 可以继续启动服务器，但建议先检查文件"
        read -p "按Enter继续，或按Ctrl+C取消..."
    fi
    
    # 启动服务器
    start_server
}

# 运行主函数
main "$@"