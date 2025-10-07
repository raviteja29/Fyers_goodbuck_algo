# NIFTY Fibonacci Options Strategy Tracker

A React-based web application for tracking and analyzing NIFTY options strategies using Fibonacci retracement levels and Hull Moving Average (HMA 50).

## Features

- **Candlestick Charts**: Professional trading charts with green (bullish) and red (bearish) candles
- **HMA 50 Indicator**: Hull Moving Average overlaid on price charts for trend analysis
- **Fibonacci Levels**: Automatic calculation and display of Fibonacci retracement levels
- **Multiple Timeframes**: Switch between 1-hour and 15-minute charts
- **Compare View**: Side-by-side comparison of PE and CE option strikes
- **Real Option Data**: Historical data from NIFTY options (Sept 24 - Oct 7, 2025)

## Strategy Overview

The strategy identifies weekly option strikes based on the previous week's NIFTY high and low:

1. **Identify Range**: Find previous week's (Wednesday-Tuesday) NIFTY high and low
2. **Select Strikes**: 
   - PE Strike = Round previous week's HIGH up to nearest 50
   - CE Strike = Round previous week's LOW down to nearest 50
3. **Apply Fibonacci**: Lay Fibonacci levels on option price charts (not NIFTY index)
4. **Monitor with HMA 50**: Track price action at Fibonacci levels using HMA 50 on 1H and 15M timeframes

## Project Structure

```
nifty-fibonacci-strategy/
├── src/
│   ├── components/
│   │   └── NiftyFibStrategy.tsx  # Main strategy component
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles with Tailwind
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Installation

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd nifty-fibonacci-strategy
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

4. **Open in browser**:
```
http://localhost:5173
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Chart library for compare view
- **Lucide React** - Icons

## Usage

1. **View Option Charts**: Click on "25150 PE Chart" or "24550 CE Chart" to view candlestick charts
2. **Switch Timeframes**: Toggle between "1 Hour" and "15 Min" using the buttons
3. **Compare Options**: Click "Compare" to see both PE and CE on one chart
4. **View Fib Levels**: Click "PE Fib Levels" or "CE Fib Levels" for detailed level breakdown

## Data Source

The application uses historical data from NIFTY options traded between September 24 - October 7, 2025:
- **25150 PE** (Previous week high rounded up)
- **24550 CE** (Previous week low rounded down)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License

## Disclaimer

This application is for educational and research purposes only. Options trading involves substantial risk. Always consult with a qualified financial advisor before making investment decisions.