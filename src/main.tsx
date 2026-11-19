import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { seedCache } from './lib/data';
import './styles/index.css';

declare global {
  interface Window {
    __SS_DATA__?: Record<string, unknown>;
  }
}

const preloaded = window.__SS_DATA__;
if (preloaded) seedCache(preloaded);

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
const app = (
  <StrictMode>
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

const root = document.getElementById('root')!;
if (root.hasChildNodes() && preloaded) hydrateRoot(root, app);
else createRoot(root).render(app);
