import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient, getApiBaseUrl } from '../../lib/apiClient';

const ProvidersSchema = z.object({ google: z.boolean() });

/** Whether the server has Google credentials; the button is hidden when it does not. */
function useGoogleEnabled(): boolean {
  const providers = useQuery({
    queryKey: ['auth', 'providers'] as const,
    queryFn: ({ signal }) => apiClient('/auth/providers', { schema: ProvidersSchema, signal }),
    staleTime: Infinity,
    retry: false,
  });
  return providers.data?.google === true;
}

export interface GoogleButtonProps {
  /** App path to return to after signing in (default: where the traveller is now). */
  readonly next?: string;
  /** Runs just before the page leaves for Google, to stash work that would be lost on reload. */
  readonly onBeforeRedirect?: () => void;
}

/**
 * "Continue with Google". It is a normal link: the server runs the OAuth flow and sends the
 * traveller back to `next`, signed in.
 */
export function GoogleButton({ next, onBeforeRedirect }: GoogleButtonProps): ReactNode {
  const { i18n } = useTranslation();
  const enabled = useGoogleEnabled();
  if (!enabled) return null;
  const isId = i18n.language.startsWith('id');
  const target = next ?? `${window.location.pathname}${window.location.search}`;
  const href = `${getApiBaseUrl().replace(/\/$/, '')}/auth/google?next=${encodeURIComponent(target)}`;

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 text-[11px] uppercase text-graphite"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-ash" />
        {isId ? 'atau' : 'or'}
        <span className="h-px flex-1 bg-ash" />
      </div>
      <a
        href={href}
        onClick={onBeforeRedirect}
        className="flex h-12 w-full items-center justify-center gap-3 border border-ink bg-white text-body font-medium text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
          />
          <path
            fill="#FBBC05"
            d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
          />
        </svg>
        {isId ? 'Lanjutkan dengan Google' : 'Continue with Google'}
      </a>
    </div>
  );
}
