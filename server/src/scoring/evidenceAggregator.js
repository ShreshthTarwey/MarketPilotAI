/**
 * evidenceAggregator.js
 * Merges, normalizes, and audits data collected from multi-providers.
 * Calculates deterministic confidence metrics and counts recovery operations.
 */

/**
 * Calculates a deterministic confidence score based on data completeness and provider reliability.
 * 
 * @param {Object} state - The raw combined evidence
 * @returns {number} Confidence score (30 - 100).
 */
function calculateConfidence(state) {
  let score = 100;

  // 1. Check Profile completeness
  const profile = state.profile || {};
  if (!profile.name) score -= 5;
  if (!profile.sector || profile.sector === 'Unknown Sector') score -= 5;
  if (!profile.marketCap || profile.marketCap === 0) score -= 10;

  // 2. Check Financial statement missing fields
  const financials = state.financials || {};
  const income = financials.annualIncomeStatement || [];
  const balance = financials.annualBalanceSheet || [];
  const cash = financials.annualCashFlow || [];

  if (income.length === 0) score -= 15;
  if (balance.length === 0) score -= 15;
  if (cash.length === 0) score -= 15;

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
  const news = state.news || [];
  if (news.length === 0) {
    score -= 10;
  } else if (news.length < 3) {
    score -= 5;
  }

  // Enforce bounds
  return Math.max(30, Math.min(100, score));
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
