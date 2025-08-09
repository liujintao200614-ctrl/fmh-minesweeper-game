#!/usr/bin/env python3
"""
FMH开发服务器启动脚本
解决file://协议下MetaMask弹窗被拦截的问题
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time
from pathlib import Path

# 服务器配置
PORT = 8080
HOST = 'localhost'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加CORS头部"""
    
    def end_headers(self):
        # 添加CORS头部，允许跨域请求（MetaMask需要）
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # 添加安全头部
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        super().end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{time.strftime('%H:%M:%S')}] {format % args}")

def find_available_port(start_port=8080, max_attempts=10):
    """查找可用端口"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer(("", port), None) as s:
                return port
        except OSError:
            continue
    return None

def start_server():
    """启动HTTP服务器"""
    global PORT
    
    # 查找可用端口
    available_port = find_available_port(PORT)
    if available_port:
        PORT = available_port
        print(f"✅ 使用端口: {PORT}")
    else:
        print("❌ 找不到可用端口，使用默认端口 8080")
    
    # 切换到当前目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"📁 工作目录: {os.getcwd()}")
    
    try:
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            server_url = f"http://{HOST}:{PORT}"
            
            print("=" * 60)
            print("🚀 FMH开发服务器启动成功!")
            print("=" * 60)
            print(f"📡 服务器地址: {server_url}")
            print(f"🎯 管理面板: {server_url}/FMH-Management-Panel.html")
            print(f"🔧 调试面板: {server_url}/FMH-Connection-Diagnostic.html")
            print("=" * 60)
            print("💡 提示:")
            print("  • 现在MetaMask弹窗应该可以正常显示")
            print("  • 按 Ctrl+C 停止服务器")
            print("  • 修改HTML文件后刷新浏览器即可看到更新")
            print("=" * 60)
            
            # 延迟打开浏览器
            def open_browser():
                time.sleep(2)
                print("🌐 正在打开浏览器...")
                
                # 检查文件是否存在并打开相应页面
                if os.path.exists('FMH-Management-Panel.html'):
                    webbrowser.open(f"{server_url}/FMH-Management-Panel.html")
                    print(f"✅ 已打开管理面板: FMH-Management-Panel.html")
                elif os.path.exists('FMH-Connection-Diagnostic.html'):
                    webbrowser.open(f"{server_url}/FMH-Connection-Diagnostic.html")
                    print(f"✅ 已打开诊断面板: FMH-Connection-Diagnostic.html")
                else:
                    webbrowser.open(server_url)
                    print(f"✅ 已打开服务器主页")
            
            # 在后台线程中打开浏览器
            browser_thread = threading.Thread(target=open_browser)
            browser_thread.daemon = True
            browser_thread.start()
            
            # 启动服务器
            print("⏳ 服务器运行中...")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n")
        print("=" * 60)
        print("👋 FMH开发服务器已停止")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

def check_files():
    """检查必要的文件"""
    files_to_check = [
        'FMH-Management-Panel.html',
        'FMH-Connection-Diagnostic.html'
    ]
    
    missing_files = []
    for file in files_to_check:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("⚠️ 以下文件不存在:")
        for file in missing_files:
            print(f"   - {file}")
        print("💡 请确保HTML文件在当前目录中")
        return False
    
    return True

def show_help():
    """显示帮助信息"""
    print("""
🔧 FMH开发服务器使用说明
========================================

基本用法:
  python3 start-dev-server.py          # 启动开发服务器
  python3 start-dev-server.py --help   # 显示此帮助

功能特点:
  ✅ 解决file://协议下MetaMask弹窗被拦截问题
  ✅ 自动查找可用端口（8080起）
  ✅ 添加必要的CORS和安全头部
  ✅ 自动打开浏览器
  ✅ 支持热重载（修改文件后刷新即可）

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
""")

if __name__ == "__main__":
    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        show_help()
        sys.exit(0)
    
    print("🚀 正在启动FMH开发服务器...")
    
    # 检查Python版本
    if sys.version_info < (3, 6):
        print("❌ 需要Python 3.6或更高版本")
        sys.exit(1)
    
    # 检查文件
    if not check_files():
        print("💡 提示: 可以继续启动服务器，但建议先检查文件")
        input("按Enter继续，或按Ctrl+C取消...")
    
    # 启动服务器
    start_server()