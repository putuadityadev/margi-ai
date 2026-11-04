import './catalog';
import { setupWorker } from 'msw/browser';
import { getMockHandlers } from './handlers';

export async function startMocks(): Promise<void> {
  const envSetting = import.meta.env.VITE_API_MOCKS;
  const handlers = getMockHandlers(envSetting);

  const worker = setupWorker(...handlers);

  await worker.start({
    onUnhandledFrame: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
