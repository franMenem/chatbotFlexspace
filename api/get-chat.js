/**
 * Vercel Serverless Function
 * Get chat details from Retell AI via SDK
 */

import Retell from 'retell-sdk';
import client from './_retellClient.js';
import { applyCors, handlePreflight } from './_cors.js';

export default async function handler(req, res) {
  applyCors(res, 'GET,OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chat_id } = req.query;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    const chatResponse = await client.chat.retrieve(chat_id);
    return res.status(200).json(chatResponse);
  } catch (e) {
    // 404 = chat was deleted/ended by Retell — expected behaviour
    if (e instanceof Retell.NotFoundError) {
      return res.status(200).json({
        status: 'ended',
        ended: true,
        chat_status: 'ended',
      });
    }

    console.error('❌ Error getting chat:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message });
  }
}
