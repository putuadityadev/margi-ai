import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import geistSans500Url from '@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import './styles/index.css';

// Preload the 500 weight font (Geist Sans 500) per TDD §13.8 / T-040
if (typeof document !== 'undefined') {
  const existingPreload = document.querySelector(`link[href="${geistSans500Url}"]`);
  if (!existingPreload) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = geistSans500Url;
    document.head.appendChild(link);
  }
}

async function bootstrap(): Promise<void> {
  let devPanelNode: ReactNode = null;

  if (import.meta.env.VITE_API_MOCKS === 'true') {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
    const { DevPanel } = await import('./mocks/DevPanel');
    devPanelNode = <DevPanel />;
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root mount element in index.html');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <AppRouter />
        {devPanelNode}
      </AppProviders>
    </StrictMode>,
  );
}

void bootstrap();
