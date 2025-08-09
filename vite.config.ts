import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@services': resolve(__dirname, './src/services'),
      '@styles': resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 关闭source map避免eval
    minify: process.env.NODE_ENV === 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['ethers', '@metamask/detect-provider'],
          ui: ['styled-components']
        }
      }
    }
  },
  css: {
    devSourcemap: true
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  esbuild: {
    define: {
      this: 'window'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'ethers', 'styled-components']
  }
})