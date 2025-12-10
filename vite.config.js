import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy rembg local server to avoid CORS in dev
      '/rembg': {
        target: 'http://localhost:7000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rembg/, ''),
      },
      // Proxy Adobe Sensei API
      '/adobe-api': {
        target: 'https://sensei.adobe.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/adobe-api/, ''),
        headers: {
          'Origin': 'https://quick-actions.express.adobe.com',
          'Referer': 'https://quick-actions.express.adobe.com/',
        },
      },
      // Proxy Adobe Token API
      '/adobe-token': {
        target: 'https://adobeid-na1.services.adobe.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/adobe-token/, ''),
        headers: {
          'Origin': 'https://quick-actions.express.adobe.com',
          'Referer': 'https://quick-actions.express.adobe.com/',
        },
      },
    },
  },
});

