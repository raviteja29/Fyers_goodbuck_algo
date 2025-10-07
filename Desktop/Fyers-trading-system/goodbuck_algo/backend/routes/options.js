const express = require('express');
const auth = require('../middleware/auth');
const OptionData = require('../models/OptionData');
const fyersService = require('../services/fyersService');

const router = express.Router();

// Get option chain for a specific underlying and expiry
router.get('/chain/:underlying/:expiry', auth, async (req, res) => {
  try {
    const { underlying, expiry } = req.params;
    const { strikes, fromTime, toTime } = req.query;

    const expiryDate = new Date(expiry);
    const fromTimeDate = fromTime ? new Date(fromTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toTimeDate = toTime ? new Date(toTime) : new Date();

    let optionChain = await OptionData.getOptionChain(
      underlying.toUpperCase(),
      expiryDate,
      fromTimeDate,
      toTimeDate
    );

    // Filter by strikes if provided
    if (strikes) {
      const strikeArray = strikes.split(',').map(s => parseFloat(s));
      optionChain = optionChain.filter(option => strikeArray.includes(option.strike));
    }

    // Group by strike and option type
    const groupedOptions = {};
    optionChain.forEach(option => {
      const key = `${option.strike}_${option.optionType}`;
      if (!groupedOptions[key] || groupedOptions[key].timestamp < option.timestamp) {
        groupedOptions[key] = option;
      }
    });

    const result = Object.values(groupedOptions).sort((a, b) => {
      if (a.strike !== b.strike) return a.strike - b.strike;
      return a.optionType.localeCompare(b.optionType);
    });

    res.json({
      underlying: underlying.toUpperCase(),
      expiry: expiryDate,
      optionChain: result,
      count: result.length
    });
  } catch (error) {
    console.error('Option chain error:', error);
    res.status(500).json({ message: 'Error fetching option chain' });
  }
});

// Get historical data for a specific option
router.get('/historical/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { fromTime, toTime, interval } = req.query;

    const fromTimeDate = new Date(fromTime);
    const toTimeDate = new Date(toTime);

    const historicalData = await OptionData.getHistoricalData(
      symbol.toUpperCase(),
      fromTimeDate,
      toTimeDate
    );

    // Apply interval aggregation if specified
    let processedData = historicalData;
    if (interval && interval !== '1min') {
      processedData = aggregateByInterval(historicalData, interval);
    }

    res.json({
      symbol: symbol.toUpperCase(),
      fromTime: fromTimeDate,
      toTime: toTimeDate,
      interval: interval || '1min',
      data: processedData,
      count: processedData.length
    });
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({ message: 'Error fetching historical data' });
  }
});

// Get live option data from Fyers API
router.get('/live/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const liveData = await fyersService.getLiveQuote(req.userId, symbol);
    
    res.json({
      symbol: symbol.toUpperCase(),
      data: liveData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Live data error:', error);
    res.status(500).json({ message: 'Error fetching live data' });
  }
});

// Fetch and store option data from Fyers
router.post('/fetch/:underlying/:expiry', auth, async (req, res) => {
  try {
    const { underlying, expiry } = req.params;
    const { strikes } = req.body;

    const expiryDate = new Date(expiry);
    
    const fetchedData = await fyersService.fetchOptionChain(
      req.userId,
      underlying.toUpperCase(),
      expiryDate,
      strikes
    );

    // Store the fetched data in database
    const savedOptions = [];
    for (const optionData of fetchedData) {
      const option = new OptionData(optionData);
      await option.save();
      savedOptions.push(option);
    }

    res.json({
      message: 'Option data fetched and stored successfully',
      underlying: underlying.toUpperCase(),
      expiry: expiryDate,
      stored: savedOptions.length,
      data: savedOptions
    });
  } catch (error) {
    console.error('Fetch option data error:', error);
    res.status(500).json({ message: 'Error fetching option data' });
  }
});

// Get available expiry dates for an underlying
router.get('/expiries/:underlying', auth, async (req, res) => {
  try {
    const { underlying } = req.params;

    const expiries = await OptionData.distinct('expiry', {
      underlying: underlying.toUpperCase()
    });

    const sortedExpiries = expiries
      .map(exp => new Date(exp))
      .sort((a, b) => a - b);

    res.json({
      underlying: underlying.toUpperCase(),
      expiries: sortedExpiries,
      count: sortedExpiries.length
    });
  } catch (error) {
    console.error('Expiries error:', error);
    res.status(500).json({ message: 'Error fetching expiry dates' });
  }
});

// Get available strikes for an underlying and expiry
router.get('/strikes/:underlying/:expiry', auth, async (req, res) => {
  try {
    const { underlying, expiry } = req.params;
    const expiryDate = new Date(expiry);

    const strikes = await OptionData.distinct('strike', {
      underlying: underlying.toUpperCase(),
      expiry: expiryDate
    });

    const sortedStrikes = strikes.sort((a, b) => a - b);

    res.json({
      underlying: underlying.toUpperCase(),
      expiry: expiryDate,
      strikes: sortedStrikes,
      count: sortedStrikes.length
    });
  } catch (error) {
    console.error('Strikes error:', error);
    res.status(500).json({ message: 'Error fetching strikes' });
  }
});

// Helper function to aggregate data by interval
function aggregateByInterval(data, interval) {
  const intervalMs = getIntervalMs(interval);
  const aggregated = {};

  data.forEach(item => {
    const timestamp = new Date(item.timestamp);
    const intervalStart = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
    const key = intervalStart.toISOString();

    if (!aggregated[key]) {
      aggregated[key] = {
        ...item.toObject(),
        timestamp: intervalStart,
        open: item.ltp,
        high: item.ltp,
        low: item.ltp,
        close: item.ltp,
        volume: item.volume || 0
      };
    } else {
      const agg = aggregated[key];
      agg.high = Math.max(agg.high, item.ltp);
      agg.low = Math.min(agg.low, item.ltp);
      agg.close = item.ltp;
      agg.volume += item.volume || 0;
    }
  });

  return Object.values(aggregated).sort((a, b) => a.timestamp - b.timestamp);
}

function getIntervalMs(interval) {
  const intervals = {
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000
  };
  return intervals[interval] || intervals['1min'];
}

module.exports = router;