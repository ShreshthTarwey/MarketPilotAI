import { formatLargeNumber } from '../utils/formatters';

export default function ValuationTab({ reportData, currencySymbol, activeTab }) {
  return (
    <div className={`stitch-tab-content ${activeTab === 'valuation' ? 'active-tab' : 'inactive-tab'}`}>
      {/* Calculated Targets Table */}
      <div className="stitch-card table-card">
        <h2 className="stitch-card-title">Valuation Pricing & Targets</h2>
        <div className="table-scroll">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Calculated Value</th>
                <th>Benchmark Price</th>
                <th>Pricing Gap / Safety Margin</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>DCF Equity Value Target</td>
                <td className="font-mono bold">{currencySymbol}{reportData.valuation.dcfValue?.toFixed(2)}</td>
                <td className="font-mono text-muted">{currencySymbol}{reportData.valuation.currentPrice?.toFixed(2)}</td>
                <td>
                  {(() => {
                    const gap = (reportData.valuation.dcfValue || 0) - (reportData.valuation.currentPrice || 0);
                    return (
                      <span className={gap >= 0 ? 'text-success' : 'text-error'}>
                        {gap >= 0 ? '+' : ''}{currencySymbol}{gap.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
              </tr>
              <tr>
                <td>Comparable Sector Target</td>
                <td className="font-mono bold">{currencySymbol}{reportData.valuation.relativeValue?.toFixed(2)}</td>
                <td className="font-mono text-muted">{currencySymbol}{reportData.valuation.currentPrice?.toFixed(2)}</td>
                <td>
                  {(() => {
                    const gap = (reportData.valuation.relativeValue || 0) - (reportData.valuation.currentPrice || 0);
                    return (
                      <span className={gap >= 0 ? 'text-success' : 'text-error'}>
                        {gap >= 0 ? '+' : ''}{currencySymbol}{gap.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
              </tr>
              <tr>
                <td>Consensus Fair Value Target</td>
                <td className="font-mono bold text-accent">{currencySymbol}{reportData.valuation.consensusValue?.toFixed(2)}</td>
                <td className="font-mono text-muted">{currencySymbol}{reportData.valuation.currentPrice?.toFixed(2)}</td>
                <td>
                  {reportData.valuation.marginOfSafety > 0 ? (
                    <span className="text-success bold">+{reportData.valuation.marginOfSafety.toFixed(1)}% Discount</span>
                  ) : (
                    <span className="text-error">Premium Pricing</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Factor Ratios Checklist */}
      <div className="stitch-card table-card" style={{ marginTop: '20px' }}>
        <h2 className="stitch-card-title">Multi-Factor Scoring Engine Metrics</h2>
        <div className="table-scroll">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Subscore Category</th>
                <th>Calculated Value</th>
                <th>Weight</th>
                <th>Factor Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const r = reportData.scores?.ratios || {};
                return (
                  <>
                    <tr>
                      <td>Solvency Ratios (Current / Debt-Equity)</td>
                      <td className="font-mono">{r.currentRatio?.toFixed(2)}x current / {r.debtToEquity?.toFixed(2)}x D/E</td>
                      <td>35%</td>
                      <td className={reportData.scores.solvencyScore >= 70 ? 'text-success bold' : 'text-warning'}>
                        Score: {reportData.scores.solvencyScore !== undefined ? reportData.scores.solvencyScore : 50}/100
                      </td>
                    </tr>
                    <tr>
                      <td>Profitability Ratios (ROE / Op Margin)</td>
                      <td className="font-mono">{r.roe?.toFixed(1)}% ROE / {r.operatingMargin?.toFixed(1)}% margin</td>
                      <td>45%</td>
                      <td className={reportData.scores.profitabilityScore >= 70 ? 'text-success bold' : 'text-warning'}>
                        Score: {reportData.scores.profitabilityScore !== undefined ? reportData.scores.profitabilityScore : 50}/100
                      </td>
                    </tr>
                    <tr>
                      <td>Momentum & Sales Trend</td>
                      <td className="font-mono">PE: {reportData.profile.peRatio?.toFixed(1) || 'N/A'}x / EPS: {currencySymbol}{reportData.profile.eps?.toFixed(2) || 'N/A'}</td>
                      <td>20%</td>
                      <td className={reportData.scores.momentumScore >= 70 ? 'text-success bold' : 'text-warning'}>
                        Score: {reportData.scores.momentumScore !== undefined ? reportData.scores.momentumScore : 50}/100
                      </td>
                    </tr>
                    <tr className="summary-row">
                      <td className="bold">Overall Scorecard Grade</td>
                      <td className="bold text-accent font-mono">{reportData.scores?.overallScore?.toFixed(1)} / 100</td>
                      <td className="bold">100%</td>
                      <td className="bold text-accent">{reportData.scores?.ratingRecommendation || 'HOLD'}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projections Table */}
      {reportData.valuation.intermediates && reportData.valuation.intermediates.projectedFcf && (
        <div className="stitch-card table-card" style={{ marginTop: '20px' }}>
          <h2 className="stitch-card-title">5-Year Discounted FCF Projections Horizon</h2>
          <div className="table-scroll">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Base Year</th>
                  <th>Year 1</th>
                  <th>Year 2</th>
                  <th>Year 3</th>
                  <th>Year 4</th>
                  <th>Year 5</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>FCF Cash Flow</td>
                  <td className="font-mono">{formatLargeNumber(reportData.valuation.intermediates.fcfBase, currencySymbol)}</td>
                  {reportData.valuation.intermediates.projectedFcf.map((val, idx) => (
                    <td key={idx} className="font-mono">{formatLargeNumber(val, currencySymbol)}</td>
                  ))}
                </tr>
                <tr>
                  <td>CAPM Discount Factor</td>
                  <td className="font-mono text-muted">1.000</td>
                  {[1, 2, 3, 4, 5].map((t) => {
                    const factor = 1 / Math.pow(1 + (reportData.valuation.assumptions.costOfEquity / 100), t);
                    return (
                      <td key={t} className="font-mono text-muted">{factor.toFixed(3)}</td>
                    );
                  })}
                </tr>
                <tr className="highlight-row">
                  <td className="bold">Present Value (PV)</td>
                  <td className="font-mono bold">{formatLargeNumber(reportData.valuation.intermediates.fcfBase, currencySymbol)}</td>
                  {reportData.valuation.intermediates.pvCashFlows.map((val, idx) => (
                    <td key={idx} className="font-mono bold">{formatLargeNumber(val, currencySymbol)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
