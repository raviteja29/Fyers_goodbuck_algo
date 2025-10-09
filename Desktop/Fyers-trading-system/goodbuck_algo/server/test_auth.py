import webbrowser
from fyers_apiv3 import fyersModel
from flask import Flask, request
import threading
import time
from datetime import datetime, timedelta
import pandas as pd
import math

# Your Fyers API credentials
client_id = "IPEE9OMDR9-100"
secret_key = "B66R9UPZR6"
redirect_uri = "http://127.0.0.1:3002/api/auth/callback"

# Global variable to store auth code
auth_code = None
app = Flask(__name__)

@app.route('/api/auth/callback')
def callback():
    global auth_code
    auth_code = request.args.get('auth_code')
    
    if auth_code:
        return """
        <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: green;">✓ Authentication Successful!</h2>
                <p>Authorization code received. You can close this window now.</p>
                <script>setTimeout(function(){ window.close(); }, 3000);</script>
            </body>
        </html>
        """
    else:
        return """
        <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: red;">✗ Authentication Failed</h2>
                <p>No authorization code received.</p>
            </body>
        </html>
        """

def start_server():
    app.run(port=3002, debug=False, use_reloader=False)

def login_to_fyers():
    global auth_code
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    print("Starting local server on port 3002...")
    time.sleep(2)
    
    session = fyersModel.SessionModel(
        client_id=client_id,
        secret_key=secret_key,
        redirect_uri=redirect_uri,
        response_type="code",
        grant_type="authorization_code"
    )
    
    auth_url = session.generate_authcode()
    print(f"\nOpening browser for authentication...")
    print(f"If browser doesn't open, visit: {auth_url}\n")
    
    webbrowser.open(auth_url)
    
    print("Waiting for authentication...")
    timeout = 120
    start_time = time.time()
    
    while auth_code is None:
        if time.time() - start_time > timeout:
            print("Authentication timeout. Please try again.")
            return None
        time.sleep(1)
    
    print(f"✓ Authorization code received!")
    
    session.set_token(auth_code)
    response = session.generate_token()
    
    if response.get("code") != 200:
        print(f"Error generating token: {response}")
        return None
    
    access_token = response["access_token"]
    print(f"✓ Access Token generated successfully!")
    
    with open('fyers_token.txt', 'w') as f:
        f.write(access_token)
    print("✓ Access token saved to fyers_token.txt")
    
    return access_token

def get_fyers_client():
    """Get authenticated Fyers client"""
    
    try:
        with open('fyers_token.txt', 'r') as f:
            access_token = f.read().strip()
        
        fyers = fyersModel.FyersModel(
            client_id=client_id,
            is_async=False,
            token=access_token,
            log_path=""
        )
        
        profile = fyers.get_profile()
        if profile.get('code') == 200:
            print("✓ Using existing valid token")
            return fyers
        else:
            print("Existing token invalid, getting new token...")
            access_token = login_to_fyers()
    except FileNotFoundError:
        print("No existing token found, logging in...")
        access_token = login_to_fyers()
    
    if not access_token:
        return None
    
    fyers = fyersModel.FyersModel(
        client_id=client_id,
        is_async=False,
        token=access_token,
        log_path=""
    )
    
    profile = fyers.get_profile()
    print(f"✓ Login Successful! User: {profile.get('data', {}).get('name', 'N/A')}")
    
    return fyers


def round_up_strike(price, base=50):
    """Round UP to next strike (for high PE)"""
    return int(math.ceil(price / base) * base)


def round_down_strike(price, base=50):
    """Round DOWN to previous strike (for low CE)"""
    return int(math.floor(price / base) * base)


# Weekly option symbol format mapping
WEEKLY_MONTH_CODE = {
    1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
    7: '7', 8: '8', 9: '9', 10: 'O', 11: 'N', 12: 'D'
}


def build_option_symbol(expiry_date, strike, option_type):
    """
    Build Fyers option symbol for weekly options
    Format: NSE:NIFTY[YY][MonthCode][Day][Strike][CE/PE]
    Example: NSE:NIFTY25O730150CE for Oct 7, 2025, 30150 CE
    """
    expiry_dt = datetime.strptime(expiry_date, "%Y-%m-%d")
    
    year = expiry_dt.strftime("%y")  # Last 2 digits of year
    month_code = WEEKLY_MONTH_CODE.get(expiry_dt.month)
    day = expiry_dt.strftime("%d")  # No leading zero
    
    symbol = f"NSE:NIFTY{year}{month_code}{day}{strike}{option_type}"
    return symbol


def get_nifty_high_low(fyers, from_date, to_date):
    """Get Nifty 50 high and low for a date range"""
    print("\n" + "="*80)
    print("FETCHING NIFTY 50 HIGH/LOW DATA")
    print("="*80)
    print(f"Period: {from_date} to {to_date}\n")
    
    data = {
        "symbol": "NSE:NIFTY50-INDEX",
        "resolution": "D",
        "date_format": "1",
        "range_from": from_date,
        "range_to": to_date,
        "cont_flag": "1"
    }
    
    response = fyers.history(data)
    
    if response.get('code') != 200:
        print(f"✗ Error: {response}")
        return None
    
    candles = response.get('candles', [])
    
    if not candles:
        print("✗ No data available for this period")
        return None
    
    print(f"✓ Fetched {len(candles)} days of data\n")
    
    highs = [candle[2] for candle in candles]
    lows = [candle[3] for candle in candles]
    closes = [candle[4] for candle in candles]
    
    highest_price = max(highs)
    lowest_price = min(lows)
    
    highest_candle = candles[highs.index(highest_price)]
    lowest_candle = candles[lows.index(lowest_price)]
    
    highest_date = datetime.fromtimestamp(highest_candle[0]).strftime('%Y-%m-%d')
    lowest_date = datetime.fromtimestamp(lowest_candle[0]).strftime('%Y-%m-%d')
    
    first_candle = candles[0]
    last_candle = candles[-1]
    
    first_date = datetime.fromtimestamp(first_candle[0]).strftime('%Y-%m-%d')
    last_date = datetime.fromtimestamp(last_candle[0]).strftime('%Y-%m-%d')
    
    first_close = first_candle[4]
    last_close = last_candle[4]
    
    change = last_close - first_close
    change_pct = (change / first_close) * 100
    
    stats = {
        'period_start': first_date,
        'period_end': last_date,
        'trading_days': len(candles),
        'highest_price': highest_price,
        'highest_date': highest_date,
        'lowest_price': lowest_price,
        'lowest_date': lowest_date,
        'range': highest_price - lowest_price,
        'first_close': first_close,
        'last_close': last_close,
        'change': change,
        'change_percent': change_pct,
        'average_close': sum(closes) / len(closes),
        'candles': candles
    }
    
    print("="*80)
    print("NIFTY 50 STATISTICS")
    print("="*80)
    print(f"Period:          {first_date} to {last_date}")
    print(f"Trading Days:    {stats['trading_days']}")
    print(f"\n{'HIGHEST':-^80}")
    print(f"Price:           ₹{highest_price:,.2f}")
    print(f"Date:            {highest_date}")
    print(f"\n{'LOWEST':-^80}")
    print(f"Price:           ₹{lowest_price:,.2f}")
    print(f"Date:            {lowest_date}")
    print(f"\n{'RANGE & MOVEMENT':-^80}")
    print(f"Range:           ₹{stats['range']:,.2f} ({(stats['range']/lowest_price)*100:.2f}%)")
    print(f"Opening:         ₹{first_close:,.2f} ({first_date})")
    print(f"Closing:         ₹{last_close:,.2f} ({last_date})")
    print(f"Net Change:      ₹{change:+,.2f} ({change_pct:+.2f}%)")
    print(f"Average Close:   ₹{stats['average_close']:,.2f}")
    print("="*80)
    
    return stats


def get_option_historical_data(fyers, option_symbol, from_date, to_date, resolution="15"):
    """Fetch historical data for an option"""
    
    data = {
        "symbol": option_symbol,
        "resolution": resolution,
        "date_format": "1",
        "range_from": from_date,
        "range_to": to_date,
        "cont_flag": "1"
    }

    print(f"   DEBUG - Request: {data}")  # ADD THIS
    response = fyers.history(data)
    print(f"   DEBUG - Response: {response}")  # ADD THIS
    
    response = fyers.history(data)
    
    if response.get('code') == 200:
        candles = response.get('candles', [])
        return candles
    else:
        return None


def analyze_options_based_on_nifty_range(fyers, nifty_stats, expiry_date, from_date, to_date):
    """
    Based on Nifty high/low:
    - High: Round UP to next 50 → Select PE
    - Low: Round DOWN to previous 50 → Select CE
    - Fetch historical data for these options
    """
    print("\n" + "="*80)
    print("ANALYZING OPTIONS BASED ON NIFTY RANGE")
    print("="*80)
    
    high = nifty_stats['highest_price']
    low = nifty_stats['lowest_price']
    
    # Round UP high for PE, Round DOWN low for CE
    high_strike = round_up_strike(high, 50)
    low_strike = round_down_strike(low, 50)
    
    print(f"\nNifty High: ₹{high:,.2f} → ROUND UP → Strike: {high_strike}")
    print(f"Nifty Low:  ₹{low:,.2f} → ROUND DOWN → Strike: {low_strike}")
    
    print(f"\nSelected Strikes:")
    print(f"  • High Strike PE: {high_strike}PE")
    print(f"  • Low Strike CE:  {low_strike}CE")
    
    # Build option symbols directly (works for both expired and active options)
    high_pe_symbol = build_option_symbol(expiry_date, high_strike, "PE")
    low_ce_symbol = build_option_symbol(expiry_date, low_strike, "CE")
    
    print(f"\n{'='*80}")
    print("BUILT OPTION SYMBOLS")
    print(f"{'='*80}")
    print(f"High Strike PE: {high_pe_symbol}")
    print(f"Low Strike CE:  {low_ce_symbol}")
    print(f"Expiry Date:    {expiry_date}")
    
    # Fetch historical data
    print(f"\n{'='*80}")
    print("FETCHING HISTORICAL OPTION DATA")
    print(f"{'='*80}")
    print(f"Date Range: {from_date} to {to_date}")
    print(f"Resolution: 15-minute candles")
    
    print(f"\n1. Fetching {high_pe_symbol} history...")
    high_pe_candles = get_option_historical_data(fyers, high_pe_symbol, from_date, to_date, "15")
    
    if high_pe_candles and len(high_pe_candles) > 0:
        print(f"   ✓ Fetched {len(high_pe_candles)} candles")
        first = high_pe_candles[0]
        last = high_pe_candles[-1]
        first_time = datetime.fromtimestamp(first[0]).strftime('%Y-%m-%d %H:%M')
        last_time = datetime.fromtimestamp(last[0]).strftime('%Y-%m-%d %H:%M')
        print(f"   First: {first_time} @ ₹{first[4]:.2f}")
        print(f"   Last:  {last_time} @ ₹{last[4]:.2f}")
        
        # Calculate stats
        premiums = [c[4] for c in high_pe_candles]
        print(f"   High Premium: ₹{max(premiums):.2f}")
        print(f"   Low Premium: ₹{min(premiums):.2f}")
        print(f"   Avg Premium: ₹{sum(premiums)/len(premiums):.2f}")
    else:
        print(f"   ✗ No data available for this period")
        print(f"   (This could mean the option didn't trade or symbol format is incorrect)")
    
    print(f"\n2. Fetching {low_ce_symbol} history...")
    low_ce_candles = get_option_historical_data(fyers, low_ce_symbol, from_date, to_date, "15")
    
    if low_ce_candles and len(low_ce_candles) > 0:
        print(f"   ✓ Fetched {len(low_ce_candles)} candles")
        first = low_ce_candles[0]
        last = low_ce_candles[-1]
        first_time = datetime.fromtimestamp(first[0]).strftime('%Y-%m-%d %H:%M')
        last_time = datetime.fromtimestamp(last[0]).strftime('%Y-%m-%d %H:%M')
        print(f"   First: {first_time} @ ₹{first[4]:.2f}")
        print(f"   Last:  {last_time} @ ₹{last[4]:.2f}")
        
        # Calculate stats
        premiums = [c[4] for c in low_ce_candles]
        print(f"   High Premium: ₹{max(premiums):.2f}")
        print(f"   Low Premium: ₹{min(premiums):.2f}")
        print(f"   Avg Premium: ₹{sum(premiums)/len(premiums):.2f}")
    else:
        print(f"   ✗ No data available for this period")
        print(f"   (This could mean the option didn't trade or symbol format is incorrect)")
    
    # Export to CSV
    print(f"\n{'='*80}")
    print("EXPORTING DATA TO CSV")
    print(f"{'='*80}")
    
    if high_pe_candles and len(high_pe_candles) > 0:
        df_pe = pd.DataFrame(high_pe_candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df_pe['datetime'] = pd.to_datetime(df_pe['timestamp'], unit='s')
        df_pe = df_pe[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        filename_pe = f"{high_strike}PE_{expiry_date.replace('-', '')}_history.csv"
        df_pe.to_csv(filename_pe, index=False)
        print(f"✓ Exported: {filename_pe}")
    else:
        print(f"✗ No data to export for {high_strike}PE")
    
    if low_ce_candles and len(low_ce_candles) > 0:
        df_ce = pd.DataFrame(low_ce_candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df_ce['datetime'] = pd.to_datetime(df_ce['timestamp'], unit='s')
        df_ce = df_ce[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        filename_ce = f"{low_strike}CE_{expiry_date.replace('-', '')}_history.csv"
        df_ce.to_csv(filename_ce, index=False)
        print(f"✓ Exported: {filename_ce}")
    else:
        print(f"✗ No data to export for {low_strike}CE")
    
    return {
        'high_pe': {
            'symbol': high_pe_symbol,
            'strike': high_strike,
            'candles': high_pe_candles
        },
        'low_ce': {
            'symbol': low_ce_symbol,
            'strike': low_strike,
            'candles': low_ce_candles
        }
    }


if __name__ == "__main__":
    print("\n" + "="*80)
    print("NIFTY OPTIONS STRATEGY ANALYZER")
    print("="*80)
    print("Strategy: Sell high PE when Nifty near high, Sell low CE when Nifty near low")
    print("Works for both expired and active options!")
    print("="*80 + "\n")
    
    # Step 1: Authenticate
    fyers = get_fyers_client()
    
    if not fyers:
        print("Failed to authenticate. Exiting.")
        exit(1)
    
    # Step 2: Get 3 date inputs from user
    print("\n" + "="*80)
    print("INPUT DATE PARAMETERS")
    print("="*80)
    print("Format: YYYY-MM-DD (e.g., 2025-10-01)")
    print("Note: Can fetch data for expired options too!")
    print("="*80 + "\n")
    
    # Input 1: From Date
    from_date = input("1. From Date (for Nifty range analysis): ").strip()
    if not from_date:
        print("✗ From Date is required!")
        exit(1)
    
    # Input 2: To Date
    to_date = input("2. To Date (for Nifty range analysis): ").strip()
    if not to_date:
        print("✗ To Date is required!")
        exit(1)
    
    # Input 3: Option Expiry Date
    expiry_date = input("3. Option Expiry Date (YYYY-MM-DD): ").strip()
    if not expiry_date:
        print("✗ Option Expiry Date is required!")
        exit(1)
    
    # Validate dates
    try:
        datetime.strptime(from_date, "%Y-%m-%d")
        datetime.strptime(to_date, "%Y-%m-%d")
        datetime.strptime(expiry_date, "%Y-%m-%d")
    except ValueError:
        print("✗ Invalid date format! Use YYYY-MM-DD")
        exit(1)
    
    print(f"\n{'='*80}")
    print("SUMMARY OF INPUTS")
    print(f"{'='*80}")
    print(f"Nifty Analysis Period: {from_date} to {to_date}")
    print(f"Option Expiry Date:    {expiry_date}")
    print(f"{'='*80}")
    
    # Step 3: Get Nifty high/low for the date range
    nifty_stats = get_nifty_high_low(fyers, from_date, to_date)
    
    if not nifty_stats:
        print("✗ Could not fetch Nifty data")
        exit(1)
    
    # Export Nifty data
    df_nifty = pd.DataFrame(nifty_stats['candles'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df_nifty['date'] = pd.to_datetime(df_nifty['timestamp'], unit='s')
    df_nifty = df_nifty[['date', 'open', 'high', 'low', 'close', 'volume']]
    nifty_filename = f"nifty_data_{from_date.replace('-', '')}_{to_date.replace('-', '')}.csv"
    df_nifty.to_csv(nifty_filename, index=False)
    print(f"\n✓ Exported Nifty data to: {nifty_filename}")
    
    # Step 4: Analyze options based on Nifty range
    options_result = analyze_options_based_on_nifty_range(
        fyers, 
        nifty_stats, 
        expiry_date,
        from_date,
        to_date
    )
    
    # Step 5: Final Summary
    print("\n" + "="*80)
    print("ANALYSIS COMPLETE!")
    print("="*80)
    
    if options_result:
        print(f"\n✓ Nifty Range: ₹{nifty_stats['lowest_price']:,.2f} to ₹{nifty_stats['highest_price']:,.2f}")
        print(f"\n✓ Options Selected for Expiry {expiry_date}:")
        print(f"  • {options_result['high_pe']['symbol']} (Strike: {options_result['high_pe']['strike']})")
        print(f"  • {options_result['low_ce']['symbol']} (Strike: {options_result['low_ce']['strike']})")
        
        if options_result['high_pe']['candles']:
            print(f"\n✓ High PE Data: {len(options_result['high_pe']['candles'])} candles")
        else:
            print(f"\n✗ High PE: No data (option may not have traded)")
            
        if options_result['low_ce']['candles']:
            print(f"✓ Low CE Data: {len(options_result['low_ce']['candles'])} candles")
        else:
            print(f"✗ Low CE: No data (option may not have traded)")
        
        if options_result['high_pe']['candles'] or options_result['low_ce']['candles']:
            print(f"\n✓ CSV files generated successfully!")
    else:
        print("\n✗ Could not complete options analysis")
    
    print("\n" + "="*80)