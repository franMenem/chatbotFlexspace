/**
 * Vercel Serverless Function
 * Dual-purpose UTM capture endpoint:
 *
 * 1. Frontend stores UTMs:  POST { chat_id, utm_source, utm_medium, ... }
 * 2. Retell reads UTMs:     POST { args: { chat_id } }
 *
 * Uses in-memory Map as primary cache with Retell API fallback
 * (Map may miss on cold starts — fallback reads retell_llm_dynamic_variables)
 */

import client from './_retellClient.js';
import { applyCors, handlePreflight } from './_cors.js';
import { pickTracking } from './_trackingKeys.js';

/** In-memory UTM store (best-effort, not guaranteed across serverless instances) */
const utmStore = new Map();

/**
 * Fallback: read UTMs from Retell's retell_llm_dynamic_variables
 * These are set when create-chat sends the UTM params
 * @param {string} chatId
 * @returns {Promise<Object>} UTM params
 */
async function fetchUtmFromRetell(chatId) {
  try {
    const chat = await client.chat.retrieve(chatId);
    return pickTracking(chat.retell_llm_dynamic_variables || {});
  } catch (e) {
    console.error('Fallback retrieve failed for', chatId, e.message);
    return pickTracking({});
  }
}

export default async function handler(req, res) {
  applyCors(res, 'POST,OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    // ── Retell custom function call: { args: { chat_id } } ──
    if (body.args?.chat_id) {
      const chatId = body.args.chat_id;

      // Try in-memory cache first
      let utm = utmStore.get(chatId);

      // Fallback: read from Retell's dynamic variables
      if (!utm) {
        utm = await fetchUtmFromRetell(chatId);
      }

      return res.status(200).json(utm);
    }

    // ── Frontend storing UTMs: { chat_id, utm_source, ... } ──
    const { chat_id } = body;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    const utm = pickTracking(body);
    utmStore.set(chat_id, utm);

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('capture-utm error:', e);
    return res.status(500).json({ error: e.message });
  }
}
