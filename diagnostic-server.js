const http = require('http');
const path = require('path');

const PORT = 3333;
const HOST = '0.0.0.0';

console.log('🔧 FMH Diagnostic Server Starting...');
console.log(`📍 Binding to: ${HOST}:${PORT}`);

const server = http.createServer((req, res) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url} - ${req.headers.host || 'no-host'}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 FMH 扫雷游戏 - 连接诊断</title>
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
            max-width: 800px;
            width: 100%;
        }
        .status { background: #4CAF50; color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info { background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
        .btn { background: #4CAF50; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; margin: 10px; }
        .network-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .network-item { background: #e3f2fd; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 FMH Minesweeper - 连接诊断成功！</h1>
        
        <div class="status">
            ✅ 网络连接已建立 - 服务器正常运行
        </div>
        
        <div class="info">
            <h3>📋 连接信息：</h3>
            <div class="network-info">
                <div class="network-item">
                    <strong>🌐 服务器地址：</strong><br>
                    http://localhost:${PORT}<br>
                    http://127.0.0.1:${PORT}
                </div>
                <div class="network-item">
                    <strong>⏰ 服务器时间：</strong><br>
                    ${new Date().toLocaleString('zh-CN')}
                </div>
                <div class="network-item">
                    <strong>🔧 Node.js 版本：</strong><br>
                    ${process.version}
                </div>
                <div class="network-item">
                    <strong>💻 系统平台：</strong><br>
                    ${process.platform} (${process.arch})
                </div>
            </div>
        </div>
        
        <div style="margin: 30px 0;">
            <h3>🎮 下一步操作：</h3>
            <p>连接测试成功！现在可以启动 FMH 扫雷游戏。</p>
            <button class="btn" onclick="window.location.reload()">🔄 刷新测试</button>
            <button class="btn" onclick="testAPI()">🧪 API 测试</button>
            <button class="btn" onclick="startGame()">🎯 启动游戏</button>
        </div>
        
        <div id="test-result" style="margin-top: 20px;"></div>
        
        <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 10px;">
            <h4>📋 故障排除信息:</h4>
            <ul style="text-align: left; color: #856404;">
                <li><strong>如果此页面显示:</strong> 网络连接正常 ✅</li>
                <li><strong>如果无法访问:</strong> 可能是防火墙或代理设置问题</li>
                <li><strong>浏览器要求:</strong> 支持现代 JavaScript 和 ES6</li>
                <li><strong>推荐浏览器:</strong> Chrome, Firefox, Safari, Edge</li>
            </ul>
        </div>
    </div>
    
    <script>
        console.log('🎯 FMH 扫雷游戏诊断页面加载成功');
        console.log('🌐 当前地址:', window.location.href);
        console.log('🔧 User Agent:', navigator.userAgent);
        
        function testAPI() {
            const result = document.getElementById('test-result');
            result.innerHTML = '<div style="background: #2196F3; color: white; padding: 15px; border-radius: 8px;">🔄 正在测试 API...</div>';
            
            fetch('/api/test')
                .then(response => response.json())
                .then(data => {
                    result.innerHTML = '<div style="background: #4CAF50; color: white; padding: 15px; border-radius: 8px;">✅ API 测试成功: ' + data.message + '</div>';
                })
                .catch(error => {
                    result.innerHTML = '<div style="background: #f44336; color: white; padding: 15px; border-radius: 8px;">❌ API 测试失败: ' + error.message + '</div>';
                });
        }
        
        function startGame() {
            const result = document.getElementById('test-result');
            result.innerHTML = '<div style="background: #ff9800; color: white; padding: 15px; border-radius: 8px;">🚀 准备启动 FMH 扫雷游戏...</div>';
            
            setTimeout(() => {
                result.innerHTML = '<div style="background: #4CAF50; color: white; padding: 15px; border-radius: 8px;">🎯 请在新标签页中启动: <a href="http://localhost:5173" style="color: white; text-decoration: underline;" target="_blank">http://localhost:5173</a></div>';
            }, 1500);
        }
    </script>
</body>
</html>`);
    return;
  }
  
  if (req.url === '/api/test') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: true,
      message: 'API 连接测试成功！诊断服务器工作正常。',
      timestamp: new Date().toISOString(),
      server: 'FMH Diagnostic Server v1.0',
      port: PORT,
      host: HOST
    }));
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<h1>404 - 页面未找到</h1><p><a href="/">返回首页</a></p>`);
});

server.listen(PORT, HOST, () => {
  console.log(`✅ FMH 诊断服务器启动成功！`);
  console.log(`🌐 本地访问地址: http://${HOST}:${PORT}`);
  console.log(`🌐 localhost 访问: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`🔧 Node.js 版本: ${process.version}`);
  console.log(`💻 运行平台: ${process.platform} (${process.arch})`);
  console.log('');
  console.log('📋 测试指南:');
  console.log('1. 在浏览器中打开: http://localhost:3000');  
  console.log('2. 如果看到诊断页面，说明连接正常');
  console.log('3. 如果无法访问，请检查防火墙设置');
  console.log('');
  console.log('💡 按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\\n⏹️  收到终止信号，服务器正在关闭...');
  server.close(() => {
    console.log('✅ 诊断服务器已安全关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\\n⏹️  收到中断信号，服务器正在关闭...');
  server.close(() => {
    console.log('✅ 诊断服务器已安全关闭');
    process.exit(0);
  });
});

// 错误处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用！`);
    console.log('💡 解决方案:');
    console.log(`   1. 运行: lsof -ti:${PORT} | xargs kill -9`);
    console.log(`   2. 或者修改 PORT 变量使用其他端口`);
  } else {
    console.error('❌ 服务器启动失败:', err.message);
  }
  process.exit(1);
});