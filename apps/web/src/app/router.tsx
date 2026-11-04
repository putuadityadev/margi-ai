import { useState } from 'react';
import { createBrowserRouter, Navigate, type RouteObject, RouterProvider } from 'react-router';
import { LandingPage } from '@/pages/landing/LandingPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { AppShell } from '@/components/navigation/AppShell';
import { RootLayout } from './layouts/RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { RequireRole } from './guards/RequireRole';

const devRoutes: RouteObject[] = import.meta.env.DEV
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

/** Old prototype URLs (photo analyzer, account history) land on their closest current screen. */
const legacyRedirects: RouteObject[] = [
  { path: 'app/photo', element: <Navigate to="/app" replace /> },
  { path: 'app/a/:analysisId', element: <Navigate to="/app" replace /> },
  { path: 'me/*', element: <Navigate to="/plans" replace /> },
  { path: 'forgot-password', element: <Navigate to="/login" replace /> },
  { path: 'reset-password', element: <Navigate to="/login" replace /> },
  { path: 'verify-email', element: <Navigate to="/login" replace /> },
];

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <LandingPage /> },
      // Main app: one navigation bar shared by the four top-level screens.
      {
        element: <AppShell />,
        children: [
          {
            path: 'app',
            lazy: async () => {
              const { ExplorePage } = await import('@/pages/explore/ExplorePage');
              return { Component: ExplorePage };
            },
          },
          {
            path: 'feed',
            lazy: async () => {
              const { FeedPage } = await import('@/pages/feed/FeedPage');
              return { Component: FeedPage };
            },
          },
          {
            path: 'chat',
            lazy: async () => {
              const { ChatPage } = await import('@/pages/chat/ChatPage');
              return { Component: ChatPage };
            },
          },
          {
            path: 'plans',
            lazy: async () => {
              const { PlansPage } = await import('@/pages/plans/PlansPage');
              return { Component: PlansPage };
            },
          },
        ],
      },
      // The planner is full screen: it owns its chrome and has a back button.
      {
        path: 'app/trip',
        lazy: async () => {
          const { TripPage } = await import('@/pages/trip/TripPage');
          return { Component: TripPage };
        },
      },
      {
        element: <RootLayout />,
        children: [
          {
            path: 'login',
            lazy: async () => {
              const { LoginPage } = await import('@/pages/auth/LoginPage');
              return { Component: LoginPage };
            },
          },
          {
            path: 'register',
            lazy: async () => {
              const { RegisterPage } = await import('@/pages/auth/RegisterPage');
              return { Component: RegisterPage };
            },
          },
          // Admin protected routes
          {
            element: <RequireRole role="ADMIN" />,
            children: [
              {
                path: 'admin',
                lazy: async () => {
                  const { AdminLayout } = await import('@/pages/admin');
                  return { Component: AdminLayout };
                },
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { AdminPlacesPage } = await import('@/pages/admin');
                      return { Component: AdminPlacesPage };
                    },
                  },
                ],
              },
            ],
          },
          {
            path: 'about/ai-disclosure',
            lazy: async () => {
              const { AiDisclosurePage } = await import('@/pages/about/AboutAndAdminPages');
              return { Component: AiDisclosurePage };
            },
          },
          {
            path: 'privacy',
            lazy: async () => {
              const { PrivacyPage } = await import('@/pages/about/AboutAndAdminPages');
              return { Component: PrivacyPage };
            },
          },
          ...legacyRedirects,
          ...devRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function AppRouter() {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return <RouterProvider router={router} />;
}
