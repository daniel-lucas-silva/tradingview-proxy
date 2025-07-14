const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// TradingView Scanner Configuration
const tvPayload = {
  "filter": [
    {"left": "gap", "operation": "nempty"},
    {"left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE"]},
    {"left": "price", "operation": ">=", "right": 1}
  ],
  "options": {
    "lang": "en",
    "active_symbols_only": true
  },
  "columns": [
    "name", 
    "close", 
    "gap", 
    "change", 
    "volume", 
    "exchange",
    "market_cap_basic"
  ],
  "sort": {
    "sortBy": "gap",
    "sortOrder": "desc"
  },
  "range": [0, 20]
};

// Health Check Endpoint
app.get('/', (req, res) => {
  console.log("✅ Health check passed");
  res.send('TradingView Proxy is running!');
});

// Gappers Endpoint
app.post('/tv-screener', async (req, res) => {
  console.log("📡 Fetching gappers from TradingView...");
  
  try {
    // Add delay to avoid rate limiting (2000ms = 2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.post(
      'https://scanner.tradingview.com/america/scan',
      tvPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (!response.data?.data) {
      throw new Error("No data returned from API");
    }

    // Format the response
    const stocks = response.data.data.map(item => ({
      symbol: item.s,
      name: item.d[0],
      price: item.d[1],
      gap: `${(item.d[2] * 100).toFixed(2)}%`,
      change: `${(item.d[3] * 100).toFixed(2)}%`,
      volume: item.d[4],
      exchange: item.d[5],
      marketCap: item.d[6] ? `$${(item.d[6]/1000000).toFixed(2)}M` : 'N/A'
    }));

    console.log(`✅ Found ${stocks.length} gappers`);
    res.json(stocks);

  } catch (error) {
    console.error("🔥 Error:", error.message);
    res.status(500).json({
      error: "Failed to fetch data",
      details: error.message,
      response: error.response?.data
    });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Error Handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
