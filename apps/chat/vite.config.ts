import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@noevix/design-system': path.resolve(__dirname, '../../packages/design-system/src'),
        '@noevix/products': path.resolve(__dirname, '../../packages/products/src'),
        '@noevix/config': path.resolve(__dirname, '../../packages/config/src'),
        '@noevix/auth': path.resolve(__dirname, '../../packages/auth/src'),
        '@noevix/contracts': path.resolve(__dirname, '../../packages/contracts'),
      },
    },
    server: {
      port: 3001,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
