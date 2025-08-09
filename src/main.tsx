import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App-improved.tsx'

// 确保全局对象可用
if (typeof global === 'undefined') {
  (window as any).global = window
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)