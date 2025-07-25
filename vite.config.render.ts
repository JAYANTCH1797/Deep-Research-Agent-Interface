import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production configuration for Render.com deployment
export default defineConfig({
  plugins: [react()],
  // NOTE: Do not hardcode API URLs here. Use VITE_API_URL from environment variables, set in render.yaml.
  resolve: {
    alias: {
      "@": "./src",
      "@/components": "./components",
      "@/services": "./services",
      "@/styles": "./styles",
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      // Allow all Render.com subdomains
      '.onrender.com',
      // Specific patterns for your app
      'research-agent-frontend-qa1n.onrender.com',
    ],
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
        },
      },
    },
  },
}) 