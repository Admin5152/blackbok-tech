import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: path.resolve(__dirname, 'index.html'),
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['@tanstack/react-router'],
              supabase: ['@supabase/supabase-js'],
              ai: ['@google/genai'],
              icons: ['lucide-react']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      base: mode === 'production' ? './' : '/'
    };
});
