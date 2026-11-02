import { useState } from 'react';
import { createBrowserRouter, type RouteObject, RouterProvider } from 'react-router';
import { LandingPlaceholderPage } from '@/pages/landing/LandingPlaceholderPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'true'
    ? [
        {
          path: '/__ui',
          lazy: async () => {
            const { UiShowcasePage } = await import('@/pages/ui/UiShowcasePage');
            return { Component: UiShowcasePage };
          },
        },
      ]
    : [];

export const appRoutes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/',
        element: <LandingPlaceholderPage />,
      },
      ...devRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export function AppRouter() {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return <RouterProvider router={router} />;
}
