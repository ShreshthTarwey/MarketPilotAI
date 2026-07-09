import { useState } from 'react';

export default function PriceChart({ reportData, currencySymbol }) {
  const priceHistory = reportData?.marketContext?.priceHistory || [];
  const [period, setPeriod] = useState('1Y'); // '1W', '1M', '1Y'

  // Convert to chronological order (oldest first)
  const chronData = [...priceHistory].reverse();

  // Subset based on selected period
  let subset = chronData;
  if (period === '1W') {
    subset = chronData.slice(-7);
  } else if (period === '1M') {
    subset = chronData.slice(-30);
  }

  const prices = subset.map(d => d.close || 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 100;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 200;
  const range = maxPrice - minPrice || 1;

  // Generate SVG path points
  let pathPoints = '';
  if (subset.length > 1) {
    pathPoints = subset.map((d, i) => {
      const x = (i / (subset.length - 1)) * 600;
      const y = 180 - ((d.close - minPrice) / range) * 160;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // Format date for X-axis labels
  const startDateLabel = subset.length > 0 ? subset[0].date : 'N/A';
  const endDateLabel = subset.length > 0 ? subset[subset.length - 1].date : 'N/A';

  return (
    <div className="stitch-card chart-card">
      <div className="chart-header">
        <span className="chart-title">PRICE HISTORY ({period})</span>
        <div className="chart-tabs">
          <span 
            className={`chart-tab ${period === '1W' ? 'active' : ''}`}
            onClick={() => setPeriod('1W')}
            style={{ cursor: 'pointer' }}
          >
            1W
          </span>
          <span 
            className={`chart-tab ${period === '1M' ? 'active' : ''}`}
            onClick={() => setPeriod('1M')}
            style={{ cursor: 'pointer' }}
          >
            1M
          </span>
          <span 
            className={`chart-tab ${period === '1Y' ? 'active' : ''}`}
            onClick={() => setPeriod('1Y')}
            style={{ cursor: 'pointer' }}
          >
            1Y
          </span>
        </div>
      </div>
      
      <div className="chart-body">
        <div className="chart-container">
          <div className="chart-y-axis">
            <span>{currencySymbol}{maxPrice.toFixed(2)}</span>
            <span>{currencySymbol}{((maxPrice + minPrice) / 2).toFixed(2)}</span>
            <span>{currencySymbol}{minPrice.toFixed(2)}</span>
          </div>
          <div className="chart-svg-wrapper">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="chart-svg">
              {/* Background grid lines */}
              <line x1="0" y1="20" x2="600" y2="20" stroke="var(--border-gray)" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="var(--border-gray)" strokeDasharray="3 3" />
              <line x1="0" y1="180" x2="600" y2="180" stroke="var(--border-gray)" strokeDasharray="3 3" />
              
              {subset.length > 1 ? (
                <polyline 
                  points={pathPoints}
                  fill="none" 
                  stroke="var(--accent)" 
                  strokeWidth="3" 
                />
              ) : (
                <line x1="0" y1="100" x2="600" y2="100" stroke="var(--accent)" strokeWidth="3" />
              )}
            </svg>
            <div className="chart-x-axis">
              <span>{startDateLabel}</span>
              <span>{endDateLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
