console.log("🚀 Starting TradingView proxy server...");

// Catch errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const tvPostBody = {
  "symbols": { "tickers": [], "query": { "types": [] } },
  "columns": [
    "logoid", "name", "close", "change_abs", "change", "volume", "exchange"
  ],
  "filter": [
    { "left": "exchange", "operation": "nempty" },
    { "left": "type", "operation": "equal", "right": "stock" }
  ],
  "sort": { "sortBy": "change", "sortOrder": "desc" },
  "options": { "lang": "en" },
  "range": { "from": 0, "to": 20 }
};

app.get('/', (req, res) => {
  console.log("✅ Received GET / request");
  res.send('Proxy is running!');
});

app.post('/tv-screener', async (req, res) => {
  console.log("📡 Received POST /tv-screener request");
  try {
    const resp = await fetch('https://scanner.tradingview.com/america/scan', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'referer': 'https://www.tradingview.com/',
        'origin': 'https://www.tradingview.com/',
        'user-agent': 'Mozilla/5.0'
      },
      body: JSON.stringify(tvPostBody)
    });

    const json = await resp.json();
    console.log("📥 TradingView API raw response:", JSON.stringify(json, null, 2));

    if (!json || !json.data) {
      console.error("⚠️ Error: 'data' field missing or null in API response");
      return res.status(500).json({ error: "'data' field missing or null in API response" });
    }

    const data = json.data.map(row => ({
      symbol: row.s,
      price: row.d[2],
      gap: (row.d[4] * 100).toFixed(2), // Percent change
      volume: row.d[5],
      exchange: row.d[6]
    }));

    console.log("✅ Processed data:", data);
    res.json(data);
  } catch (err) {
    console.error("🔥 Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Proxy running on port ${PORT}`);
});
