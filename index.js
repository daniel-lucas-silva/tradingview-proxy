const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5000; // Changed to port 5000 to avoid conflicts

// Middleware
app.use(express.json());

// Enhanced TradingView Scanner Configuration
const tvPayload = {
  "filter": [
    {"left": "change", "operation": "greater", "right": 0}, // Positive change
    {"left": "close", "operation": "greater", "right": 1}, // Price > $1
    {"left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE"]},
    {"left": "is_after_hours", "operation": "equal", "right": true} // KEY: Post-market filter
  ],
  "options": {
    "lang": "en",
    "active_symbols_only": true,
    "after_hours": true // Enable after-hours data
  },
  "columns": [
    "name",
    "close",
    "change",
    "change_abs",
    "volume",
    "exchange",
    "premarket_change"
  ],
  "sort": {
    "sortBy": "change",
    "sortOrder": "desc"
  },
  "range": [0, 20]
};

// Health Check
app.get('/', (req, res) => {
  console.log("✅ Health check passed at", new Date().toISOString());
  res.status(200).send('TradingView Proxy is operational!');
});

// Enhanced Gappers Endpoint
app.post('/tv-screener', async (req, res) => {
  console.log("📡 Attempting to fetch gappers...");
  
  try {
    // Add realistic delay to mimic human behavior
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Add debug logging
    console.log("Sending payload to TradingView:", JSON.stringify(tvPayload, null, 2));
    
    const response = await axios.post(
      'https://scanner.tradingview.com/america/scan',
      tvPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      }
    );

    console.log("Received API response with status:", response.status);
    
    if (!response.data?.data) {
      throw new Error("API returned empty data set");
    }

    const stocks = response.data.data.map(item => ({
      symbol: item.s,
      name: item.d[0],
      price: item.d[1],
      gap: `${(item.d[2] * 100).toFixed(2)}%`,
      change: `${(item.d[3] * 100).toFixed(2)}%`,
      volume: item.d[4],
      exchange: item.d[5]
    }));

    console.log(`✅ Successfully fetched ${stocks.length} stocks`);
    res.json(stocks);

  } catch (error) {
    console.error("‼️ Critical Error:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({
      error: "Proxy operation failed",
      reason: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Start server with enhanced error handling
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server started on http://0.0.0.0:${PORT} at ${new Date().toISOString()}`);
  console.log("Configuration:", {
    port: PORT,
    timeout: "15000ms",
    rateLimitDelay: "2500ms"
  });
});

// Advanced error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
  process.exit(1);
});
