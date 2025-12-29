import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// Fix: Explicitly import process from node:process to provide the correct Node.js types for the config environment
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true
    }
  };
});
