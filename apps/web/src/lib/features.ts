/**
 * Feature flags resolved at build time. A flag is off unless its variable is exactly `true`.
 *
 * `PHOTO_MATCH_ENABLED`: the "match from a photo" flow needs the vision pipeline API (T-030 -
 * T-039). Until that exists the entry points stay hidden so the product never shows a feature
 * that runs on mock data.
 */
export const PHOTO_MATCH_ENABLED = import.meta.env.VITE_ENABLE_PHOTO_MATCH === 'true';
