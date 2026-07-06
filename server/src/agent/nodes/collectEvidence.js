/**
 * collectEvidence.js
 * Graph node responsible for running primary ingestion across all evidence categories.
 * Calls the EvidenceService and aggregates initial profiles, financials, and news.
 */

const evidenceService = require('../../services/evidenceService');

/**
 * Node function to gather primary structured evidence in parallel.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} Merged evidence data.
 */
async function collectEvidenceNode(state) {
  const ticker = state.resolvedTicker;
  const name = state.resolvedName;
  const market = state.market;

  console.log(`[Graph Node]: Executing collectEvidenceNode for Ticker: "${ticker}" (${market})`);

  // Run initial queries in parallel to minimize latency
  const [profileResult, financialsResult, newsResult, priceHistory] = await Promise.all([
    evidenceService.getProfile(ticker, market),
    evidenceService.getFinancials(ticker, market, state.recollectionAttempts + 1),
    evidenceService.getNews(name),
    evidenceService.getPriceHistory(ticker, market)
  ]);

  // Combine and format the price stats as market context
  const marketContext = {
    priceHistory,
    lastRefreshed: new Date().toISOString()
  };

  return {
    profile: profileResult.profile,
    financials: financialsResult.financials,
    news: newsResult.news,
    marketContext,
    sources: {
      ...profileResult.sources,
      ...financialsResult.sources,
      ...newsResult.sources,
      priceHistory: { providerName: 'YahooChart', fetchedAt: new Date().toISOString() }
    },
    fallbackHistory: [
      ...(profileResult.fallbackHistory || []),
      ...(financialsResult.fallbackHistory || []),
      ...(newsResult.fallbackHistory || [])
    ],
    recoveryHistory: financialsResult.recoveryHistory || [],
    executionStage: 'evaluating quality'
  };
}

module.exports = collectEvidenceNode;
