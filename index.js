const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const tvPostBody = {
  filter: [],
  symbols: { query: { types: [] }, tickers: [] },
  columns: [
    'logoid', 'name', 'close', 'change_abs', 'change', 'volume', 'exchange'
  ],
  sort: { sortBy: 'change', sortOrder: 'desc' },
  options: { lang: 'en' },
  range: { from: 0, to: 20 }
};

app.get('/', (req, res) => res.send('Proxy is running!'));

app.post('/tv-screener', async (req, res) => {
  try {
    const resp = await fetch('https://scanner.tradingview.com/america/scan', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tvPostBody)
    });
    const json = await resp.json();
    const data = json.data.map(row => ({
      symbol: row.s,
      price: row.d[2],
      gap: row.d[4] * 100, // percent change
      volume: row.d[5],
      exchange: row.d[6]
    }));
    res.json(data);
  } catch (err) {
    console.error("Proxy Error:", err);
    res.status(500).json({ error: err.message });
}
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
