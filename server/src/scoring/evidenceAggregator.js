/**
 * evidenceAggregator.js
 * Merges, normalizes, and audits data collected from multi-providers.
 * Calculates deterministic confidence metrics and counts recovery operations.
 */

const { evaluateQualityGate } = require('./qualityGate');

/**
 * Calculates a deterministic confidence score based on data completeness and provider reliability.
 * 
 * @param {Object} state - The raw combined evidence
 * @returns {number} Confidence score (30 - 100).
 */
function calculateConfidence(state) {
  let score = 100;

  // Run the quality gate report to get true item-level completeness percentages
  const report = evaluateQualityGate(state);

  // 1. Profile completeness penalty (deduct up to 20% proportional to missing fields)
  if (report.profile < 80) {
    score -= (100 - report.profile) * 0.20;
  }

  // 2. Financial statement completeness penalties (deduct up to 15% for each category)
  if (report.incomeStatement < 80) {
    score -= (100 - report.incomeStatement) * 0.15;
  }
  if (report.balanceSheet < 80) {
    score -= (100 - report.balanceSheet) * 0.15;
  }
  if (report.cashFlow < 80) {
    score -= (100 - report.cashFlow) * 0.15;
  }

  // 3. Penalty for fallback providers used
  const recoveryHistory = state.recoveryHistory || [];
  const providersUsed = new Set(recoveryHistory.map(r => r.provider));

  if (providersUsed.has('YahooTimeSeries')) {
    score -= 5; // Slight penalty for time-series fallback
  }
  if (providersUsed.has('SecEdgar')) {
    score -= 10; // Medium penalty for SEC parsing mapping
  }
  if (providersUsed.has('TavilySearch+LLM')) {
    score -= 20; // High penalty for unstructured LLM scraping extraction
  }

  // 4. News check
  if (report.news < 60) {
    score -= 10;
  }

  // 5. Model Agreement Check (Valuation Agreement)
  const valuation = state.valuation || {};
  const currentPrice = state.marketContext?.currentPrice || valuation.currentPrice;
  const dcfVal = valuation.dcfValue || valuation.fairPrice; // Support nested and flat structures
  const multVal = valuation.relativeValue || valuation.peVal || valuation.pbVal;

  if (dcfVal && multVal && currentPrice) {
    const dcfIsBuy = dcfVal > currentPrice;
    const multIsBuy = multVal > currentPrice;
    
    if (dcfIsBuy !== multIsBuy) {
      score -= 15; // Models disagree on direction! Deduct 15 points.
    } else {
      score += 5;  // Models agree! Add 5 points bonus.
    }
  } else if (!dcfVal || !multVal) {
    score -= 10; // Less data alignment (one model is missing)
  }

  // 6. Quality of Financials (Deduct points for active recovery operations)
  if (recoveryHistory.length > 0) {
    score -= Math.min(10, recoveryHistory.length * 0.5); // Max 10 points penalty for patchy/recovered data
  }

  // Enforce boundaries
  return Math.max(30, Math.min(100, Math.round(score)));
}

/**
 * Compiles raw state variables into a unified Normalized Evidence package.
 * Computes completeness statistics and runs programmatic audits.
 * 
 * @param {Object} state - Current graph state properties.
 * @returns {Object} Normalized evidence payload with diagnostics.
 */
function aggregateEvidence(state) {
  const profile = state.profile || null;
  const financials = state.financials || null;
  const news = state.news || [];
  const marketContext = state.marketContext || {};
  const sources = state.sources || {};
  const recoveryHistory = state.recoveryHistory || [];
  
  // Calculate recovery stats
  const recoveredFieldsCount = recoveryHistory.length;
  const recoveredFields = [...new Set(recoveryHistory.map(r => r.field))];

  // Count active providers used
  const uniqueProviders = new Set();
  if (sources.profile?.providerName) uniqueProviders.add(sources.profile.providerName);
  if (sources.financials?.providerName) uniqueProviders.add(sources.financials.providerName);
  if (sources.news?.providerName) uniqueProviders.add(sources.news.providerName);
  recoveryHistory.forEach(r => uniqueProviders.add(r.provider));

  // Determine pricing stats
  const prices = marketContext.priceHistory || [];
  const currentPrice = prices.length > 0 ? prices[0].close : null;

  // Calculate JS confidence score
  const deterministicConfidence = calculateConfidence({
    profile,
    financials,
    news,
    recoveryHistory
  });

  return {
    profile,
    financials,
    news,
    marketContext: {
      ...marketContext,
      currentPrice
    },
    sources,
    audit: {
      recoveredFieldsCount,
      recoveredFields,
      providersCount: uniqueProviders.size,
      providersList: [...uniqueProviders],
      deterministicConfidence
    }
  };
}

module.exports = {
  aggregateEvidence,
  calculateConfidence
};
