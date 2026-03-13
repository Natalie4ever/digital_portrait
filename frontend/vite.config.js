import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite 代理]', req.method, req.url, '->', 'http://127.0.0.1:8000' + req.url);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite 代理 错误]', req.url, err.message);
          });
        },
      },
    },
  },
})
