import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeRuntimeConfig } from './shared/config/runtime-config';
import './index.css';

async function bootstrap() {
  await initializeRuntimeConfig();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
