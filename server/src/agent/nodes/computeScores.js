/**
 * computeScores.js
 * Graph node responsible for running deterministic quantitative scorecard calculations.
 * Strictly executes pure JavaScript financial math; contains zero LLM calls.
 * Integrates mathematical DCF and relative multiples valuation models to calculate consensus targetPrice.
 */

const { compileValuationReport } = require('../../scoring/valuationCalculator');
const valuationConfig = require('../../config/valuationConfig');

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
  if (!state.resolvedTicker) {
    console.log(`[Graph Node]: Skipping computeScoresNode due to missing resolved ticker.`);
    return { executionStage: 'scoring bypassed' };
  }
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

  // ROE calculation (Net Income / Total Equity)
  let roe = 0;
  if (income.length > 0 && balance.length > 0) {
    const latestIncome = income[0];
    const latestBalance = balance[0];
    const netIncome = latestIncome.netIncome || 0;
    const totalLiab = latestBalance.totalLiabilities || 0;
    const totalAssets = latestBalance.totalAssets || 0;
    const equity = latestBalance.totalEquity || (totalAssets - totalLiab) || 1;
    if (equity && equity !== 0) {
      roe = (netIncome / equity) * 100;
    }
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

  // 4. Calculate Intrinsic Consensus Valuation and compile a rich report (Phase 4 Refinement)
  const currentPrice = (priceHistory.length > 0 ? priceHistory[0].close : null) || state.profile?.currentPrice || null;
  const valuation = compileValuationReport(
    financials,
    state.profile,
    currentPrice,
    revenueGrowth,
    debtToEquity
  );

  // 5. Multi-Factor Score Calculations (0-100 scales)
  
  // A. Valuation Score (continuous scale based on target price upside/downside)
  let valuationScore = null;
  if (valuation.consensusValue && currentPrice) {
    const upside = (valuation.consensusValue - currentPrice) / currentPrice;
    if (upside > 0) {
      valuationScore = Math.round(50 + Math.min(50, (upside / 0.30) * 50)); // +30% upside maps to 100
    } else {
      const downside = Math.abs(upside);
      valuationScore = Math.round(50 - Math.min(50, (downside / 0.30) * 50)); // -30% downside maps to 0
    }
  }

  // B. Financials Score (Average of Profitability and Solvency scorecards)
  const financialsScore = Math.round((profitabilityScore + solvencyScore) / 2);

  // C. Momentum Score (Trend Strength)
  let momentumFactorScore = 50;
  if (priceTrend === 'Bullish') momentumFactorScore = 90;
  else if (priceTrend === 'Bearish') momentumFactorScore = 20;
  else if (priceTrend === 'Sideways') momentumFactorScore = 60;

  // D. News Sentiment Score (Weighted by classified materiality)
  const newsList = state.news || [];
  let newsScore = 50;
  if (newsList.length > 0) {
    let scoreSum = 0;
    let weightSum = 0;
    for (const article of newsList) {
      let sentimentVal = 0;
      if (article.sentiment === 'positive') sentimentVal = 1;
      else if (article.sentiment === 'negative') sentimentVal = -1;

      let materialityVal = 1;
      if (article.materiality === 'high') materialityVal = 3;
      else if (article.materiality === 'medium') materialityVal = 2;

      scoreSum += sentimentVal * materialityVal;
      weightSum += materialityVal;
    }
    if (weightSum > 0) {
      const netSentiment = scoreSum / weightSum;
      newsScore = Math.round(50 + (netSentiment * 50));
    }
  }

  // E. Safety Score (Deduct penalties based on active risk engine metrics)
  let rawSafetyScore = 100;
  const safetyPenalties = [];

  if (debtToEquity > 2.0) {
    rawSafetyScore -= 30;
    safetyPenalties.push("High Leverage (D/E > 2.0): -30");
  }
  if (currentRatio < 1.0) {
    rawSafetyScore -= 30;
    safetyPenalties.push("Weak Liquidity (Current Ratio < 1.0): -30");
  }
  // Check if base free cash flow is negative or zero
  const cashFlowList = financials.annualCashFlow || [];
  const latestCF = cashFlowList[0];
  const fcfBase = latestCF ? (latestCF.freeCashFlow || (latestCF.operatingCashFlow + (latestCF.capitalExpenditures || 0))) : 0;
  if (fcfBase <= 0) {
    rawSafetyScore -= 20;
    safetyPenalties.push("Negative Free Cash Flow: -20");
  }
  if (operatingMargin < 0) {
    rawSafetyScore -= 20;
    safetyPenalties.push("Negative Operating Margin: -20");
  }
  if (revenueGrowth < 0) {
    rawSafetyScore -= 20;
    safetyPenalties.push("Negative Revenue Growth: -20");
  }
  if (priceTrend === 'Bearish') {
    rawSafetyScore -= 15;
    safetyPenalties.push("Bearish Price Trend: -15");
  }
  const safetyScore = Math.max(10, Math.min(100, rawSafetyScore));

  // 6. Weighted Consolidation & Dynamic Weights Normalization
  const w = valuationConfig.multiFactorWeights || {
    valuation: 0.30,
    financials: 0.30,
    momentum: 0.15,
    news: 0.10,
    risk: 0.15
  };

  let weightedSum = 0;
  let activeWeightsSum = 0;

  if (valuationScore !== null) {
    weightedSum += valuationScore * w.valuation;
    activeWeightsSum += w.valuation;
  }
  weightedSum += financialsScore * w.financials;
  activeWeightsSum += w.financials;
  weightedSum += momentumFactorScore * w.momentum;
  activeWeightsSum += w.momentum;
  weightedSum += newsScore * w.news;
  activeWeightsSum += w.news;
  weightedSum += safetyScore * w.risk;
  activeWeightsSum += w.risk;

  const baseOverallScore = Math.round(weightedSum / activeWeightsSum);

  // 6.5. Calculate Proportional News Catalyst Modifier
  let newsModifier = 0;
  if (newsList.length > 0) {
    for (const article of newsList) {
      let sentimentVal = 0;
      if (article.sentiment === 'positive') sentimentVal = 1;
      else if (article.sentiment === 'negative') sentimentVal = -1;

      let materialityVal = 1;
      if (article.materiality === 'high') materialityVal = 3;
      else if (article.materiality === 'medium') materialityVal = 2;

      // Proportional news impact: scales directly with both sentiment and materiality
      newsModifier += sentimentVal * (materialityVal / 3) * 6;
    }
    // Clamp news modifier to [-15, 10] range
    newsModifier = Math.max(-15, Math.min(10, Math.round(newsModifier)));
  }

  // Consolidated overall score including proportional news adjustment
  let overallScore = Math.max(10, Math.min(100, baseOverallScore + newsModifier));

  // 6.7. Risk/Safety Override Constraint
  // If the Safety Score is under 40 (critical distress/solvency risk), cap the overall score at 39 (SELL rating)
  // to protect against catastrophic cash-burn and restructuring risk.
  if (safetyScore < 40) {
    overallScore = Math.min(39, overallScore);
  }

  // Deterministic Rating Mapping
  let rating = 'Hold';
  if (overallScore >= 65) rating = 'Buy';
  else if (overallScore < 40) rating = 'Sell';

  const scores = {
    profitabilityScore,
    solvencyScore,
    momentumScore: momentumFactorScore,
    overallScore,
    targetPrice: valuation.consensusValue,
    breakdown: {
      valuationScore,
      financialsScore,
      momentumScore: momentumFactorScore,
      newsScore,
      newsModifier,
      safetyScore,
      safetyPenalties,
      overallScore,
      rating
    },
    ratios: {
      operatingMargin: parseFloat(operatingMargin.toFixed(2)),
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      currentRatio: parseFloat(currentRatio.toFixed(2)),
      debtToEquity: parseFloat(debtToEquity.toFixed(2)),
      priceTrend,
      roe: parseFloat(roe.toFixed(2)),
      freeCashFlow: fcfBase
    }
  };

  console.log(`[Graph Node]: Multi-factor rating resolved: ${rating.toUpperCase()} (Score: ${overallScore}/100)`);
  console.log(`[Graph Node]: Factor breakdown: Valuation: ${valuationScore ?? 'N/A'}, Financials: ${financialsScore}, News: ${newsScore}, Safety: ${safetyScore}`);

  return {
    scores,
    valuation,
    executionStage: 'generating recommendation'
  };
}

module.exports = computeScoresNode;
