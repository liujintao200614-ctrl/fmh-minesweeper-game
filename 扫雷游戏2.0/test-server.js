const http = require('http');

const testServer = () => {
  console.log('🔍 测试服务器连接...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ 服务器响应状态: ${res.statusCode}`);
    console.log(`📍 服务器地址: http://localhost:3000`);
    console.log('🎉 服务器运行正常！');
    
    if (res.statusCode === 200) {
      console.log('');
      console.log('🌐 你可以通过以下地址访问扫雷游戏：');
      console.log('   http://localhost:3000');
      console.log('');
      console.log('📱 移动端访问：');
      console.log('   在同一网络下，可以用你的IP地址访问');
    }
  });

  req.on('error', (e) => {
    console.log(`❌ 连接失败: ${e.message}`);
    console.log('');
    console.log('🔧 可能的解决方案：');
    console.log('1. 确保 Next.js 服务器正在运行');
    console.log('2. 检查端口 3000 是否被占用');
    console.log('3. 重新启动服务器: npm run dev');
  });

  req.on('timeout', () => {
    console.log('⏰ 连接超时');
    req.destroy();
  });

  req.end();
};

// 等待一秒后测试，确保服务器启动完成
setTimeout(testServer, 1000);