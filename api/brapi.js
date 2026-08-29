const BRAPI_BASE = 'https://brapi.dev/api';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 40;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const active = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX_PER_WINDOW) {
    hits.set(ip, active);
    return true;
  }
  active.push(now);
  hits.set(ip, active);
  return false;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'] || '';
  return String(fwd).split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function sanitizePath(value) {
  return String(value || '').replace(/[^A-Za-z0-9/.,_-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (rateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  }

  const token = process.env.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token da brapi.dev não configurado no servidor.' });
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }

  const path = sanitizePath(body && body.path);
  if (!path) {
    return res.status(400).json({ error: 'Caminho inválido.' });
  }

  const params = body && typeof body.params === 'object' ? body.params : {};
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v));
    } else if (value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  }
  search.set('token', token);

  const url = `${BRAPI_BASE}/${path}?${search.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'InvestPro/1.0' },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.end(text);
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao consultar a brapi.dev.', detail: String((err && err.message) || err) });
  }
}