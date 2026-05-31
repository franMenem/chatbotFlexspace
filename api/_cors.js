/**
 * Shared CORS helper for Vercel serverless functions.
 * The underscore prefix tells Vercel this is NOT an endpoint.
 */

const ALLOWED_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, ' +
  'Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

/**
 * Apply CORS headers to the response.
 * @param {import('http').ServerResponse} res
 * @param {string} methods - Comma-separated HTTP methods (e.g. 'POST,OPTIONS')
 */
export function applyCors(res, methods = 'POST,OPTIONS') {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
}

/**
 * Short-circuit OPTIONS preflight requests.
 * @returns {boolean} true if the request was handled (caller should return)
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
