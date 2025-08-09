import React from 'react';

export default function SimpleApp() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1>🎯 FMH Minesweeper Test</h1>
      <div style={{
        background: 'white',
        color: '#333',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '600px'
      }}>
        <h2>✅ React 应用运行成功！</h2>
        <p>当前时间: {new Date().toLocaleString('zh-CN')}</p>
        <p>React 版本: {React.version}</p>
        <div style={{ marginTop: '20px' }}>
          <button 
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={() => alert('按钮点击成功！React 工作正常。')}
          >
            测试点击
          </button>
        </div>
        <div style={{ 
          background: '#f0f0f0', 
          padding: '15px', 
          borderRadius: '8px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <h3>🔧 调试信息:</h3>
          <ul>
            <li><strong>页面地址:</strong> {window.location.href}</li>
            <li><strong>用户代理:</strong> {navigator.userAgent.slice(0, 50)}...</li>
            <li><strong>屏幕分辨率:</strong> {window.screen.width}x{window.screen.height}</li>
            <li><strong>Vite 热重载:</strong> {import.meta.hot ? '✅ 已启用' : '❌ 未启用'}</li>
          </ul>
        </div>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p>如果你看到这个页面，说明:</p>
          <ul style={{ textAlign: 'left' }}>
            <li>✅ Vite 开发服务器工作正常</li>
            <li>✅ React 渲染成功</li>
            <li>✅ TypeScript 编译正常</li>
            <li>✅ 网络连接正常</li>
          </ul>
          <p><strong>下一步:</strong> 可以切换到完整版本的 FMH 扫雷游戏</p>
        </div>
      </div>
    </div>
  );
}