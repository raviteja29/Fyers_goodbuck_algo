import express, { Request, Response } from 'express';
import { fyersService } from '../services/fyersService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { parseOptionSymbol, buildWeeklyOptionSymbol, buildMonthlyOptionSymbol, weekMonthCodeMap } from '../services/symbolUtils.js';

export const fyersDataRouter = express.Router();

// Authentication handled by shared middleware

// Get NIFTY index data for a date range
fyersDataRouter.get('/nifty-range', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rangeFrom, rangeTo } = req.query;

    if (!rangeFrom || !rangeTo) {
      return res.status(400).json({ error: 'rangeFrom and rangeTo are required' });
    }
    // Convert to epoch seconds if needed (Fyers expects epoch when date_format=0)
    const { fromEpoch, toEpoch } = normalizeDateRange(rangeFrom as string, rangeTo as string);
    const data = await fyersService.getChartData({
      symbol: 'NSE:NIFTY50-INDEX',
      resolution: 'D',
      rangeFrom: String(fromEpoch),
      rangeTo: String(toEpoch),
      dateFormat: '0'
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
      console.warn('[nifty-range] No data returned', { rangeFrom, rangeTo, status: data.s, keys: Object.keys(data || {}) });
      res.status(400).json({ error: 'No data available' });
    }
  } catch (error: any) {
    console.error('[nifty-range] Error', { message: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// Analyze weekly options: suggest effective expiry, build PE/CE, fetch 30-day series up to expiry
// Query: from (YYYY-MM-DD), to (YYYY-MM-DD), expiry (YYYY-MM-DD), resolution (default 15)
fyersDataRouter.get('/analyze-weekly', requireAuth, async (req: Request, res: Response) => {
  try {
    const { from, to, expiry, resolution = '15' } = req.query as Record<string, string>;
    if (!from || !to || !expiry) {
      return res.status(400).json({ error: 'from, to, and expiry are required (YYYY-MM-DD)' });
    }

    // 1) Get NIFTY high/low on the user range (daily)
    // Use start-of-day for both from and to to get exact days only
    const fromEpoch = Math.floor(Date.parse(from + 'T00:00:00Z') / 1000);
    const toEpoch = Math.floor(Date.parse(to + 'T00:00:00Z') / 1000);
    console.log('[analyze-weekly] NIFTY range query:', { from, to, fromEpoch, toEpoch });
    const idx = await fyersService.getChartData({
      symbol: 'NSE:NIFTY50-INDEX',
      resolution: 'D',
      rangeFrom: String(fromEpoch),
      rangeTo: String(toEpoch),
      dateFormat: '0'
    });
    console.log('[analyze-weekly] NIFTY candles received:', idx?.candles?.length, 'candles');
    if (!(idx?.candles?.length)) return res.status(400).json({ error: 'No NIFTY data in range' });
    
    // Log the dates of candles received to debug range issues
    const candleDates = idx.candles.map((c: number[]) => new Date(c[0] * 1000).toISOString().split('T')[0]);
    console.log('[analyze-weekly] Candle dates:', candleDates);
    
    const highs = idx.candles.map((c: number[]) => c[2]);
    const lows = idx.candles.map((c: number[]) => c[3]);
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    
    // Find which date had the high and low
    const highIdx = highs.indexOf(high);
    const lowIdx = lows.indexOf(low);
    console.log('[analyze-weekly] High:', high, 'on', candleDates[highIdx], '| Low:', low, 'on', candleDates[lowIdx]);
    
    const peStrike = Math.ceil(high / 50) * 50;
    const ceStrike = Math.floor(low / 50) * 50;

    // 2) Option chain expiries to suggest effective expiry
    const chain = await fyersService.getOptionChain({ symbol: 'NSE:NIFTY50-INDEX' });
    console.log('[analyze-weekly] Raw chain response keys:', Object.keys(chain || {}));
    console.log('[analyze-weekly] Chain data keys:', Object.keys(chain?.data || {}));
    
    // Extract expiries from the expiryData field
    let expiries: string[] = [];
    if (chain?.data?.expiryData) {
      console.log('[analyze-weekly] ExpiryData structure:', JSON.stringify(chain.data.expiryData, null, 2));
      // Try different possible structures for expiry data
      if (Array.isArray(chain.data.expiryData)) {
        expiries = chain.data.expiryData;
      } else if (chain.data.expiryData.expiries) {
        expiries = chain.data.expiryData.expiries;
      } else if (chain.data.expiryData.expiryList) {
        expiries = chain.data.expiryData.expiryList;
      }
    }
    
    // Fallback to other possible fields
    if (!expiries.length) {
      expiries = chain?.data?.expiries || chain?.data?.expiry || chain?.data?.expiryList || [];
    }
    
    console.log('[analyze-weekly] Requested expiry:', expiry);
    console.log('[analyze-weekly] Available expiries from chain:', expiries);
    const eff = suggestExpiry(expiry, expiries);
    console.log('[analyze-weekly] Effective expiry selected:', eff, '| Requested was:', expiry);

    // 3) Build symbols for effective expiry
    const effDate = new Date(eff + 'T00:00:00');
    const year = effDate.getFullYear();
    const month = effDate.getMonth() + 1;
    const day = effDate.getDate();

    // Helper: determine if a given date is the last Tuesday of its month
    const isLastTuesday = (d: Date) => {
      // Check if it's a Tuesday first
      if (d.getDay() !== 2) return false; // 0=Sun, 2=Tue
      // Add 7 days and see if we're in a different month
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next.getMonth() !== d.getMonth();
    };

    console.log('[analyze-weekly] Building symbols with:', { year, month, day, peStrike, ceStrike, eff, isLastTuesday: isLastTuesday(effDate) });

    let peSymbol: string;
    let ceSymbol: string;

    // If the effective expiry falls on the last Tuesday of the month, treat it as a monthly expiry
    if (isLastTuesday(effDate)) {
      console.log('[analyze-weekly] Effective expiry is last Tuesday of month -> using monthly option symbol format');
      peSymbol = buildMonthlyOptionSymbol({ exchange: 'NSE', underlying: 'NIFTY', year, month, strike: peStrike, optType: 'PE' });
      ceSymbol = buildMonthlyOptionSymbol({ exchange: 'NSE', underlying: 'NIFTY', year, month, strike: ceStrike, optType: 'CE' });
    } else {
      // Weekly format
      peSymbol = buildWeeklyOptionSymbol({ exchange: 'NSE', underlying: 'NIFTY', year, month, day, strike: peStrike, optType: 'PE' });
      ceSymbol = buildWeeklyOptionSymbol({ exchange: 'NSE', underlying: 'NIFTY', year, month, day, strike: ceStrike, optType: 'CE' });
    }

    console.log('[analyze-weekly] Final symbols chosen:', { peSymbol, ceSymbol });

    // 3b) Resolve exact tradable symbols from chain near desired strikes
    try {
      const effEpochNoon = Math.floor(Date.parse(eff + 'T06:30:00Z') / 1000); // ~12:00 IST; adjust if needed
      const chainAtEff = await fyersService.getOptionChain({ symbol: 'NSE:NIFTY50-INDEX', timestamp: effEpochNoon, strikecount: 200 });
      console.log('[analyze-weekly] Chain at effective expiry - data keys:', Object.keys(chainAtEff?.data || {}));
      const resolved = resolveSymbolsFromChain(chainAtEff?.data, peStrike, ceStrike);
      console.log('[analyze-weekly] Resolved symbols from chain:', resolved);
      if (resolved?.pe) {
        console.log('[analyze-weekly] Using chain-resolved PE symbol:', resolved.pe, '(was:', peSymbol, ')');
        peSymbol = resolved.pe;
      }
      if (resolved?.ce) {
        console.log('[analyze-weekly] Using chain-resolved CE symbol:', resolved.ce, '(was:', ceSymbol, ')');
        ceSymbol = resolved.ce;
      }
    } catch (e: any) {
      // non-fatal; fallback to built symbols
      console.warn('[analyze-weekly] Chain resolution failed, using built symbols. Error:', e.message);
    }

    // 4) 90-day window up to expiry (Fyers API limit is 100 days, using 90 for safety)
    const windowStart = new Date(effDate);
    windowStart.setDate(windowStart.getDate() - 90);
    const rangeFrom = windowStart.toISOString().slice(0,10);
    const rangeTo = eff;
    
    // Calculate the number of days in the window
    const daysDiff = Math.ceil((effDate.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));
    console.log('[analyze-weekly] Data window:', { rangeFrom, rangeTo, days: daysDiff });

    // 4b) Fetch data with multiple retry strategies
    const fetchWithRetry = async (sym: string, type: 'PE' | 'CE') => {
      console.log(`[analyze-weekly] Attempting to fetch ${type} data for symbol:`, sym);
      
      const trySymbolVariations = async (baseSymbol: string) => {
        const variations: string[] = [baseSymbol]; // Original first
        
        // Only try NIFTY50 variation if current symbol uses NIFTY (and doesn't already have NIFTY50)
        if (baseSymbol.includes('NIFTY') && !baseSymbol.includes('NIFTY50')) {
          variations.push(baseSymbol.replace('NIFTY', 'NIFTY50'));
        }
        // Only try NIFTY variation if current symbol uses NIFTY50
        if (baseSymbol.includes('NIFTY50')) {
          variations.push(baseSymbol.replace('NIFTY50', 'NIFTY'));
        }
        
        // Try with single digit day if current has leading zero (for weekly options)
        if (/([OND1-9])0(\d)/.test(baseSymbol)) {
          const altDay = baseSymbol.replace(/([OND1-9])0(\d)(\d+)(CE|PE)$/, '$1$2$3$4');
          if (!variations.includes(altDay)) {
            variations.push(altDay);
          }
        }
        
        for (const variation of variations) {
          try {
            console.log(`[analyze-weekly] Trying ${type} variation:`, variation);
            const result = await fyersService.getChartData({ 
              symbol: variation, 
              resolution: String(resolution), 
              rangeFrom, 
              rangeTo, 
              dateFormat: '1' 
            });
            console.log(`[analyze-weekly] Success with ${type} symbol:`, variation);
            return result;
          } catch (e: any) {
            console.log(`[analyze-weekly] Failed ${type} variation ${variation}:`, e?.message?.substring(0, 100));
          }
        }
        throw new Error(`All symbol variations failed for ${type}: ${variations.join(', ')}`);
      };
      
      return await trySymbolVariations(sym);
    };

    const [peData, ceData] = await Promise.all([
      fetchWithRetry(peSymbol, 'PE'),
      fetchWithRetry(ceSymbol, 'CE')
    ]);

    // Compute strike highs/lows within the requested analysis window (IST boundaries)
    const parseIstEpoch = (date: string, endOfDay = false) => {
      const base = new Date(`${date}T00:00:00+05:30`);
      if (endOfDay) {
        base.setHours(23, 59, 59, 999);
      }
      return Math.floor(base.getTime() / 1000);
    };

  const optionFromEpoch = parseIstEpoch(from);
  const optionToEpoch = parseIstEpoch(to, true);

    const computeRangeStats = (series: any) => {
      const candles: number[][] = series?.candles ?? [];
      if (!Array.isArray(candles) || candles.length === 0) {
        return { high: null, low: null };
      }
  const filtered = candles.filter((c: number[]) => c[0] >= optionFromEpoch && c[0] <= optionToEpoch);
      if (!filtered.length) {
        return { high: null, low: null };
      }
      const highs = filtered.map(c => c[2]);
      const lows = filtered.map(c => c[3]);
      return {
        high: Math.max(...highs),
        low: Math.min(...lows),
      };
    };

    const optionRange = {
      pe: computeRangeStats(peData),
      ce: computeRangeStats(ceData),
    };

    return res.json({
      inputs: { from, to, expiry, effectiveExpiry: eff, resolution },
      range: { high, low },
      strikes: { pe: peStrike, ce: ceStrike },
      symbols: { pe: peSymbol, ce: ceSymbol },
      dataWindow: { from: rangeFrom, to: rangeTo, days: daysDiff },
      optionRange,
      series: { pe: peData, ce: ceData }
    });
  } catch (error: any) {
    console.error('[analyze-weekly] Error', { message: error.message, stack: error.stack });
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
    const msg = String(error?.message || 'Unknown error');
    // Return 400 on obvious client errors (invalid symbol/validation failures)
    if (msg.includes('Invalid symbol') || msg.includes('validation')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
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
    const { fromEpoch, toEpoch } = normalizeDateRange(rangeFrom as string, rangeTo as string);
    console.log('[calculate-strikes] Fetching NIFTY range', { rangeFrom, rangeTo, fromEpoch, toEpoch });

    const data = await fyersService.getChartData({
      symbol: 'NSE:NIFTY50-INDEX',
      resolution: 'D',
      rangeFrom: String(fromEpoch),
      rangeTo: String(toEpoch),
      dateFormat: '0'
    });

    if (data.s === 'ok' && data.candles) {
      const highs = data.candles.map((c: number[]) => c[2]);
      const lows = data.candles.map((c: number[]) => c[3]);
      if (!highs.length) {
        console.warn('[calculate-strikes] Empty candles array', { rangeFrom, rangeTo });
        return res.status(400).json({ error: 'No candle data in response' });
      }
      const high = Math.max(...highs);
      const low = Math.min(...lows);

      const peStrike = Math.ceil(high / 50) * 50;
      const ceStrike = Math.floor(low / 50) * 50;
      const expiry = getExpiryCode();
      const peSymbol = `NSE:NIFTY25${expiry}${peStrike}PE`;
      const ceSymbol = `NSE:NIFTY25${expiry}${ceStrike}CE`;
      console.log('[calculate-strikes] Computed strikes', { high, low, peStrike, ceStrike, peSymbol, ceSymbol });

      res.json({
        success: true,
        weekRange: { high, low },
        strikes: { pe: peStrike, ce: ceStrike },
        peSymbol,
        ceSymbol
      });
    } else {
      console.warn('[calculate-strikes] No data', { status: data.s, keys: Object.keys(data || {}), rangeFrom, rangeTo });
      res.status(400).json({ error: 'No data available' });
    }
  } catch (error: any) {
    console.error('[calculate-strikes] Error', { message: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// Helper: Determine next weekly expiry (Thursday) for current or next week and return code like O09 (Oct 9)
function getExpiryCode(date: Date = new Date()): string {
  // NIFTY weekly expiry day is Tuesday. Find next Tuesday >= today
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = d.getUTCDay(); // 0=Sun ... 2=Tue
  let target = 2; // Tuesday
  let add = target - weekday;
  if (add < 0) add += 7; // move to next week
  d.setUTCDate(d.getUTCDate() + add);
  const month = d.getUTCMonth() + 1;
  const monthCode = (weekMonthCodeMap as any)[month]; // 1..9,O,N,D per Fyers weekly mapping
  const day = String(d.getUTCDate()).padStart(2,'0');
  return monthCode + day;
}

// Helper: normalize input YYYY-MM-DD or epoch -> epoch seconds pair
function normalizeDateRange(rangeFrom: string, rangeTo: string): { fromEpoch: number; toEpoch: number } {
  const isEpoch = (v: string) => /^\d{10}$/.test(v);
  const toEpoch = (v: string, endOfDay = false) => {
    if (isEpoch(v)) return parseInt(v, 10);
    // Assume YYYY-MM-DD; use UTC midnight. If endOfDay, add 86399 seconds.
    const t = Date.parse(v + 'T00:00:00Z');
    if (Number.isNaN(t)) throw new Error('Invalid date format: ' + v);
    return Math.floor(t / 1000) + (endOfDay ? 86399 : 0);
  };
  const fromEpoch = toEpoch(rangeFrom, false);
  const toEpochVal = toEpoch(rangeTo, true); // inclusive to end of day
  return { fromEpoch, toEpoch: toEpochVal };
}

// Parse expiry strings like 'YYYY-MM-DD' or 'DD-MMM-YYYY' (e.g., 07-Oct-2025)
function parseExpiryString(s: string): string | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(s)) return s;
  // Attempt DD-MMM-YYYY
  const m = s.match(/^(\d{2})[-\s](\w{3})[-\s](\d{4})$/i);
  if (m) {
    const dd = m[1];
    const mon = m[2].toUpperCase();
    const yyyy = m[3];
    const map: Record<string, string> = { JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06', JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12' };
    const mm = map[mon];
    if (!mm) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

// Prefer closest expiry on or after requested; if none, fallback to absolute closest (tie -> earlier)
function suggestExpiry(requested: string, expiries: string[]): string {
  if (!requested || !expiries?.length) return requested;
  try {
    const reqISO = parseExpiryString(requested) || requested;
    const req = Date.parse(reqISO + 'T00:00:00Z');
    const norm = expiries
      .map(e => ({ raw: e, iso: parseExpiryString(e) }))
      .filter(x => !!x.iso) as { raw: string; iso: string }[];
    if (!norm.length) return requested;
    const times = norm.map(x => ({ raw: x.raw, iso: x.iso, t: Date.parse(x.iso + 'T00:00:00Z') }));
    // First try on/after requested
    const future = times.filter(x => x.t >= req).sort((a,b) => a.t - b.t);
    if (future.length) return future[0].iso;
    // Else pick closest overall by abs delta; tie -> earlier
    let best = times[0];
    let bestDelta = Math.abs(times[0].t - req);
    for (const x of times.slice(1)) {
      const d = Math.abs(x.t - req);
      if (d < bestDelta || (d === bestDelta && x.t < best.t)) {
        best = x; bestDelta = d;
      }
    }
    return best.iso;
  } catch {
    return requested;
  }
}

// Try to normalize option chain payload to an array of { strike, ceSymbol?, peSymbol? }
function resolveSymbolsFromChain(data: any, peTarget: number, ceTarget: number): { pe?: string; ce?: string } {
  if (!data) return {};
  const items: { strike: number; ce?: string; pe?: string }[] = [];

  const pushItem = (strike: any, ce?: any, pe?: any) => {
    const s = Number(strike);
    if (!Number.isFinite(s)) return;
    const ceSym = typeof ce === 'string' ? ce : (typeof ce?.symbol === 'string' ? ce.symbol : undefined);
    const peSym = typeof pe === 'string' ? pe : (typeof pe?.symbol === 'string' ? pe.symbol : undefined);
    if (ceSym || peSym) items.push({ strike: s, ce: ceSym, pe: peSym });
  };

  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (typeof node === 'object') {
      // common shapes
      if (typeof node.strike === 'number' || typeof node.strike_price === 'number') {
        pushItem(node.strike ?? node.strike_price, node.CE ?? node.ce ?? node.call ?? node.call_symbol, node.PE ?? node.pe ?? node.put ?? node.put_symbol);
      }
      if (node.ce_symbol || node.pe_symbol) {
        pushItem(node.strike ?? node.strike_price, node.ce_symbol, node.pe_symbol);
      }
      // dive deeper
      for (const k of Object.keys(node)) walk(node[k]);
    }
  };

  walk(data);
  if (!items.length) return {};

  const nearest = (target: number, picker: (it: { strike: number; ce?: string; pe?: string }) => string | undefined) => {
    let bestSym: string | undefined;
    let bestDelta = Infinity;
    for (const it of items) {
      const sym = picker(it);
      if (!sym) continue;
      const d = Math.abs(it.strike - target);
      if (d < bestDelta) { bestDelta = d; bestSym = sym; }
    }
    return bestSym;
  };

  return {
    pe: nearest(peTarget, it => it.pe),
    ce: nearest(ceTarget, it => it.ce)
  };
}