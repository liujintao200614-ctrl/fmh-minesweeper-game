const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  
  // 处理根路径
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FMH 扫雷游戏 - 连接测试</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5rem;
        }
        .status {
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-size: 18px;
        }
        .info {
            background: #f0f0f0;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
        }
        .btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 FMH 扫雷游戏</h1>
        
        <div class="status">
            ✅ 服务器连接成功！
        </div>
        
        <div class="info">
            <h3>📋 连接信息：</h3>
            <p><strong>服务器地址：</strong> http://localhost:8888</p>
            <p><strong>当前时间：</strong> ${new Date().toLocaleString()}</p>
            <p><strong>状态：</strong> 正常运行</p>
        </div>
        
        <div>
            <button class="btn" onclick="window.location.reload()">🔄 刷新页面</button>
            <button class="btn" onclick="testConnection()">🔧 测试连接</button>
        </div>
        
        <div id="test-result" style="margin-top: 20px;"></div>
    </div>
    
    <script>
        console.log('🎯 FMH 扫雷游戏 - 连接测试页面加载成功');
        
        function testConnection() {
            const result = document.getElementById('test-result');
            result.innerHTML = '<div style="background: #2196F3; color: white; padding: 10px; border-radius: 5px;">🔄 测试连接中...</div>';
            
            fetch('/api/test')
                .then(response => response.json())
                .then(data => {
                    result.innerHTML = '<div style="background: #4CAF50; color: white; padding: 10px; border-radius: 5px;">✅ ' + data.message + '</div>';
                })
                .catch(error => {
                    result.innerHTML = '<div style="background: #f44336; color: white; padding: 10px; border-radius: 5px;">❌ 连接测试失败</div>';
                });
        }
    </script>
</body>
</html>
    `);
    return;
  }
  
  // API 测试端点
  if (req.url === '/api/test') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: true,
      message: 'API 连接测试成功！',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // 404 处理
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 - 页面未找到</h1><p><a href="/">返回首页</a></p>');
});

const PORT = 8888;
const HOST = '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`🚀 FMH 扫雷游戏测试服务器启动成功！`);
  console.log(`📍 访问地址: http://${HOST}:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log(`🔧 环境: Node.js ${process.version}`);
  console.log('');
  console.log('📋 可用的路由:');
  console.log('  GET  /           - 主页');
  console.log('  GET  /api/test   - API测试');
  console.log('');
  console.log('💡 如果看到这个消息，说明服务器已经成功启动！');
});

// 处理进程信号
process.on('SIGTERM', () => {
  console.log('\\n⏹️  服务器正在关闭...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\\n⏹️  收到中断信号，服务器正在关闭...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });
});