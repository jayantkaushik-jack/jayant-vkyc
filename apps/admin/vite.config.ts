import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(appDir, '../../packages/shared/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vkyc/shared': sharedSrc,
      '@admin': path.resolve(appDir, 'src'),
    },
  },
  server: {
    port: 4001,
    strictPort: false,
    host: true,
  },
});
