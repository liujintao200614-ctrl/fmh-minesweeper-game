// MetaMask 检测和连接工具函数
export const detectMetaMask = async (timeout = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const checkInterval = 100;
    let elapsed = 0;

    const check = () => {
      const ethereum = (window as any).ethereum;
      
      if (ethereum) {
        // 验证是否真的是 MetaMask
        if (ethereum.isMetaMask) {
          resolve(ethereum);
          return;
        }
        // 如果有以太坊提供者但不是 MetaMask
        if (ethereum.providers) {
          // 检查是否有 MetaMask 在提供者数组中
          const metamaskProvider = ethereum.providers.find((provider: any) => provider.isMetaMask);
          if (metamaskProvider) {
            resolve(metamaskProvider);
            return;
          }
        }
      }

      elapsed += checkInterval;
      if (elapsed >= timeout) {
        reject(new Error('MetaMask not detected within timeout'));
      } else {
        setTimeout(check, checkInterval);
      }
    };

    check();
  });
};

export const isMetaMaskInstalled = (): boolean => {
  const ethereum = (window as any).ethereum;
  return !!(ethereum && ethereum.isMetaMask);
};

export const getMetaMaskProvider = () => {
  const ethereum = (window as any).ethereum;
  
  if (!ethereum) return null;
  
  // 如果直接是 MetaMask
  if (ethereum.isMetaMask) {
    return ethereum;
  }
  
  // 如果是多个钱包的情况，查找 MetaMask
  if (ethereum.providers) {
    return ethereum.providers.find((provider: any) => provider.isMetaMask) || null;
  }
  
  return null;
};

// 安全的 MetaMask 方法调用
export const safeMetaMaskCall = async (method: string, params?: any[]): Promise<any> => {
  const provider = getMetaMaskProvider();
  
  if (!provider) {
    throw new Error('MetaMask not found');
  }
  
  try {
    // 添加超时保护
    const requestPromise = provider.request({ method, params });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MetaMask request timeout')), 10000)
    );
    
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error: any) {
    console.error(`MetaMask ${method} error:`, error);
    
    // 提供更具体的错误消息
    if (error.code === 4001) {
      throw new Error('User rejected the request');
    } else if (error.code === -32002) {
      throw new Error('MetaMask is already processing a request');
    } else if (error.code === -32603) {
      throw new Error('MetaMask internal error');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Request timeout - please try again');
    } else {
      throw new Error(`MetaMask ${method} failed: ${error.message || 'Unknown error'}`);
    }
  }
};