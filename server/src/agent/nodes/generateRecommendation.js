/**
 * generateRecommendation.js
 * Graph node responsible for qualitative synthesis and investment recommendation generation.
 * Merges scores, profile, news, and history, asking the LLM to output a structured report.
 */

const LLMRouter = require('../../providers/llmRouter');
const llm = new LLMRouter();

/**
 * Node function to run reasoning models on final scorecard calculations.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} The recommendation object.
 */
async function generateRecommendationNode(state) {
  console.log(`[Graph Node]: Executing generateRecommendationNode`);

  const ticker = state.resolvedTicker;
  const name = state.resolvedName;
  const profile = state.profile || {};
  const scores = state.scores || {};
  const news = state.news || [];

  // Construct a summary of recent articles for prompt context
  const newsSummary = news.slice(0, 5).map(article => 
    `- [${article.source}] ${article.title}: ${article.summary}`
  ).join('\n');

  const prompt = `
You are an expert investment research analyst.
We need to generate a formal investment thesis for "${name}" (Ticker: ${ticker}).

Here is the structured facts we gathered:
1. Company Description:
${profile.description || 'N/A'}

2. Quantitative Financial Scorecard:
- Overall Financial Score: ${scores.overallScore}/100
- Profitability Subscore: ${scores.profitabilityScore}/100 (Operating Margin: ${scores.ratios?.operatingMargin}%, Revenue Growth: ${scores.ratios?.revenueGrowth}%)
- Solvency Subscore: ${scores.solvencyScore}/100 (Current Ratio: ${scores.ratios?.currentRatio}, Debt-to-Equity: ${scores.ratios?.debtToEquity})
- Momentum Subscore: ${scores.momentumScore}/100 (Trend: ${scores.ratios?.priceTrend})

3. Recent News & Developments:
${newsSummary || 'No recent news articles collected.'}

Synthesize these inputs. Your target rating must align with the quantitative scores (e.g. scores > 75 lean Bullish/Buy, scores < 40 lean Bearish/Sell).
You must output STRICTLY a JSON object matching this schema:
{
  "rating": "Buy" | "Hold" | "Sell",
  "targetPrice": 123.45,
  "investmentThesis": "A concise 2-3 paragraph explanation of the bullish or bearish thesis supporting the rating.",
  "risks": [
    "Key risk factor 1 description",
    "Key risk factor 2 description"
  ],
  "confidenceScore": 85
}
Return only JSON. Do not write markdown quotes or conversational prefixes.
`;

  try {
    const { data } = await llm.generateJSON(prompt);
    
    console.log(`[Graph Node]: Investment report compiled. Recommendation rating: ${data.rating}`);

    return {
      recommendation: data,
      executionStage: 'completed'
    };
  } catch (err) {
    console.error(`[Graph Node]: LLM recommendation compilation failed: ${err.message}`);
    
    // Graceful degradation: return a fallback recommendation object
    const fallbackRec = {
      rating: scores.overallScore > 65 ? 'Hold/Buy' : 'Hold/Sell',
      targetPrice: 0,
      investmentThesis: `Quantitative scorecard calculation returned a score of ${scores.overallScore}/100. However, the qualitative synthesis failed due to: ${err.message}`,
      risks: ["System processing limits", "LLM fallback triggered"],
      confidenceScore: 50
    };

    return {
      recommendation: fallbackRec,
      warnings: [{
        code: 'LLM_RECOMMENDATION_FAILED',
        message: err.message,
        severity: 'medium',
        category: 'llm_synthesis'
      }],
      executionStage: 'completed'
    };
  }
}

module.exports = generateRecommendationNode;
