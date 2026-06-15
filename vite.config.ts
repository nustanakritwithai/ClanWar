import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
