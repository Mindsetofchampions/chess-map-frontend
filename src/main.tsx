import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ToastProvider } from '@/components/ToastProvider';

import App from './App.tsx';
import './index.css';

// Expose Vite env to a global for universal env accessor (used by tests too)
try {
  (globalThis as any).importMetaEnv = (import.meta as any).env || {};
} catch {}

// Render the main App component into the root element
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
