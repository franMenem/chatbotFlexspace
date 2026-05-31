/**
 * Vercel Serverless Function
 * Sends a message and creates chat completion with Retell AI via SDK
 */

import client from './_retellClient.js';
import { applyCors, handlePreflight } from './_cors.js';

export default async function handler(req, res) {
  applyCors(res, 'POST,OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { chat_id, message } = body || {};

    if (!chat_id || !message) {
      return res.status(400).json({ error: 'chat_id and message are required' });
    }

    const response = await client.chat.createChatCompletion({
      chat_id,
      content: message,
    });

    return res.status(200).json(response);
  } catch (e) {
    console.error('❌ send-message error:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message });
  }
}
