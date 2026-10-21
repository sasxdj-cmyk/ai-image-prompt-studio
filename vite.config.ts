import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the production build can be served from any static path
// (or a subfolder of a host) without rewriting asset URLs.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
