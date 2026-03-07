import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';

export const KitePositionsHoldingsCard: React.FC = () => {
  const [positions, setPositions] = useState<any>(null);
  const [holdings, setHoldings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiService.getKitePositions(),
      apiService.getKiteHoldings()
    ])
      .then(([positionsData, holdingsData]) => {
        setPositions(positionsData);
        setHoldings(holdingsData);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch positions/holdings');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-slate-800 p-6 rounded-lg mb-6">
      <div className="font-bold text-lg mb-2">Positions & Holdings Summary</div>
      {loading && <div className="text-slate-400">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <>
          <div className="mb-4">
            <div className="font-semibold text-blue-400 mb-1">Positions</div>
            {positions && positions.data && positions.data.net && positions.data.net.length > 0 ? (
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th>Qty</th>
                    <th>Avg Price</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.data.net.map((pos: any, idx: number) => (
                    <tr key={idx}>
                      <td>{pos.tradingsymbol}</td>
                      <td>{pos.quantity}</td>
                      <td>{pos.average_price}</td>
                      <td className={pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{pos.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-slate-400">No open positions</div>
            )}
          </div>
          <div>
            <div className="font-semibold text-blue-400 mb-1">Holdings</div>
            {holdings && holdings.data && holdings.data.length > 0 ? (
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th>Qty</th>
                    <th>Avg Price</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.data.map((h: any, idx: number) => (
                    <tr key={idx}>
                      <td>{h.tradingsymbol}</td>
                      <td>{h.quantity}</td>
                      <td>{h.average_price}</td>
                      <td className={h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{h.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-slate-400">No holdings</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
