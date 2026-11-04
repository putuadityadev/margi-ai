import type { HttpHandler } from 'msw';
import { authHandlers } from './auth';
import { exploreHandlers } from './explore';
import { tripHandlers } from './trip';

const BY_DOMAIN: Readonly<Record<string, readonly HttpHandler[]>> = {
  explore: exploreHandlers,
  trip: tripHandlers,
  auth: authHandlers,
};

/**
 * Mock handlers for tests and offline UI work. `filterSetting` is `true`/unset for every domain,
 * `false` for none, or a comma list such as `explore,auth`.
 */
export function getMockHandlers(filterSetting?: string | boolean): HttpHandler[] {
  if (filterSetting === false || filterSetting === 'false') return [];
  if (filterSetting === undefined || filterSetting === true || filterSetting === 'true') {
    return Object.values(BY_DOMAIN).flat();
  }
  return filterSetting
    .toLowerCase()
    .split(',')
    .flatMap((domain) => BY_DOMAIN[domain.trim()] ?? []);
}

export const handlers: HttpHandler[] = getMockHandlers(true);
