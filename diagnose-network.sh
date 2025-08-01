#!/bin/bash

# Monad Testnet连接诊断脚本
echo "🔍 Monad Testnet 连接诊断"
echo "========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1. 测试RPC连接...${NC}"
RPC_RESPONSE=$(curl -s -X POST https://testnet-rpc.monad.xyz \
    -H "Content-Type: application/json" \
    -d '{"method":"eth_chainId","params":[],"id":1,"jsonrpc":"2.0"}' \
    -w "HTTP_CODE:%{http_code}")

if [[ $RPC_RESPONSE == *"HTTP_CODE:200"* ]] && [[ $RPC_RESPONSE == *"0x279f"* ]]; then
    echo -e "${GREEN}✅ RPC连接正常 - Chain ID: 0x279f (10143)${NC}"
else
    echo -e "${RED}❌ RPC连接异常${NC}"
    echo "响应: $RPC_RESPONSE"
fi

echo ""
echo -e "${BLUE}2. 测试区块高度...${NC}"
BLOCK_RESPONSE=$(curl -s -X POST https://testnet-rpc.monad.xyz \
    -H "Content-Type: application/json" \
    -d '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}')

if [[ $BLOCK_RESPONSE == *"result"* ]]; then
    BLOCK_HEX=$(echo $BLOCK_RESPONSE | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    BLOCK_DEC=$((16#${BLOCK_HEX#0x}))
    echo -e "${GREEN}✅ 最新区块: $BLOCK_DEC${NC}"
else
    echo -e "${RED}❌ 无法获取区块高度${NC}"
fi

echo ""
echo -e "${BLUE}3. 检查合约地址...${NC}"

# 检查Minesweeper合约
MINESWEEPER_ADDR="0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27"
MINESWEEPER_CODE=$(curl -s -X POST https://testnet-rpc.monad.xyz \
    -H "Content-Type: application/json" \
    -d "{\"method\":\"eth_getCode\",\"params\":[\"$MINESWEEPER_ADDR\",\"latest\"],\"id\":1,\"jsonrpc\":\"2.0\"}")

if [[ $MINESWEEPER_CODE == *'"result":"0x"'* ]]; then
    echo -e "${YELLOW}⚠️  Minesweeper合约 ($MINESWEEPER_ADDR) 未部署${NC}"
else
    echo -e "${GREEN}✅ Minesweeper合约存在${NC}"
fi

# 检查FMH Token合约
FMH_ADDR="0x83aB028468ef2a5495Cc7964B3266437956231E2"
FMH_CODE=$(curl -s -X POST https://testnet-rpc.monad.xyz \
    -H "Content-Type: application/json" \
    -d "{\"method\":\"eth_getCode\",\"params\":[\"$FMH_ADDR\",\"latest\"],\"id\":1,\"jsonrpc\":\"2.0\"}")

if [[ $FMH_CODE == *'"result":"0x"'* ]]; then
    echo -e "${YELLOW}⚠️  FMH Token合约 ($FMH_ADDR) 未部署${NC}"
else
    echo -e "${GREEN}✅ FMH Token合约存在${NC}"
fi

echo ""
echo -e "${BLUE}4. 网络配置建议...${NC}"
echo "如果您遇到连接问题，请在MetaMask中手动添加网络："
echo "网络名称: Monad Testnet"
echo "RPC URL: https://testnet-rpc.monad.xyz"
echo "Chain ID: 10143"
echo "货币符号: MON"
echo "区块浏览器: https://testnet-explorer.monad.xyz"

echo ""
echo -e "${BLUE}5. 故障排除...${NC}"
echo "• 确保MetaMask已安装并已连接"
echo "• 检查网络连接"
echo "• 尝试刷新页面"
echo "• 查看浏览器控制台是否有错误信息"
echo "• 确认钱包中有足够的MON代币支付Gas费"

echo ""
echo -e "${GREEN}✨ 诊断完成！${NC}"