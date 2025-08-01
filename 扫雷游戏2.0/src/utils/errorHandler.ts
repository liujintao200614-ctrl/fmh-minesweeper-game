// 错误处理工具类
export class ErrorHandler {
  private static logToConsole = process.env.NODE_ENV === 'development';
  private static logToServer = false; // 可配置是否发送到服务器

  static handleError(error: unknown, context?: string): void {
    const errorInfo = this.parseError(error);
    
    if (this.logToConsole) {
      console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]:`, errorInfo);
    }

    // 这里可以添加发送到监控服务的逻辑
    if (this.logToServer && !this.isMetaMaskError(error)) {
      this.sendToMonitoring(errorInfo, context);
    }
  }

  static parseError(error: unknown): {
    message: string;
    stack?: string;
    name?: string;
    code?: string | number;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: (error as any).code
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (typeof error === 'object' && error !== null) {
      return {
        message: (error as any).message || JSON.stringify(error),
        code: (error as any).code
      };
    }

    return { message: 'Unknown error occurred' };
  }

  static isMetaMaskError(error: unknown): boolean {
    const errorStr = String(error);
    const patterns = [
      'MetaMask',
      'ethereum',
      'chrome-extension',
      'Failed to connect',
      'User rejected',
      'Already processing',
      'Request already pending'
    ];

    return patterns.some(pattern => errorStr.includes(pattern));
  }

  static isNetworkError(error: unknown): boolean {
    const errorStr = String(error);
    const patterns = [
      'Network Error',
      'timeout',
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      'ERR_NETWORK'
    ];

    return patterns.some(pattern => errorStr.includes(pattern));
  }

  static isContractError(error: unknown): boolean {
    const errorStr = String(error);
    const patterns = [
      'execution reverted',
      'insufficient funds',
      'gas required exceeds allowance',
      'nonce too low',
      'replacement transaction underpriced'
    ];

    return patterns.some(pattern => errorStr.includes(pattern));
  }

  static getErrorCategory(error: unknown): 'metamask' | 'network' | 'contract' | 'validation' | 'unknown' {
    if (this.isMetaMaskError(error)) return 'metamask';
    if (this.isNetworkError(error)) return 'network';
    if (this.isContractError(error)) return 'contract';
    
    const errorStr = String(error);
    if (errorStr.includes('Invalid') || errorStr.includes('Required')) {
      return 'validation';
    }

    return 'unknown';
  }

  static getUserFriendlyMessage(error: unknown): string {
    const category = this.getErrorCategory(error);
    const errorStr = String(error);

    switch (category) {
      case 'metamask':
        if (errorStr.includes('User rejected')) {
          return '交易被用户取消';
        }
        if (errorStr.includes('Already processing')) {
          return 'MetaMask正在处理其他交易，请稍候再试';
        }
        return 'MetaMask连接错误，请检查钱包状态';

      case 'network':
        return '网络连接错误，请检查网络连接';

      case 'contract':
        if (errorStr.includes('insufficient funds')) {
          return '余额不足，请检查账户余额';
        }
        if (errorStr.includes('gas required exceeds')) {
          return 'Gas费用不足，请增加Gas限制';
        }
        return '合约执行错误，请稍后重试';

      case 'validation':
        return '输入数据无效，请检查输入';

      default:
        return '发生未知错误，请刷新页面重试';
    }
  }

  private static sendToMonitoring(errorInfo: any, context?: string): void {
    // 这里可以集成第三方监控服务，如 Sentry
    // 目前只做简单的控制台输出
    console.warn('Error logged for monitoring:', { errorInfo, context });
  }
}

// Web3特定的错误处理
export class Web3ErrorHandler extends ErrorHandler {
  static handleWeb3Error(error: unknown, operation: string): string {
    this.handleError(error, `Web3 - ${operation}`);

    const category = this.getErrorCategory(error);
    const errorStr = String(error);

    // 特殊处理常见的Web3错误
    if (errorStr.includes('code 4001')) {
      return '用户取消了交易';
    }

    if (errorStr.includes('code -32603')) {
      return '交易执行失败，请检查参数和余额';
    }

    if (errorStr.includes('code -32000')) {
      return 'RPC错误，请稍后重试';
    }

    return this.getUserFriendlyMessage(error);
  }
}

// React钩子错误处理
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    ErrorHandler.handleError(error, context);
  };

  const handleWeb3Error = (error: unknown, operation: string) => {
    return Web3ErrorHandler.handleWeb3Error(error, operation);
  };

  return {
    handleError,
    handleWeb3Error,
    getUserFriendlyMessage: ErrorHandler.getUserFriendlyMessage,
    getErrorCategory: ErrorHandler.getErrorCategory
  };
};