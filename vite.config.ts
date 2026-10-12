import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/config/brand'

// Fills %BRAND_NAME% / %BRAND_TAGLINE% in index.html from src/config/brand.ts
const brandHtml = () => ({
  name: 'brand-html',
  transformIndexHtml: (html: string) =>
    html.replace(/%BRAND_NAME%/g, BRAND.name).replace(/%BRAND_TAGLINE%/g, BRAND.tagline)
})

export default defineConfig({
  plugins: [react(), brandHtml()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4242,
    allowedHosts: true,
    proxy: {
      // WebRTC signaling (Socket.IO) runs on the backend too
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server not running', fallback: true }));
            }
          });
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4242,
    allowedHosts: true,
    proxy: {
      // WebRTC signaling (Socket.IO) runs on the backend too
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server not running', fallback: true }));
            }
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-socket': ['socket.io-client']
        }
      }
    }
  }
})
