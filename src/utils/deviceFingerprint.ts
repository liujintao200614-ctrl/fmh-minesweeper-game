/**
 * 设备指纹生成工具
 * 用于反作弊系统的设备识别
 */

export interface DeviceInfo {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  fingerprint: string;
}

/**
 * 生成设备指纹
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  try {
    // 创建画布指纹
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint for FMH Minesweeper', 2, 2);
    }
    
    // 收集设备特征
    const features = [
      navigator.userAgent,
      navigator.language,
      navigator.languages?.join(',') || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.cookieEnabled ? '1' : '0',
      typeof localStorage !== 'undefined' ? '1' : '0',
      typeof sessionStorage !== 'undefined' ? '1' : '0',
      canvas.toDataURL()
    ].join('|');
    
    // 生成简单哈希（浏览器兼容）
    let hash = 0;
    for (let i = 0; i < features.length; i++) {
      const char = features.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 转换为16进制字符串
    return Math.abs(hash).toString(16).padStart(8, '0');
  } catch (error) {
    console.warn('Failed to generate device fingerprint:', error);
    return 'fallback-' + Date.now().toString(16);
  }
}

/**
 * 获取完整的设备信息
 */
export function getDeviceInfo(): DeviceInfo {
  const fingerprint = generateDeviceFingerprint();
  
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fingerprint
  };
}

/**
 * 获取客户端信息用于API请求
 */
export function getClientInfo() {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      screenResolution: '0x0',
      timezone: 'UTC',
      fingerprint: 'server'
    };
  }

  try {
    const deviceInfo = getDeviceInfo();
    
    // 添加额外的客户端信息
    return {
      ...deviceInfo,
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  } catch (error) {
    console.warn('Failed to get client info:', error);
    return {
      userAgent: navigator.userAgent,
      screenResolution: '0x0',
      timezone: 'unknown',
      fingerprint: 'error-' + Date.now().toString(16)
    };
  }
}

/**
 * 验证设备指纹格式
 */
export function isValidFingerprint(fingerprint: string): boolean {
  if (!fingerprint || typeof fingerprint !== 'string') {
    return false;
  }
  
  // 检查基本格式
  if (fingerprint.length < 8) {
    return false;
  }
  
  // 排除明显的测试或无效值
  const invalidPatterns = [
    /^test/i,
    /^fake/i,
    /^dummy/i,
    /^00000000/,
    /^11111111/,
    /^ffffffff/i
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(fingerprint));
}

/**
 * 检测是否为自动化工具
 */
export function detectAutomation(): {
  isLikelyBot: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (typeof window === 'undefined') {
    return { isLikelyBot: false, reasons: ['server-side'] };
  }
  
  // 检查常见的自动化标识
  if (navigator.webdriver) {
    reasons.push('webdriver detected');
  }
  
  if ('_phantom' in window || '_selenium' in window) {
    reasons.push('automation framework detected');
  }
  
  if (navigator.userAgent.match(/headless/i)) {
    reasons.push('headless browser detected');
  }
  
  // 检查异常的屏幕尺寸
  if (screen.width === 0 || screen.height === 0) {
    reasons.push('invalid screen dimensions');
  }
  
  // 检查缺少常见的浏览器特征
  if (typeof navigator.plugins === 'undefined') {
    reasons.push('missing navigator.plugins');
  }
  
  return {
    isLikelyBot: reasons.length > 0,
    reasons
  };
}