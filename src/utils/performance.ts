// 性能监控工具
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  private static startTimes = new Map<string, number>();
  
  // 开始计时
  static startTimer(name: string): void {
    this.startTimes.set(name, performance.now());
  }
  
  // 结束计时并记录
  static endTimer(name: string): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.recordMetric(name, duration);
    this.startTimes.delete(name);
    
    return duration;
  }
  
  // 记录指标
  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // 只保留最近100个记录
    if (values.length > 100) {
      values.shift();
    }
  }
  
  // 获取指标统计
  static getMetricStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }
    
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];
    
    return { count, average, min, max, latest };
  }
  
  // 获取所有指标
  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }
    
    return result;
  }
  
  // 清除指标
  static clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
  
  // 装饰器：自动计时函数执行
  static timeFunction<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T {
    const metricName = name || fn.name || 'anonymous';
    
    return ((...args: any[]) => {
      this.startTimer(metricName);
      try {
        const result = fn(...args);
        
        // 如果返回Promise，等待完成后记录时间
        if (result instanceof Promise) {
          return result.finally(() => {
            this.endTimer(metricName);
          });
        }
        
        this.endTimer(metricName);
        return result;
      } catch (error) {
        this.endTimer(metricName);
        throw error;
      }
    }) as T;
  }
}

// React性能监控钩子
export const usePerformanceMonitor = () => {
  const startTimer = (name: string) => {
    PerformanceMonitor.startTimer(name);
  };
  
  const endTimer = (name: string) => {
    return PerformanceMonitor.endTimer(name);
  };
  
  const recordMetric = (name: string, value: number) => {
    PerformanceMonitor.recordMetric(name, value);
  };
  
  const getStats = (name: string) => {
    return PerformanceMonitor.getMetricStats(name);
  };
  
  return {
    startTimer,
    endTimer,
    recordMetric,
    getStats,
    getAllMetrics: PerformanceMonitor.getAllMetrics
  };
};

// 组件渲染性能监控
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const displayName = componentName || Component.displayName || Component.name;
  
  return React.memo((props: P) => {
    React.useEffect(() => {
      PerformanceMonitor.startTimer(`${displayName}_render`);
      return () => {
        PerformanceMonitor.endTimer(`${displayName}_render`);
      };
    });
    
    return React.createElement(Component, props);
  });
};

// Web3操作性能监控
export class Web3PerformanceMonitor extends PerformanceMonitor {
  static monitorTransaction = this.timeFunction(
    async (transaction: () => Promise<any>) => {
      return await transaction();
    },
    'transaction_execution'
  );
  
  static monitorContractCall = this.timeFunction(
    async (contractCall: () => Promise<any>) => {
      return await contractCall();
    },
    'contract_call'
  );
  
  static monitorWalletConnection = this.timeFunction(
    async (connectionFn: () => Promise<any>) => {
      return await connectionFn();
    },
    'wallet_connection'
  );
}

// 游戏性能监控
export class GamePerformanceMonitor extends PerformanceMonitor {
  static monitorGameAction(actionName: string, action: () => void): void {
    this.startTimer(`game_${actionName}`);
    try {
      action();
    } finally {
      this.endTimer(`game_${actionName}`);
    }
  }
  
  static monitorBoardRender(boardSize: string, renderFn: () => void): void {
    this.startTimer(`board_render_${boardSize}`);
    try {
      renderFn();
    } finally {
      this.endTimer(`board_render_${boardSize}`);
    }
  }
}

// 开发模式下的性能报告
if (process.env.NODE_ENV === 'development') {
  // 每30秒输出一次性能报告
  setInterval(() => {
    const metrics = PerformanceMonitor.getAllMetrics();
    if (Object.keys(metrics).length > 0) {
      console.group('🚀 Performance Metrics');
      Object.entries(metrics).forEach(([name, stats]) => {
        if (stats) {
          console.log(`${name}:`, {
            avg: `${stats.average.toFixed(2)}ms`,
            min: `${stats.min.toFixed(2)}ms`,
            max: `${stats.max.toFixed(2)}ms`,
            count: stats.count
          });
        }
      });
      console.groupEnd();
    }
  }, 30000);
}