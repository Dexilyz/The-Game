import { PITCH_LINES } from './data.js';

// Public URL of a deployed Cloudflare Worker proxy (see server/investor-worker.js)
// that holds the real Gemini API key server-side as a secret. This URL itself
// is not sensitive — the secret never leaves the Worker — so once deployed it
// can be hardcoded here and every player gets real AI judging with no setup.
const PROXY_URL = '';

function localScore(blueprint, chosenIds, rating) {
  let score = 0;
  for (const id of chosenIds) {
    const line = PITCH_LINES.find(p => p.id === id);
    if (line) score += line.weight;
  }
  score += rating * 0.07;
  score -= Math.min(0.25, blueprint.cost / 12000);
  score += (Math.random() - 0.5) * 0.22;
  return score;
}

// Evaluates a player's pitch to the investor for a planned attraction.
// Uses a local heuristic by default; if the player has supplied a Gemini API
// key (stored client-side only, never committed), it tries the real model
// first and falls back to the heuristic on any failure.
export async function evaluatePitch(blueprint, chosenIds, game) {
  const rating = game.economy.rating;
  const lines  = chosenIds.map(id => PITCH_LINES.find(p => p.id === id)?.text).filter(Boolean);

  // 1) Shared server-side proxy (real AI for every player, no setup needed).
  if (PROXY_URL) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprintName: blueprint.name, cost: blueprint.cost, rating, lines }),
      });
      const data = await res.json();
      if (data && typeof data.approved === 'boolean') {
        return { approved: data.approved, reason: String(data.reason || ''), viaAI: true };
      }
    } catch (e) {
      // fall through
    }
  }

  // 2) Player's own Gemini key, pasted locally (advanced/optional fallback).
  const apiKey = localStorage.getItem('investorApiKey');
  if (apiKey) {
    try {
      const prompt = `Ты — строгий инвестор тематического парка. Игрок хочет построить "${blueprint.name}" за ${blueprint.cost}. Рейтинг парка: ${rating} звёзд. Игрок сказал тебе: ${lines.map(l => `"${l}"`).join('; ')}. Проанализируй убедительность и решись, одобрить ли финансирование. Ответь СТРОГО в формате JSON без пояснений: {"approved": true или false, "reason": "короткая причина по-русски, 1 предложение"}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match[0]);
      return { approved: !!parsed.approved, reason: String(parsed.reason || ''), viaAI: true };
    } catch (e) {
      // fall through to local heuristic
    }
  }

  // 3) Local rule-based heuristic — always available, works for everyone.
  const score = localScore(blueprint, chosenIds, rating);
  const approved = score >= 0.5;
  const weakLine = chosenIds
    .map(id => PITCH_LINES.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => a.weight - b.weight)[0];
  const reason = approved
    ? 'Инвестор впечатлён вашими аргументами и согласен профинансировать проект.'
    : `Инвестор не убеждён: аргумент «${weakLine ? weakLine.text : '...'}» показался слабым или неубедительным.`;
  return { approved, reason, viaAI: false };
}
