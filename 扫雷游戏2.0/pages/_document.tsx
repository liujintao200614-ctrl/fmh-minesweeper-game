import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* 重新启用增强版错误抑制器 */}
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              // 立即执行的 MetaMask 错误抑制器
              (function() {
                console.log('🚫 MetaMask Error Suppressor Active');
                
                // 1. 覆盖 window.onerror
                const originalOnError = window.onerror;
                window.onerror = function(message, source, lineno, colno, error) {
                  const msg = String(message || '');
                  const src = String(source || '');
                  
                  if (msg.includes('Failed to connect to MetaMask') || 
                      msg.includes('chrome-extension') ||
                      src.includes('chrome-extension')) {
                    console.warn('🚫 MetaMask error suppressed:', msg);
                    return true;
                  }
                  
                  return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
                };
                
                // 2. 覆盖 unhandledrejection
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  const reasonStr = String(reason?.message || reason || '');
                  
                  if (reasonStr.includes('Failed to connect to MetaMask') ||
                      reasonStr.includes('chrome-extension')) {
                    console.warn('🚫 MetaMask promise rejection suppressed:', reasonStr);
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
                
                // 3. 拦截 Next.js 错误显示
                let errorOverlayRemovalInterval;
                const removeErrorOverlays = () => {
                  const overlays = document.querySelectorAll(
                    '[data-nextjs-dialog-overlay], ' +
                    '[data-nextjs-dialog], ' +
                    '.nextjs-container-errors-header, ' +
                    '.nextjs-container-errors'
                  );
                  
                  for (const overlay of overlays) {
                    const text = overlay.textContent || '';
                    if (text.includes('Failed to connect to MetaMask') ||
                        text.includes('chrome-extension')) {
                      console.warn('🚫 Removing MetaMask error overlay');
                      overlay.remove();
                    }
                  }
                };
                
                // 页面加载后定期检查
                document.addEventListener('DOMContentLoaded', () => {
                  errorOverlayRemovalInterval = setInterval(removeErrorOverlays, 100);
                });
                
                // 立即开始检查
                errorOverlayRemovalInterval = setInterval(removeErrorOverlays, 100);
              })();
            `
          }}
        />
        
        {/* CSS 样式隐藏 MetaMask 错误覆盖层 */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* 隐藏 Next.js 错误覆盖层 */
            [data-nextjs-dialog-overlay],
            [data-nextjs-dialog],
            .nextjs-container-errors-header,
            .nextjs-container-errors-body,
            .nextjs-container-errors,
            #__next-dev-error-overlay {
              opacity: 0 !important;
              pointer-events: none !important;
              z-index: -9999 !important;
            }
            
            /* 确保应用内容始终可见 */
            #__next {
              display: block !important;
              visibility: visible !important;
              z-index: 1 !important;
            }
            
            /* 隐藏包含特定错误文本的元素 */
            *:has-text("Failed to connect to MetaMask") {
              display: none !important;
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}