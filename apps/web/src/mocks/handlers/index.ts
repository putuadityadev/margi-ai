import type { HttpHandler } from 'msw';
import { adminHandlers } from './admin';
import { analysesHandlers } from './analyses';
import { authHandlers } from './auth';
import { meHandlers } from './me';
import { publicHandlers } from './public';

export function getMockHandlers(filterSetting?: string | boolean): HttpHandler[] {
  if (typeof filterSetting === 'boolean') {
    return filterSetting
      ? [...publicHandlers, ...analysesHandlers, ...authHandlers, ...meHandlers, ...adminHandlers]
      : [];
  }

  if (filterSetting === 'false') {
    return [];
  }

  if (!filterSetting || filterSetting === 'true') {
    return [
      ...publicHandlers,
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
  if (enabledDomains.has('analyses')) handlers.push(...analysesHandlers);
  if (enabledDomains.has('auth')) handlers.push(...authHandlers);
  if (enabledDomains.has('me')) handlers.push(...meHandlers);
  if (enabledDomains.has('admin')) handlers.push(...adminHandlers);

  return handlers;
}

export const handlers: HttpHandler[] = getMockHandlers(true);
