/**
 * Vercel Serverless Function
 * Creates a new chat session with Retell AI via SDK
 *
 * NOTE: Each request creates a NEW chat to avoid mixing conversations
 * between different users (no server-side caching of chat IDs)
 */

import client from './_retellClient.js';
import { applyCors, handlePreflight } from './_cors.js';

const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const RETELL_AGENT_ID_FR = process.env.RETELL_AGENT_ID_FR;

/** Resolve agent ID from language code (whitelist approach for security) */
const AGENT_MAP = {
  en: RETELL_AGENT_ID,
  fr: RETELL_AGENT_ID_FR,
};

export default async function handler(req, res) {
  applyCors(res, 'POST,OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Resolve agent_id from language parameter (defaults to English)
    const lang = req.body?.lang || 'en';
    const utm = req.body?.utm || {};
    const leadData = req.body?.leadData || {};
    const agent_id = AGENT_MAP[lang] || RETELL_AGENT_ID;

    if (!agent_id) {
      return res.status(500).json({ error: `Missing agent ID for language: ${lang}` });
    }

    // Always create a NEW chat per request
    // This prevents mixing conversations between different users
    const chatResponse = await client.chat.create({
      agent_id,
      retell_llm_dynamic_variables: {
        utm_source: utm.utm_source || 'direct',
        utm_medium: utm.utm_medium || '',
        utm_campaign: utm.utm_campaign || '',
        utm_content: utm.utm_content || '',
        utm_term: utm.utm_term || '',
        gclid: utm.gclid || '',
        fbclid: utm.fbclid || '',
        msclkid: utm.msclkid || '',
        first_name: leadData.first_name || '',
        last_name: leadData.last_name || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
      },
    });

    return res.status(200).json(chatResponse);
  } catch (e) {
    console.error('❌ Error creating chat:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message });
  }
}
