import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production configuration for Render.com deployment
export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available at build time
    __VITE_API_URL__: JSON.stringify(process.env.VITE_API_URL),
  },
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