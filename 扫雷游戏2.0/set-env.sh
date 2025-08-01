#!/bin/bash

# 设置Claude Code环境变量

echo "🔧 设置Claude Code环境变量..."

# 设置最大输出token数
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192

echo "✅ CLAUDE_CODE_MAX_OUTPUT_TOKENS 已设置为: $CLAUDE_CODE_MAX_OUTPUT_TOKENS"

# 可选：将环境变量添加到shell配置文件以持久化
read -p "是否要将此环境变量永久添加到您的shell配置文件? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 检测shell类型
    if [[ $SHELL == *"zsh"* ]]; then
        echo "export CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192" >> ~/.zshrc
        echo "✅ 已添加到 ~/.zshrc"
        echo "请运行 'source ~/.zshrc' 或重启终端以生效"
    elif [[ $SHELL == *"bash"* ]]; then
        echo "export CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192" >> ~/.bashrc
        echo "✅ 已添加到 ~/.bashrc"
        echo "请运行 'source ~/.bashrc' 或重启终端以生效"
    else
        echo "⚠️  未识别的shell类型: $SHELL"
        echo "请手动添加以下行到您的shell配置文件:"
        echo "export CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192"
    fi
fi

echo ""
echo "🎯 常用的token数设置:"
echo "  - 4096: 标准输出"
echo "  - 8192: 长输出"
echo "  - 16384: 超长输出"
echo "  - 32768: 最大输出"

echo ""
echo "📝 当前环境变量状态:"
env | grep CLAUDE_CODE || echo "未找到CLAUDE_CODE相关环境变量"