import { http, HttpResponse } from 'msw';
import { generateWeeklyForecast } from '../data/forecasts';
import { mockDb } from '../db';
import { apiError, checkCsrf, ok } from '../respond';

export const publicHandlers = [
  // Presets list
  http.get('*/api/v1/presets', () => {
    return ok(mockDb.presets);
  }),
  http.get('*/api/presets', () => {
    return ok(mockDb.presets);
  }),

  // Hotspot origins
  http.get('*/api/v1/origins', () => {
    const origins = mockDb.venues.filter((v) => v.isHotspot);
    return ok(origins);
  }),
  http.get('*/api/origins', () => {
    const origins = mockDb.venues.filter((v) => v.isHotspot);
    return ok(origins);
  }),

  // Venue by slug
  http.get('*/api/v1/venues/:slug', ({ params }) => {
    const { slug } = params;
    const venue = mockDb.getVenueBySlug(String(slug));
    if (!venue) {
      return apiError('NOT_FOUND', 404, `Venue with slug "${String(slug)}" not found`);
    }
    return ok(venue);
  }),
  http.get('*/api/venues/:slug', ({ params }) => {
    const { slug } = params;
    const venue = mockDb.getVenueBySlug(String(slug));
    if (!venue) {
      return apiError('NOT_FOUND', 404, `Venue with slug "${String(slug)}" not found`);
    }
    return ok(venue);
  }),

  // Hourly forecast for venue
  http.get('*/api/v1/venues/:id/forecast', ({ params }) => {
    const { id } = params;
    const venue = mockDb.getVenueById(String(id));
    const peakBusyness = venue?.isHotspot ? 95 : 30;
    const peakHour = 10;
    const curve = generateWeeklyForecast(peakHour, peakBusyness);
    return ok(curve);
  }),
  http.get('*/api/venues/:id/forecast', ({ params }) => {
    const { id } = params;
    const venue = mockDb.getVenueById(String(id));
    const peakBusyness = venue?.isHotspot ? 95 : 30;
    const peakHour = 10;
    const curve = generateWeeklyForecast(peakHour, peakBusyness);
    return ok(curve);
  }),

  // Regencies
  http.get('*/api/v1/regencies', () => {
    return ok(mockDb.regencies);
  }),
  http.get('*/api/regencies', () => {
    return ok(mockDb.regencies);
  }),

  // System status
  http.get('*/api/v1/system/status', () => {
    return ok({
      telemetry: { live: false },
      llm: 'ok',
      version: 'mock-0.1.0',
      commit: 'prototype',
    });
  }),
  http.get('*/api/system/status', () => {
    return ok({
      telemetry: { live: false },
      llm: 'ok',
      version: 'mock-0.1.0',
      commit: 'prototype',
    });
  }),

  // Analytics product events
  http.post('*/api/v1/events', ({ request }) => {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/events', ({ request }) => {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;
    return new HttpResponse(null, { status: 204 });
  }),
];
