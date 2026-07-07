/**
 * collectEvidence.js
 * Graph node responsible for running primary ingestion across all evidence categories.
 * Executes concurrent queries via Promise.all and normalizes data via the Evidence Aggregator.
 */

const evidenceService = require('../../services/evidenceService');
const { aggregateEvidence } = require('../../scoring/evidenceAggregator');

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

  // Run queries in parallel concurrently
  const [profileResult, financialsResult, newsResult, priceHistory] = await Promise.all([
    evidenceService.getProfile(ticker, market),
    evidenceService.getFinancials(ticker, market, state.recollectionAttempts + 1),
    evidenceService.getNews(name),
    evidenceService.getPriceHistory(ticker, market)
  ]);

  // Assemble raw collection trace
  const rawState = {
    profile: profileResult.profile,
    financials: financialsResult.financials,
    news: newsResult.news,
    marketContext: { priceHistory },
    sources: {
      ...profileResult.sources,
      ...financialsResult.sources,
      ...newsResult.sources,
      priceHistory: { providerName: 'YahooChart', fetchedAt: new Date().toISOString() }
    },
    recoveryHistory: financialsResult.recoveryHistory || []
  };

  // Invoke the intermediate Evidence Aggregator Layer
  const aggregated = aggregateEvidence(rawState);

  // Maps sources to providerCoverage explicitly
  return {
    profile: aggregated.profile,
    financials: aggregated.financials,
    news: aggregated.news,
    marketContext: aggregated.marketContext,
    providerCoverage: aggregated.sources,
    fallbackHistory: [
      ...(profileResult.fallbackHistory || []),
      ...(financialsResult.fallbackHistory || []),
      ...(newsResult.fallbackHistory || [])
    ],
    recoveryHistory: rawState.recoveryHistory,
    executionStage: 'evaluating quality'
  };
}

module.exports = collectEvidenceNode;
