import express, { Request, Response } from 'express';
import { fyersService } from '../services/fyersService.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const fyersDataRouter = express.Router();

// Authentication handled by shared middleware

// Get NIFTY index data for a date range
fyersDataRouter.get('/nifty-range', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rangeFrom, rangeTo } = req.query;

    if (!rangeFrom || !rangeTo) {
      return res.status(400).json({ error: 'rangeFrom and rangeTo are required' });
    }

    const data = await fyersService.getChartData({
      symbol: 'NSE:NIFTY50-INDEX',
      resolution: '1D',
      rangeFrom: rangeFrom as string,
      rangeTo: rangeTo as string,
      dateFormat: '1'
    });

    // Calculate high and low
    if (data.s === 'ok' && data.candles) {
      const highs = data.candles.map((c: number[]) => c[2]);
      const lows = data.candles.map((c: number[]) => c[3]);
      const high = Math.max(...highs);
      const low = Math.min(...lows);

      res.json({
        success: true,
        high,
        low,
        rawData: data
      });
    } else {
      res.status(400).json({ error: 'No data available' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get option chart data
fyersDataRouter.get('/option-chart', requireAuth, async (req: Request, res: Response) => {
  try {
    const { symbol, resolution, rangeFrom, rangeTo } = req.query;

    if (!symbol || !resolution || !rangeFrom || !rangeTo) {
      return res.status(400).json({ 
        error: 'symbol, resolution, rangeFrom, and rangeTo are required' 
      });
    }

    const data = await fyersService.getChartData({
      symbol: symbol as string,
      resolution: resolution as string,
      rangeFrom: rangeFrom as string,
      rangeTo: rangeTo as string,
      dateFormat: '1'
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get option chain
fyersDataRouter.get('/option-chain', requireAuth, async (req: Request, res: Response) => {
  try {
    const { symbol, strikecount, timestamp } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    const params: any = { symbol: symbol as string };
    if (strikecount) params.strikecount = parseInt(strikecount as string);
    if (timestamp) params.timestamp = parseInt(timestamp as string);

    const data = await fyersService.getOptionChain(params);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current quotes
fyersDataRouter.get('/quotes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({ error: 'symbols parameter is required' });
    }

    const symbolArray = (symbols as string).split(',');
    const data = await fyersService.getQuotes(symbolArray);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate strikes based on previous week range
fyersDataRouter.get('/calculate-strikes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rangeFrom, rangeTo } = req.query;

    if (!rangeFrom || !rangeTo) {
      return res.status(400).json({ error: 'rangeFrom and rangeTo are required' });
    }

    const data = await fyersService.getChartData({
      symbol: 'NSE:NIFTY50-INDEX',
      resolution: '1D',
      rangeFrom: rangeFrom as string,
      rangeTo: rangeTo as string,
      dateFormat: '1'
    });

    if (data.s === 'ok' && data.candles) {
      const highs = data.candles.map((c: number[]) => c[2]);
      const lows = data.candles.map((c: number[]) => c[3]);
      const high = Math.max(...highs);
      const low = Math.min(...lows);

      // Round high up to nearest 50 for PE
      const peStrike = Math.ceil(high / 50) * 50;
      // Round low down to nearest 50 for CE
      const ceStrike = Math.floor(low / 50) * 50;

      res.json({
        success: true,
        weekRange: { high, low },
        strikes: {
          pe: peStrike,
          ce: ceStrike
        },
        peSymbol: `NSE:NIFTY25${getExpiryCode()}${peStrike}PE`,
        ceSymbol: `NSE:NIFTY25${getExpiryCode()}${ceStrike}CE`
      });
    } else {
      res.status(400).json({ error: 'No data available' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Determine next weekly expiry (Thursday) for current or next week and return code like O09 (Oct 9)
function getExpiryCode(date: Date = new Date()): string {
  const monthCodes = ['F','G','H','J','K','M','N','Q','U','V','X','Z']; // Futures style; adjust if exchange uses different
  // Find next Thursday >= today
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = d.getUTCDay(); // 0=Sun ... 4=Thu
  let add = (4 - weekday); // days until Thursday
  if (add < 0) add += 7; // move to next week
  d.setUTCDate(d.getUTCDate() + add);
  const monthCode = monthCodes[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2,'0');
  return monthCode + day;
}