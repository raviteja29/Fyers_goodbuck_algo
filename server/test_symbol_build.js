// Standalone test reproducing symbol building logic (no imports)
const weeklyMonthCode = { 1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'O',11:'N',12:'D' };
const monthAbbrev = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const pad2 = n => String(n).padStart(2,'0');

function buildWeeklyOptionSymbol({ exchange='NSE', underlying, year, month, day, strike, optType }){
  const yy = String(year).slice(-2);
  const mCode = weeklyMonthCode[month];
  const dd = pad2(day);
  return `${exchange}:${underlying}${yy}${mCode}${dd}${strike}${optType}`;
}

function buildMonthlyOptionSymbol({ exchange='NSE', underlying, year, month, strike, optType }){
  const yy = String(year).slice(-2);
  const mmm = monthAbbrev[month-1];
  return `${exchange}:${underlying}${yy}${mmm}${strike}${optType}`;
}

function isLastTuesday(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  console.log('Date:', dateStr, 'Day of week:', d.getDay(), 'Month:', d.getMonth() + 1);
  if (d.getDay() !== 2) {
    console.log('  -> Not a Tuesday');
    return false;
  }
  const next = new Date(d);
  next.setDate(next.getDate() + 7);
  console.log('  -> Next week:', next.toISOString().split('T')[0], 'Month:', next.getMonth() + 1);
  const isLast = next.getMonth() !== d.getMonth();
  console.log('  -> Is last Tuesday?', isLast);
  return isLast;
}

const expiry = '2025-10-28';
const dt = new Date(expiry + 'T00:00:00');
const year = dt.getFullYear();
const month = dt.getMonth() + 1;
const day = dt.getDate();

console.log('Expiry:', expiry, 'isLastTuesday?', isLastTuesday(expiry));
console.log('Weekly PE:', buildWeeklyOptionSymbol({ underlying:'NIFTY', year, month, day, strike:25250, optType:'PE' }));
console.log('Monthly PE:', buildMonthlyOptionSymbol({ underlying:'NIFTY', year, month, strike:25250, optType:'PE' }));
