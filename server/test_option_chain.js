// Quick test to check option chain and available expiries
import axios from 'axios';

async function testOptionChain() {
  try {
    const response = await axios.get('http://localhost:3002/api/data/option-chain', {
      params: {
        symbol: 'NSE:NIFTY50-INDEX'
      },
      headers: {
        'Cookie': 'connect.sid=s%3ASA34mVhgI9VTUsVS17NnaGagXGggc8LZ.SoSbP3n4p3XiToNL3TZ7%2B0j%2BbfLXOnJ4PNDqE9OVTlw'
      }
    });
    
    console.log('Option Chain Response:');
    console.log('Keys:', Object.keys(response.data || {}));
    
    if (response.data?.data) {
      console.log('Data keys:', Object.keys(response.data.data));
      
      // Look for expiry information
      const data = response.data.data;
      if (data.expiryData) {
        console.log('Expiry Data:', JSON.stringify(data.expiryData, null, 2));
      }
      
      // Look for options chain with symbols
      if (data.optionsChain) {
        console.log('Options Chain keys:', Object.keys(data.optionsChain));
        console.log('Sample options:', JSON.stringify(data.optionsChain, null, 2).substring(0, 1000));
      }
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testOptionChain();