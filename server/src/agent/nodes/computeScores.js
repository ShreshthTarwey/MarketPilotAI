/**
 * computeScores.js
 * Graph node responsible for running deterministic quantitative scorecard calculations.
 * Strictly executes pure JavaScript financial math; contains zero LLM calls.
 * Integrates mathematical DCF and relative multiples valuation models to calculate consensus targetPrice.
 */

const { compileValuationReport } = require('../../scoring/valuationCalculator');

/**
 * Helper to calculate growth rate between two values.
 */
function calculateGrowth(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Node function to evaluate solvency, profitability, and momentum scorecards.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} Calculated scorecards and valuations.
 */
async function computeScoresNode(state) {
  console.log(`[Graph Node]: Executing computeScoresNode`);

  const financials = state.financials || {};
  const income = financials.annualIncomeStatement || [];
  const balance = financials.annualBalanceSheet || [];
  const cashFlow = financials.annualCashFlow || [];
  const priceHistory = state.marketContext?.priceHistory || [];

  // 1. Profitability calculations
  let profitabilityScore = 50; // Neutral default
  let operatingMargin = 0;
  let revenueGrowth = 0;

  if (income.length > 0) {
    const latest = income[0];
    const prev = income[1];

    if (latest.revenue > 0) {
      operatingMargin = (latest.operatingIncome / latest.revenue) * 100;
      
      // Profitability Scoring
      let marginPoints = 50;
      if (operatingMargin > 20) marginPoints = 90;
      else if (operatingMargin > 10) marginPoints = 75;
      else if (operatingMargin < 0) marginPoints = 20;

      if (prev) {
        revenueGrowth = calculateGrowth(latest.revenue, prev.revenue);
        let growthPoints = 50;
        if (revenueGrowth > 15) growthPoints = 90;
        else if (revenueGrowth > 5) growthPoints = 75;
        else if (revenueGrowth < -5) growthPoints = 20;

        profitabilityScore = Math.round((marginPoints + growthPoints) / 2);
      } else {
        profitabilityScore = Math.round(marginPoints);
      }
    }
  }

  // 2. Solvency calculations (Debt to Equity, Current Ratio)
  let solvencyScore = 50;
  let currentRatio = 1.0;
  let debtToEquity = 0.5;

  if (balance.length > 0) {
    const latest = balance[0];
    const totalLiab = latest.totalLiabilities || 0;
    const totalAssets = latest.totalAssets || 0;
    const equity = latest.totalEquity || (totalAssets - totalLiab) || 1; // Prevent division by zero
    
    // Leverage ratio proxy
    debtToEquity = totalLiab / equity;
    
    // Current ratio proxy (Assets / Liab)
    currentRatio = totalAssets / (totalLiab || 1);

    let solvencyPoints = 50;
    if (currentRatio > 2.0 && debtToEquity < 0.5) solvencyPoints = 90;
    else if (currentRatio > 1.2 && debtToEquity < 1.5) solvencyPoints = 75;
    else if (currentRatio < 1.0 || debtToEquity > 3.0) solvencyPoints = 25;

    solvencyScore = Math.round(solvencyPoints);
  }

  // 3. Momentum / Trend calculations from historical prices
  let momentumScore = 50;
  let priceTrend = 'Neutral';

  if (priceHistory.length > 20) {
    // Check short term vs long term trends (e.g. 5-day vs 30-day close price averages)
    const latestQuotes = priceHistory.slice(0, 5);
    const olderQuotes = priceHistory.slice(5, 30);

    const latestAvg = latestQuotes.reduce((acc, q) => acc + q.close, 0) / latestQuotes.length;
    const olderAvg = olderQuotes.reduce((acc, q) => acc + q.close, 0) / olderQuotes.length;

    const diff = ((latestAvg - olderAvg) / olderAvg) * 100;
    
    if (diff > 5) {
      momentumScore = 85;
      priceTrend = 'Bullish';
    } else if (diff < -5) {
      momentumScore = 20;
      priceTrend = 'Bearish';
    } else {
      momentumScore = 60;
      priceTrend = 'Sideways';
    }
  }

  // 4. Calculate weighted overall score
  // Profitability (40%), Solvency (40%), Momentum (20%)
  const overallScore = Math.round(
    (profitabilityScore * 0.4) +
    (solvencyScore * 0.4) +
    (momentumScore * 0.2)
  );

  // 5. Calculate intrinsic consensus valuation and compile a rich report (Phase 4 Refinement)
  const currentPrice = priceHistory.length > 0 ? priceHistory[0].close : null;
  const valuation = compileValuationReport(
    financials,
    state.profile,
    currentPrice,
    revenueGrowth,
    debtToEquity
  );

  const scores = {
    profitabilityScore,
    solvencyScore,
    momentumScore,
    overallScore,
    targetPrice: valuation.consensusValue,
    ratios: {
      operatingMargin: parseFloat(operatingMargin.toFixed(2)),
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      currentRatio: parseFloat(currentRatio.toFixed(2)),
      debtToEquity: parseFloat(debtToEquity.toFixed(2)),
      priceTrend
    }
  };

  console.log(`[Graph Node]: Quantitative scores calculated. Blended Valuation: ${valuation.consensusValue ? `$${valuation.consensusValue}` : 'N/A'}. Overall scorecard: ${overallScore}/100`);

  return {
    scores,
    valuation, // Writes directly to valuation state annotation channel
    executionStage: 'generating recommendation'
  };
}

module.exports = computeScoresNode;
