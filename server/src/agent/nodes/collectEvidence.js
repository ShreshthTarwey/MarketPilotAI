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

  if (!ticker) {
    console.log(`[Graph Node]: Skipping collectEvidenceNode due to missing resolved ticker.`);
    return { executionStage: 'evidence collection bypassed' };
  }

  console.log(`[Graph Node]: Executing collectEvidenceNode for Ticker: "${ticker}" (${market})`);

  // Run queries in parallel concurrently
  const [profileResult, financialsResult, newsResult, priceHistory] = await Promise.all([
    evidenceService.getProfile(ticker, market),
    evidenceService.getFinancials(ticker, market, state.recollectionAttempts + 1),
    evidenceService.getNews(name),
    evidenceService.getPriceHistory(ticker, market)
  ]);

  // Batch classify news sentiment and materiality using the LLM Router
  let newsList = newsResult.news || [];
  if (newsList.length > 0) {
    try {
      console.log(`[Graph Node]: Analyzing news sentiment & materiality for "${name}"`);
      const newsClassifierPrompt = `You are a professional financial news sentiment analyzer. 
Analyze the following list of news articles for "${name}" and classify each one's market sentiment (positive, negative, or neutral) and its materiality impact (high, medium, or low).

Materiality Guide:
- High: Market-moving news (mergers, major restructuring, fraud, earnings beats/misses, government contracts, CEO changes).
- Medium: Normal business updates (earnings announcements, product releases, analyst rating updates).
- Low: General industry mentions, minor newsletters, general stock market reports.

News Articles:
${newsList.map((n, idx) => `${idx}. Title: ${n.title}\nSnippet: ${n.snippet}`).join('\n\n')}

Return ONLY a raw JSON array matching this schema:
[
  { "index": number, "sentiment": "positive"|"negative"|"neutral", "materiality": "high"|"medium"|"low" }
]
Do not return any explanation or other text.`;

      const llmRouter = evidenceService.router.llmRouter;
      const { data } = await llmRouter.generateJSON(newsClassifierPrompt);
      const classifications = Array.isArray(data) ? data : data?.classifications || [];

      newsList = newsList.map((article, idx) => {
        const match = classifications.find(c => c.index === idx);
        return {
          ...article,
          sentiment: match?.sentiment || 'neutral',
          materiality: match?.materiality || 'low'
        };
      });
      console.log(`[Graph Node]: Classified ${newsList.length} news articles successfully.`);
    } catch (err) {
      console.warn(`[Graph Node]: News sentiment classification failed: ${err.message}. Falling back to default neutral/low.`);
      newsList = newsList.map(article => ({
        ...article,
        sentiment: 'neutral',
        materiality: 'low'
      }));
    }
  }

  // Assemble raw collection trace
  const rawState = {
    profile: profileResult.profile,
    financials: financialsResult.financials,
    news: newsList,
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
