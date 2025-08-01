/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    styledComponents: true,
    // 生产环境移除console.log (保留console.error和console.warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // 生产环境优化 (暂时禁用CSS优化避免构建问题)
  // experimental: {
  //   optimizeCss: true,
  // },
  // 安全头部
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // 开发环境配置
  devIndicators: {
    buildActivity: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      sqlite3: false,
    };
    
    // 在开发模式下禁用错误报告
    if (dev && !isServer) {
      config.devtool = false;
    }
    
    // 确保服务器端模块不被客户端打包
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sqlite3: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;