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
        <h2 className="stitch-card-title">Multi-Factor Scoring Engine Metrics & Contributions</h2>
        <div className="table-scroll">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Subscore Category</th>
                <th>Score</th>
                <th>Weight</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const breakdown = reportData.scores?.breakdown || {};
                const valScore = breakdown.valuationScore !== null && breakdown.valuationScore !== undefined ? breakdown.valuationScore : 50;
                const finScore = breakdown.financialsScore || 50;
                const momScore = breakdown.momentumScore || 50;
                const newsScore = breakdown.newsScore || 50;
                const safetyScore = breakdown.safetyScore || 50;
                return (
                  <>
                    <tr>
                      <td>Valuation Target Upside (DCF & multiples consensus)</td>
                      <td className="font-mono">{valScore}%</td>
                      <td>30%</td>
                      <td className="font-mono bold text-accent">
                        {Math.round((valScore / 100) * 30)} / 30
                      </td>
                    </tr>
                    <tr>
                      <td>Financial Statement Health (Solvency & Profitability average)</td>
                      <td className="font-mono">{finScore}%</td>
                      <td>30%</td>
                      <td className="font-mono bold text-accent">
                        {Math.round((finScore / 100) * 30)} / 30
                      </td>
                    </tr>
                    <tr>
                      <td>Price Momentum & Sales Trend</td>
                      <td className="font-mono">{momScore}%</td>
                      <td>15%</td>
                      <td className="font-mono bold text-accent">
                        {Math.round((momScore / 100) * 15)} / 15
                      </td>
                    </tr>
                    <tr>
                      <td>Unstructured News Sentiment Audit</td>
                      <td className="font-mono">{newsScore}%</td>
                      <td>10%</td>
                      <td className="font-mono bold text-accent">
                        {Math.round((newsScore / 100) * 10)} / 10
                      </td>
                    </tr>
                    <tr>
                      <td>Safety / Risk Mitigation (Solvency & FCF Penalties)</td>
                      <td className="font-mono">{safetyScore}%</td>
                      <td>15%</td>
                      <td className="font-mono bold text-accent">
                        {Math.round((safetyScore / 100) * 15)} / 15
                      </td>
                    </tr>
                    <tr className="summary-row">
                      <td className="bold">Overall Scorecard Grade</td>
                      <td className="bold text-accent font-mono">{reportData.scores?.overallScore?.toFixed(1)} / 100</td>
                      <td className="bold">100%</td>
                      <td className="bold text-accent">
                        {(() => {
                          const rawRating = reportData.recommendation?.rating || 'HOLD';
                          const ratingUpper = (reportData.recommendation?.researchRating || rawRating).toUpperCase();
                          const decision = reportData.recommendation?.assignmentDecision || (ratingUpper === 'BUY' ? 'INVEST' : 'PASS');
                          return `${decision} (${ratingUpper})`;
                        })()}
                      </td>
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
