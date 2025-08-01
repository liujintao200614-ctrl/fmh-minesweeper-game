const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// 读取 .env.local 文件
const envPath = path.join(__dirname, "../.env.local");
let SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;

if (!SERVER_PRIVATE_KEY && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/SERVER_PRIVATE_KEY=([a-fA-F0-9]+)/);
    if (match) {
        SERVER_PRIVATE_KEY = match[1];
    }
}

if (!SERVER_PRIVATE_KEY) {
    console.error("❌ SERVER_PRIVATE_KEY not found in environment variables");
    process.exit(1);
}

try {
    // 从私钥创建钱包获取地址
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    const serverAddress = wallet.address;
    
    console.log("🔑 Server Signer Configuration:");
    console.log("Private Key:", SERVER_PRIVATE_KEY);
    console.log("Server Address:", serverAddress);
    console.log("");
    console.log("📋 Use this address when deploying the contract:");
    console.log(`constructor(tokenAddress, "${serverAddress}")`);
    
} catch (error) {
    console.error("❌ Error deriving address from private key:", error.message);
    process.exit(1);
}