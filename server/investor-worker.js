// Cloudflare Worker — investor pitch proxy.
//
// Purpose: lets every player get real AI judging of their investor pitch
// without ever exposing a Gemini API key in the public game source (this
// game is served as a static site from GitHub Pages, which has no backend
// of its own). The Worker holds the key as a secret environment variable;
// the game's client code only ever talks to this Worker's public URL.
//
// Deploy steps (free tier, ~2 minutes):
//   1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Worker.
//   2. Paste this file's contents as the Worker's code.
//   3. In the Worker's Settings -> Variables, add an encrypted secret named
//      GEMINI_API_KEY with your Gemini API key value. Never put the key in
//      this file's source.
//   4. Deploy. Copy the Worker's public URL (e.g. https://xxx.workers.dev) —
//      that URL is NOT secret and can be committed to the game's source as
//      negotiation.js's PROXY_URL.

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: cors });
    }

    const { blueprintName, cost, rating, lines } = body || {};
    if (!blueprintName || !Array.isArray(lines)) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: cors });
    }

    const prompt = `Ты — строгий инвестор тематического парка. Игрок хочет построить "${blueprintName}" за ${cost}. Рейтинг парка: ${rating} звёзд. Игрок сказал тебе: ${lines.map(l => `"${l}"`).join('; ')}. Проанализируй убедительность и решись, одобрить ли финансирование. Ответь СТРОГО в формате JSON без пояснений: {"approved": true или false, "reason": "короткая причина по-русски, 1 предложение"}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match[0]);
      return new Response(JSON.stringify({ approved: !!parsed.approved, reason: String(parsed.reason || '') }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream failure' }), { status: 502, headers: cors });
    }
  },
};
