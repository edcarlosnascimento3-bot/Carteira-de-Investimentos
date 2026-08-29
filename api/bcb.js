export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/bcb/, '') || '';
  if (!path) {
    return res.status(400).json({ error: 'Caminho inválido.' });
  }
  const fullUrl = `https://api.bcb.gov.br${path}${url.search}`;
  try {
    const response = await fetch(fullUrl, { headers: { 'User-Agent': 'InvestPro/1.0' } });
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    return res.end(text);
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao consultar o BCB.', detail: String((err && err.message) || err) });
  }
}