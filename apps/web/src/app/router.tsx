import { useState } from 'react';
import { createBrowserRouter, type RouteObject, RouterProvider } from 'react-router';
import { LandingPlaceholderPage } from '@/pages/landing/LandingPlaceholderPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { RouteErrorBoundary } from './RouteErrorBoundary';

export const appRoutes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/',
        element: <LandingPlaceholderPage />,
      },
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
