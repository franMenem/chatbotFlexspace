/**
 * Shared tracking parameter keys used across UTM capture endpoints.
 * Single source of truth so prod (api/) and dev (server.js) stay aligned.
 * The underscore prefix tells Vercel this is NOT an endpoint.
 */

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

export const CLICK_ID_KEYS = ['gclid', 'fbclid', 'msclkid'];

export const ALL_TRACKING_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS];

/**
 * Extract only tracking-related fields from an object.
 * @param {Object} obj
 * @returns {Object} Tracking keys mapped to their values (null when absent)
 */
export function pickTracking(obj) {
  const out = {};
  for (const key of ALL_TRACKING_KEYS) {
    out[key] = obj[key] || null;
  }
  return out;
}
