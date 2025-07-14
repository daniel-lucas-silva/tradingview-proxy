const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// TradingView Scanner Payload (Optimized for Gappers)
const tvPayload = {
  "filter": [
    { "left": "gap", "operation": "nempty" }, // Focus on stocks with gap %
    { "left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE"] }, // Only NASDAQ/NYSE
    { "left": "price", "operation": "in_range", "right": [0.5, 30] } // Price between $0.5 and $30
  ],
  "options": { "lang": "en", "active_symbols_only": true },
  "columns": ["name", "close", "gap", "change", "volume", "exchange"],
  "sort": { "sortBy": "gap", "sortOrder": "desc" }, // Sort by highest gap %
  "range": [0, 20] // Top 20 gappers
};

// Health check
app.get('/', (req, res) => {
  console.log("✅ Health check OK");
  res.send('TradingView Proxy is running!');
});

// Fetch gappers from TradingView
app.post('/tv-screener', async (req, res) => {
  console.log("📡 Fetching gappers from TradingView...");
  try {
    const response = await axios.post(
      'https://scanner.tradingview.com/america/scan',
      tvPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.data.data) {
      throw new Error("TradingView returned no data. Check filters or API limits.");
    }

    // Format data for Google Sheets
    const stocks = response.data.data.map(stock => ({
      symbol: stock.s,
      name: stock.d[0],
      price: stock.d[1],
      gap: (stock.d[2] * 100).toFixed(2) + "%", // Convert to percentage
      change: (stock.d[3] * 100).toFixed(2) + "%",
      volume: stock.d[4],
      exchange: stock.d[5]
    }));

    console.log(`✅ Found ${stocks.length} gappers`);
    res.json(stocks);
  } catch (error) {
    console.error("🔥 Proxy Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy running on http://0.0.0.0:${PORT}`);
});
