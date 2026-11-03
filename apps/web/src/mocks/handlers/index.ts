import type { HttpHandler } from 'msw';
import { adminHandlers } from './admin';
import { analysesHandlers } from './analyses';
import { authHandlers } from './auth';
import { exploreHandlers } from './explore';
import { meHandlers } from './me';
import { publicHandlers } from './public';
import { tripHandlers } from './trip';

export function getMockHandlers(filterSetting?: string | boolean): HttpHandler[] {
  if (typeof filterSetting === 'boolean') {
    return filterSetting
      ? [
          ...publicHandlers,
          ...exploreHandlers,
          ...tripHandlers,
          ...analysesHandlers,
          ...authHandlers,
          ...meHandlers,
          ...adminHandlers,
        ]
      : [];
  }

  if (filterSetting === 'false') {
    return [];
  }

  if (!filterSetting || filterSetting === 'true') {
    return [
      ...publicHandlers,
      ...exploreHandlers,
      ...tripHandlers,
      ...analysesHandlers,
      ...authHandlers,
      ...meHandlers,
      ...adminHandlers,
    ];
  }

  // Comma-separated domain list e.g. "public,analyses"
  const enabledDomains = new Set(
    filterSetting
      .toLowerCase()
      .split(',')
      .map((d) => d.trim()),
  );

  const handlers: HttpHandler[] = [];
  if (enabledDomains.has('public')) handlers.push(...publicHandlers);
  if (enabledDomains.has('explore')) handlers.push(...exploreHandlers);
  if (enabledDomains.has('trip')) handlers.push(...tripHandlers);
  if (enabledDomains.has('analyses')) handlers.push(...analysesHandlers);
  if (enabledDomains.has('auth')) handlers.push(...authHandlers);
  if (enabledDomains.has('me')) handlers.push(...meHandlers);
  if (enabledDomains.has('admin')) handlers.push(...adminHandlers);

  return handlers;
}

export const handlers: HttpHandler[] = getMockHandlers(true);
