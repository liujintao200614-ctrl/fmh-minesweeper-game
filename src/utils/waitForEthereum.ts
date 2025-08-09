/**
 * 等待 MetaMask 或其他 Ethereum 提供者注入到 window.ethereum
 * 解决插件加载尚未完成时调用连接过早的问题
 */

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isConnected?: () => boolean;
  chainId?: string;
  selectedAddress?: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * 等待 window.ethereum 对象注入完成
 * @param timeout 超时时间（毫秒），默认10秒
 * @returns Promise<EthereumProvider>
 */
export function waitForEthereum(timeout = 10000): Promise<EthereumProvider> {
  return new Promise((resolve, reject) => {
    // 如果已经存在，立即返回
    if (window.ethereum) {
      console.log('✅ MetaMask already injected');
      return resolve(window.ethereum);
    }

    let elapsed = 0;
    const interval = 100; // 检查间隔100毫秒
    
    console.log('⏳ Waiting for MetaMask injection...');
    
    const timer = setInterval(() => {
      elapsed += interval;
      
      if (window.ethereum) {
        clearInterval(timer);
        console.log(`✅ MetaMask detected after ${elapsed}ms`);
        resolve(window.ethereum);
      } else if (elapsed >= timeout) {
        clearInterval(timer);
        console.error(`❌ MetaMask not found after ${timeout}ms`);
        reject(new Error('MetaMask not found. Please install MetaMask browser extension from metamask.io'));
      }
    }, interval);
  });
}

/**
 * 检测并等待 MetaMask 准备完成
 * @param timeout 超时时间（毫秒），默认15秒
 * @returns Promise<EthereumProvider>
 */
export async function ensureMetaMaskReady(timeout = 15000): Promise<EthereumProvider> {
  console.log('🔍 Ensuring MetaMask is ready...');
  
  try {
    // 第一步：等待 ethereum 对象注入
    const ethereum = await waitForEthereum(timeout);
    
    // 第二步：检查 MetaMask 是否已经初始化
    if (!ethereum.isMetaMask) {
      console.warn('⚠️ Non-MetaMask provider detected, proceeding anyway...');
    }
    
    // 第三步：等待 MetaMask 完全初始化（可选）
    // 某些情况下，即使 ethereum 对象存在，MetaMask 可能还在初始化
    let initWaitTime = 0;
    const initCheckInterval = 200;
    const maxInitWaitTime = 3000; // 最多等待3秒
    
    while (initWaitTime < maxInitWaitTime) {
      try {
        // 尝试获取当前链ID作为初始化检查
        await ethereum.request({ method: 'eth_chainId' });
        console.log('✅ MetaMask fully initialized');
        break;
      } catch (error) {
        // 如果失败，继续等待
        console.log(`⏳ MetaMask still initializing... (${initWaitTime}ms)`);
        await new Promise(resolve => setTimeout(resolve, initCheckInterval));
        initWaitTime += initCheckInterval;
      }
    }
    
    return ethereum;
    
  } catch (error) {
    console.error('❌ MetaMask readiness check failed:', error);
    throw error;
  }
}

/**
 * 安全地请求账户连接
 * @param ethereum Ethereum 提供者
 * @param timeout 超时时间（毫秒），默认30秒
 * @returns Promise<string[]> 账户数组
 */
export async function requestAccountsSafely(
  ethereum: EthereumProvider, 
  timeout = 30000
): Promise<string[]> {
  console.log('🔐 Requesting account access safely...');
  
  try {
    // 先检查是否已有连接的账户
    console.log('🔍 Checking existing accounts...');
    let accounts: string[] = [];
    
    try {
      accounts = await ethereum.request({ method: 'eth_accounts' });
      console.log('📋 Existing accounts:', accounts);
    } catch (checkError) {
      console.warn('⚠️ Failed to check existing accounts:', checkError);
      accounts = [];
    }
    
    // 如果已有账户，直接返回
    if (accounts && accounts.length > 0) {
      console.log('✅ Using existing connected accounts');
      return accounts;
    }
    
    // 请求新的账户连接，添加超时处理
    console.log('🔐 Requesting new account access...');
    console.log('💡 Please check your MetaMask extension for the connection request');
    
    // 特殊处理 Brave 浏览器
    const isBrave = !!(navigator as any)?.brave;
    if (isBrave) {
      console.log('🦁 Brave browser detected, adding delay...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const requestPromise = ethereum.request({ method: 'eth_requestAccounts' });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `Connection request timed out after ${timeout / 1000} seconds. ` +
          'Please manually connect via MetaMask extension.'
        ));
      }, timeout);
    });
    
    const newAccounts = await Promise.race([requestPromise, timeoutPromise]);
    
    console.log('✅ Successfully received accounts:', newAccounts);
    return newAccounts;
    
  } catch (error: any) {
    console.error('❌ Account request failed:', error);
    
    // 提供更友好的错误信息
    if (error.code === 4001) {
      const isBrave = !!(navigator as any)?.brave;
      if (isBrave) {
        throw new Error(
          'Connection rejected. For Brave browser: ' +
          '1) Disable Brave Shields for this site, ' + 
          '2) Click MetaMask extension, ' +
          '3) Manually "Connect to this site".'
        );
      } else {
        throw new Error('Connection request was rejected. Please approve the connection in MetaMask.');
      }
    } else if (error.code === -32002) {
      throw new Error('Connection request is pending. Please check MetaMask popup and approve the connection.');
    } else if (error.message?.includes('timeout')) {
      throw new Error(
        'Connection timeout. Please manually click on MetaMask extension and connect to this site.'
      );
    }
    
    throw error;
  }
}

/**
 * 完整的 MetaMask 连接流程
 * @param timeout 超时时间（毫秒），默认45秒
 * @returns Promise<{ethereum: EthereumProvider, accounts: string[]}>
 */
export async function connectMetaMaskSafely(timeout = 45000): Promise<{
  ethereum: EthereumProvider;
  accounts: string[];
}> {
  console.log('🚀 Starting safe MetaMask connection process...');
  
  try {
    // 1. 确保 MetaMask 准备就绪
    const ethereum = await ensureMetaMaskReady(timeout / 3);
    
    // 2. 安全地请求账户
    const accounts = await requestAccountsSafely(ethereum, timeout * 2 / 3);
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No wallet accounts available. Please unlock your wallet.');
    }
    
    console.log('🎉 MetaMask connection completed successfully!');
    return { ethereum, accounts };
    
  } catch (error) {
    console.error('💥 MetaMask connection process failed:', error);
    throw error;
  }
}