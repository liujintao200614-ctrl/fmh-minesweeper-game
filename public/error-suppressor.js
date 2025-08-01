// MetaMask 错误抑制器 - 必须在所有其他脚本之前运行
(function() {
  'use strict';
  
  console.log('MetaMask error suppressor loading...');
  
  // 1. 覆盖全局错误处理
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const msgStr = String(message || '');
    const sourceStr = String(source || '');
    
    // 检查是否是 MetaMask 相关错误
    if (msgStr.includes('Failed to connect to MetaMask') ||
        msgStr.includes('MetaMask') ||
        msgStr.includes('chrome-extension') ||
        sourceStr.includes('chrome-extension')) {
      console.warn('MetaMask error suppressed by global handler:', msgStr);
      return true; // 阻止默认错误处理
    }
    
    // 如果不是 MetaMask 错误，使用原始处理器
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // 2. 覆盖 unhandledrejection 处理
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = event.reason;
    const reasonStr = String(reason?.message || reason || '');
    const stackStr = String(reason?.stack || '');
    
    // 检查是否是 MetaMask 相关错误
    if (reasonStr.includes('Failed to connect to MetaMask') ||
        reasonStr.includes('MetaMask') ||
        reasonStr.includes('chrome-extension') ||
        stackStr.includes('chrome-extension')) {
      console.warn('MetaMask promise rejection suppressed:', reasonStr);
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
    
    // 如果不是 MetaMask 错误，使用原始处理器
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(this, event);
    }
    return false;
  };
  
  // 3. 覆盖 console.error 来静默 MetaMask 错误
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorStr = args.join(' ');
    if (errorStr.includes('Failed to connect to MetaMask') ||
        errorStr.includes('chrome-extension')) {
      console.warn('MetaMask console error suppressed:', errorStr);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  // 4. 等待并拦截 Next.js 错误覆盖层
  const interceptNextJSErrorOverlay = () => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'unhandledrejection' || type === 'error') {
        const wrappedListener = function(event) {
          const isMetaMaskError = 
            event.reason?.message?.includes('Failed to connect to MetaMask') ||
            event.reason?.message?.includes('MetaMask') ||
            event.reason?.message?.includes('chrome-extension') ||
            event.error?.message?.includes('Failed to connect to MetaMask') ||
            event.error?.message?.includes('MetaMask') ||
            event.error?.message?.includes('chrome-extension') ||
            event.message?.includes('Failed to connect to MetaMask') ||
            event.message?.includes('chrome-extension');
            
          if (isMetaMaskError) {
            console.warn('Next.js error overlay MetaMask error blocked');
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }
          
          if (typeof listener === 'function') {
            return listener.call(this, event);
          }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  };
  
  // 5. 立即拦截，并在 DOM 加载后再次拦截
  interceptNextJSErrorOverlay();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptNextJSErrorOverlay);
  } else {
    setTimeout(interceptNextJSErrorOverlay, 0);
  }
  
  // 6. 定期检查并移除 Next.js 错误覆盖层
  const removeNextJSErrorOverlay = () => {
    const errorOverlay = document.querySelector('[data-nextjs-dialog-overlay]') ||
                         document.querySelector('#__next-dev-error-overlay') ||
                         document.querySelector('.nextjs-container-errors-header');
    
    if (errorOverlay) {
      const errorText = errorOverlay.textContent || '';
      if (errorText.includes('Failed to connect to MetaMask') ||
          errorText.includes('chrome-extension')) {
        console.warn('Removing Next.js MetaMask error overlay');
        errorOverlay.remove();
      }
    }
    
    // 移除所有包含 MetaMask 错误的对话框
    const allOverlays = document.querySelectorAll('[role="dialog"], .error-overlay, [data-testid="error-overlay"]');
    allOverlays.forEach(overlay => {
      const text = overlay.textContent || '';
      if (text.includes('Failed to connect to MetaMask') ||
          text.includes('chrome-extension')) {
        console.warn('Removing MetaMask error dialog');
        overlay.remove();
      }
    });
  };
  
  // 每100ms检查一次错误覆盖层
  setInterval(removeNextJSErrorOverlay, 100);
  
  console.log('MetaMask error suppressor fully loaded');
})();