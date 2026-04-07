/**
 * UTM Utility - Extracts UTM parameters with persistence across page navigation
 *
 * Strategy (in priority order):
 * 1. Current URL query string (user just landed from ad)
 * 2. sessionStorage (persisted from landing page)
 * 3. document.referrer (fallback: parse UTMs from previous page URL)
 */

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'msclkid'];
const ALL_TRACKING_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS];
const STORAGE_KEY = 'flexspace_utm';

let _cachedUtm = null;

/**
 * Extract UTM params from a URL string
 * @param {string} url
 * @returns {Object} UTM params (only non-empty values)
 */
function extractUtmFromUrl(url) {
  try {
    const params = new URLSearchParams(new URL(url).search);
    const utm = {};
    for (const key of ALL_TRACKING_KEYS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
    return utm;
  } catch {
    return {};
  }
}

/**
 * Try to read UTM params from sessionStorage
 * @returns {Object|null}
 */
function loadFromStorage() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed;
    }
  } catch { /* ignore storage errors (iframe sandbox, etc.) */ }
  return null;
}

/**
 * Save UTM params to sessionStorage for cross-page persistence
 * @param {Object} utm
 */
function saveToStorage(utm) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch { /* ignore storage errors */ }
}

/**
 * Get UTM parameters with fallback chain:
 * 1. Current page URL
 * 2. sessionStorage (from landing page)
 * 3. document.referrer
 *
 * Results are cached in memory and persisted to sessionStorage.
 * @returns {Object} UTM params (only non-empty values)
 */
export function getUtmParams() {
  if (_cachedUtm) return _cachedUtm;

  // 1. Try current page URL
  let utm = extractUtmFromUrl(window.location.href);

  // 2. Fallback: sessionStorage
  if (Object.keys(utm).length === 0) {
    utm = loadFromStorage() || {};
  }

  // 3. Fallback: parse referrer
  if (Object.keys(utm).length === 0 && document.referrer) {
    utm = extractUtmFromUrl(document.referrer);
  }

  // Persist if we found UTMs
  if (Object.keys(utm).length > 0) {
    saveToStorage(utm);
  }

  _cachedUtm = utm;
  return utm;
}

/**
 * Check if any UTM params are present
 * @returns {boolean}
 */
export function hasUtmParams() {
  return Object.keys(getUtmParams()).length > 0;
}
