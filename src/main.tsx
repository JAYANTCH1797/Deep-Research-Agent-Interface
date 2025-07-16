import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '../styles/globals.css'

// TypeScript declaration for Vite environment variables
// This can be moved to a separate env.d.ts file if desired
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)