import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    chunkSizeWarningLimit: 1000, // 提高警告阈值到 1000KB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // node_modules 中的包
          if (id.includes('node_modules')) {
            // Arco Design UI 库单独打包（通常比较大）
            if (id.includes('@arco-design')) {
              return 'arco-design'
            }
            
            // Tiptap 编辑器相关包
            if (id.includes('@tiptap')) {
              return 'tiptap'
            }
            
            // Socket.io 客户端
            if (id.includes('socket.io-client')) {
              return 'socket-io'
            }
            
            // 表情选择器
            if (id.includes('vue3-emoji-picker')) {
              return 'emoji-picker'
            }
            
            // IndexedDB 库
            if (id.includes('dexie')) {
              return 'dexie'
            }
            
            // Vue 核心生态
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            
            // 其他第三方库
            return 'vendor'
          }
        },
      },
    },
  },
})

