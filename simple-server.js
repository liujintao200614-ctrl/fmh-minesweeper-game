const http = require('http');
const fs = require('fs');
const path = require('path');

// 简单的静态文件服务器
const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './public/index.html';
  }

  // 如果文件不存在，返回简单的 HTML
  if (!fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FMH Minesweeper - 部署中</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .loading {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status {
            margin: 20px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 FMH Minesweeper</h1>
        <div class="loading"></div>
        <div class="status">
            <p>⚙️ 系统正在部署中...</p>
            <p>📡 正在启动区块链扫雷游戏</p>
            <p>🔧 请稍候，即将完成部署</p>
        </div>
        <div style="margin-top: 30px;">
            <p>🔗 <strong>当前地址:</strong> http://localhost:3002</p>
            <p>💎 <strong>FMH Token 地址:</strong> 0x83aB...31E2</p>
            <p>🎯 <strong>游戏合约地址:</strong> 0x4bE3...7C27</p>
        </div>
        <div style="margin-top: 20px; font-size: 0.9em; opacity: 0.8;">
            <p>✨ 功能包括：Web3 钱包连接、智能合约交互、代币奖励、排行榜</p>
        </div>
    </div>
    
    <script>
        // 每5秒检查一次 Next.js 服务器是否启动
        setInterval(() => {
            fetch('http://localhost:3000')
                .then(() => {
                    window.location.href = 'http://localhost:3000';
                })
                .catch(() => {
                    console.log('Next.js 服务器尚未启动...');
                });
        }, 5000);
    </script>
</body>
</html>
    `);
    return;
  }

  // 读取文件
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200);
      res.end(content);
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🚀 临时服务器启动成功！`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`⚙️  Next.js 服务器部署中，请稍候...`);
  console.log(`🔄 页面将自动重定向到完整版本`);
});