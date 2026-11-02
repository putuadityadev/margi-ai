import { useState } from 'react';
import { createBrowserRouter, type RouteObject, RouterProvider } from 'react-router';
import { LandingPlaceholderPage } from '@/pages/landing/LandingPlaceholderPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { RootLayout } from './layouts/RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';

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
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <LandingPlaceholderPage />,
      },
      {
        path: 'app',
        lazy: async () => {
          const { AnalyzerPage } = await import('@/pages/app/AnalyzerPage');
          return { Component: AnalyzerPage };
        },
      },
      {
        path: 'app/a/:analysisId',
        lazy: async () => {
          const { AnalyzerPage } = await import('@/pages/app/AnalyzerPage');
          return { Component: AnalyzerPage };
        },
      },
      // Auth routes (lazy)
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
      {
        path: 'forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('@/pages/auth/AuthFlowPages');
          return { Component: ForgotPasswordPage };
        },
      },
      {
        path: 'reset-password',
        lazy: async () => {
          const { ResetPasswordPage } = await import('@/pages/auth/AuthFlowPages');
          return { Component: ResetPasswordPage };
        },
      },
      {
        path: 'verify-email',
        lazy: async () => {
          const { VerifyEmailPage } = await import('@/pages/auth/AuthFlowPages');
          return { Component: VerifyEmailPage };
        },
      },
      {
        path: 'auth/callback',
        lazy: async () => {
          const { AuthCallbackPage } = await import('@/pages/auth/AuthFlowPages');
          return { Component: AuthCallbackPage };
        },
      },
      // User protected routes
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'me/history',
            lazy: async () => {
              const { HistoryPage } = await import('@/pages/me/MePages');
              return { Component: HistoryPage };
            },
          },
          {
            path: 'me/trips',
            lazy: async () => {
              const { TripsPage } = await import('@/pages/me/MePages');
              return { Component: TripsPage };
            },
          },
          {
            path: 'me/trips/:id',
            lazy: async () => {
              const { TripDetailPage } = await import('@/pages/me/MePages');
              return { Component: TripDetailPage };
            },
          },
        ],
      },
      // Admin protected routes
      {
        element: <RequireRole role="ADMIN" />,
        children: [
          {
            path: 'admin/*',
            lazy: async () => {
              const { AdminLayout } = await import('@/pages/about/AboutAndAdminPages');
              return { Component: AdminLayout };
            },
          },
        ],
      },
      // Static & Disclosure routes
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
