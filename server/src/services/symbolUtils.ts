// Symbol utilities will be implemented for Kite API integration

export type OptionType = 'CE' | 'PE';

export interface WeeklyOptionParts {
  exchange?: string;           // default NSE
  underlying: string;          // e.g. NIFTY, BANKNIFTY, FINNIFTY, stock symbol
  year: number;                // full year e.g. 2025
  month: number;               // 1-12
  day: number;                 // day of month (2 digits in symbol)
  strike: number;              // strike price (int or allowed decimal for currency)
  optType: OptionType;
}

export interface MonthlyOptionParts extends Omit<WeeklyOptionParts, 'day'> {}

export interface FutureParts {
  exchange?: string;           // default NSE
  underlying: string;          // e.g. NIFTY, BANKNIFTY, SBIN
  year: number;                // full year
  month: number;               // 1-12
}

// Month code mapping for weekly expiries (single char) per docs
// Jan..Sep => 1..9, Oct => O, Nov => N, Dec => D
const weeklyMonthCode: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'O', 11: 'N', 12: 'D' };

// Month abbreviation for monthly contracts (three letters uppercase)
const monthAbbrev = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function pad2(n: number): string { return n.toString().padStart(2, '0'); }

function validateYear(year: number) {
  if (year < 2000 || year > 2100) throw new Error('Year out of supported range');
}

function validateMonth(month: number) {
  if (month < 1 || month > 12) throw new Error('Month must be 1-12');
}

function validateDay(day: number) {
  if (day < 1 || day > 31) throw new Error('Day must be 1-31');
}

export function buildWeeklyOptionSymbol(parts: WeeklyOptionParts): string {
  validateYear(parts.year); validateMonth(parts.month); validateDay(parts.day);
  const exch = parts.exchange || 'NSE';
  const yy = parts.year.toString().slice(-2);
  const mCode = weeklyMonthCode[parts.month];
  if (!mCode) throw new Error('No weekly month code for month ' + parts.month);
  const dd = pad2(parts.day);
  if (!['CE','PE'].includes(parts.optType)) throw new Error('Option type must be CE or PE');
  return `${exch}:${parts.underlying}${yy}${mCode}${dd}${parts.strike}${parts.optType}`;
}

export function buildMonthlyOptionSymbol(parts: MonthlyOptionParts): string {
  validateYear(parts.year); validateMonth(parts.month);
  const exch = parts.exchange || 'NSE';
  const yy = parts.year.toString().slice(-2);
  const mmm = monthAbbrev[parts.month - 1];
  if (!['CE','PE'].includes(parts.optType)) throw new Error('Option type must be CE or PE');
  return `${exch}:${parts.underlying}${yy}${mmm}${parts.strike}${parts.optType}`;
}

export function buildFutureSymbol(parts: FutureParts): string {
  validateYear(parts.year); validateMonth(parts.month);
  const exch = parts.exchange || 'NSE';
  const yy = parts.year.toString().slice(-2);
  const mmm = monthAbbrev[parts.month - 1];
  return `${exch}:${parts.underlying}${yy}${mmm}FUT`;
}

// Simple heuristics to detect if a string might be weekly option vs monthly
export function classifyOptionSymbol(sym: string): 'weekly' | 'monthly' | 'unknown' {
  // Remove exchange prefix
  const withoutEx = sym.includes(':') ? sym.split(':')[1] : sym;
  // Find CE/PE
  const match = withoutEx.match(/(CE|PE)$/);
  if (!match) return 'unknown';
  const core = withoutEx.slice(0, -2); // drop CE/PE
  // Weekly pattern: underlying + YY + (1-9|O|N|D) + dd + strike
  if (/\d{2}[1-9OND]\d{2}\d+$/i.test(core)) return 'weekly';
  // Monthly pattern: underlying + YY + (JAN|FEB|...|DEC) + strike
  if (/\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d+$/i.test(core)) return 'monthly';
  return 'unknown';
}

export interface ValidationResult { valid: boolean; issues: string[]; classification: string; }

export interface ParsedOptionSymbol {
  exchange: string;
  underlying: string;
  year: number; // full year
  month: number; // 1-12
  day?: number; // only for weekly
  strike: number;
  optionType: OptionType;
  weekly: boolean;
}

// Parse an option symbol (weekly or monthly). Throws on invalid pattern.
export function parseOptionSymbol(sym: string): ParsedOptionSymbol {
  if (!sym.includes(':')) throw new Error('Missing exchange prefix (e.g. NSE:)');
  const [exchange, restRaw] = sym.split(':');
  const rest = restRaw.trim();
  const optMatch = rest.match(/(CE|PE)$/);
  if (!optMatch) throw new Error('Missing option type suffix CE/PE');
  const optionType = optMatch[1] as OptionType;
  const core = rest.slice(0, -2);
  // Weekly: underlying + YY + (1-9|O|N|D) + dd + strike
  const weeklyRegex = /(.*?)(\d{2})([1-9OND])(\d{2})(\d+)$/i;
  const monthlyRegex = /(.*?)(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d+)$/i;
  let m = core.match(weeklyRegex);
  if (m) {
    const underlying = m[1];
    const yy = parseInt(m[2], 10);
    const mCode = m[3].toUpperCase();
    const dd = parseInt(m[4], 10);
    const strike = parseInt(m[5], 10);
    const month = Object.entries(weeklyMonthCode).find(([k,v]) => v === mCode)?.[0];
    if (!month) throw new Error(`Invalid weekly month code '${mCode}'. Expected one of ${Object.values(weeklyMonthCode).join(',')}`);
    const yearFull = 2000 + yy;
    return { exchange, underlying, year: yearFull, month: parseInt(month,10), day: dd, strike, optionType, weekly: true };
  }
  m = core.match(monthlyRegex);
  if (m) {
    const underlying = m[1];
    const yy = parseInt(m[2], 10);
    const mmm = m[3].toUpperCase();
    const strike = parseInt(m[4], 10);
    const month = monthAbbrev.indexOf(mmm) + 1;
    if (month < 1) throw new Error(`Invalid month abbreviation '${mmm}'`);
    const yearFull = 2000 + yy;
    return { exchange, underlying, year: yearFull, month, strike, optionType, weekly: false };
  }
  throw new Error('Symbol does not match weekly or monthly option pattern');
}

export function validateSymbol(sym: string): ValidationResult {
  const issues: string[] = [];
  const classification = classifyOptionSymbol(sym);
  if (!sym.includes(':')) issues.push('Missing exchange prefix (e.g. NSE:)');
  // Only attempt deep parse if we already classified as option (weekly/monthly)
  if (classification === 'weekly' || classification === 'monthly') {
    try { parseOptionSymbol(sym); } catch (e: any) { issues.push(e.message); }
  }
  // For non-option symbols (indices, equities, futures, etc.) we don't enforce option pattern
  return { valid: issues.length === 0, issues, classification };
}

export function buildNearestWeeklyOption({ underlying, date, strike, optType, exchange = 'NSE' }: { underlying: string; date: Date; strike: number; optType: OptionType; exchange?: string; }): string {
  // date is the weekly expiry date
  return buildWeeklyOptionSymbol({ exchange, underlying, year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), strike, optType });
}

export const weekMonthCodeMap = weeklyMonthCode; // export for reference in error hints
