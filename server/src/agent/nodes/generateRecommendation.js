/**
 * generateRecommendation.js
 * Graph node responsible for qualitative synthesis and investment recommendation generation.
 * Merges scores, profile, news, history, and the rich valuation object.
 * Instructs the LLM to act as a qualitative reasoner rather than a calculator.
 */

const LLMRouter = require('../../providers/llmRouter');
const { calculateConfidence, getConfidenceExplanation } = require('../../scoring/evidenceAggregator');
const llm = new LLMRouter();

/**
 * Node function to run reasoning models on final scorecard calculations.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} The recommendation object.
 */
async function generateRecommendationNode(state) {
  if (!state.resolvedTicker) {
    console.log(`[Graph Node]: Skipping generateRecommendationNode due to missing resolved ticker.`);
    return {
      recommendation: {
        rating: 'Hold',
        targetPrice: null,
        investmentThesis: 'Resolution failed. No company selected.',
        risks: [],
        confidenceScore: 0
      },
      executionStage: 'completed'
    };
  }
  console.log(`[Graph Node]: Executing generateRecommendationNode`);

  const ticker = state.resolvedTicker;
  const name = state.resolvedName;
  const profile = state.profile || {};
  const scores = state.scores || {};
  const news = state.news || [];
  const valuation = state.valuation || {};

  // Calculate the deterministic confidence score in JavaScript (not the LLM)
  const breakdown = scores.breakdown || {};
  const confidenceScore = calculateConfidence(state);

  // Construct a summary of recent articles for prompt context including sentiment/materiality
  const newsSummary = news.slice(0, 5).map(article => 
    `- [${article.source}] (Sentiment: ${article.sentiment}, Materiality: ${article.materiality}) ${article.title}: ${article.summary || article.snippet}`
  ).join('\n');

  const prompt = `
You are an expert investment research analyst.
We need to generate a formal investment thesis for "${name}" (Ticker: ${ticker}).

Here is the objective data calculated by our deterministic financial engine.
Do NOT attempt to recalculate, modify, or invent any of these numbers:

1. Company Description:
${profile.description || 'N/A'}

2. Multi-Factor Scorecard Breakdowns:
- Overall Investment Score: ${breakdown.overallScore}/100
- Deterministic Calculated Rating: ${breakdown.rating}
- Valuation Score: ${breakdown.valuationScore !== null ? `${breakdown.valuationScore}/100` : 'N/A'} (Gap between consensus target and current price)
- Financial Health Score: ${breakdown.financialsScore}/100 (Profitability: ${scores.profitabilityScore}/100, Solvency: ${scores.solvencyScore}/100)
- Momentum Score: ${breakdown.momentumScore}/100 (Price Trend: ${scores.ratios?.priceTrend})
- News Catalyst Score: ${breakdown.newsScore}/100 (Sentiment weighted by materiality)
- Safety Score: ${breakdown.safetyScore}/100 (Active Risk Penalties applied: ${breakdown.safetyPenalties?.join(', ') || 'None'})

3. Valuation Calculations (Blended Consensus):
- Current Market Price: ${valuation.currentPrice ? `$${valuation.currentPrice.toFixed(2)}` : 'N/A'}
- Intrinsic DCF Fair Value: ${valuation.dcfValue ? `$${valuation.dcfValue.toFixed(2)}` : 'Not Estimated'}
- Intrinsic Multiples Fair Value: ${valuation.relativeValue ? `$${valuation.relativeValue.toFixed(2)}` : 'Not Estimated'}
- Intrinsic Blended Consensus Target Price: ${valuation.consensusValue ? `$${valuation.consensusValue.toFixed(2)}` : 'Not Estimated'}
- Valuation Upside: ${valuation.upsidePercent}%
- Valuation Downside: ${valuation.downsidePercent}%
- Margin of Safety Calculated: ${valuation.marginOfSafety}%
- Quantitative Recommendation Basis: ${valuation.recommendationBasis}

4. Recent News & Developments (Classified Sentiment & Materiality):
${newsSummary || 'No recent news articles collected.'}

5. Analysis Assessment:
- Deterministic analysis confidence level calculated in JS: ${confidenceScore}%

==================================================
Role of the LLM: Qualitative Synthesizer & Explainer
==================================================
Your task is to interpret these numbers and compile a recommendation report.
Do NOT invent financial numbers, target prices, margins of safety, or confidence levels. Use them exactly as provided above.

Act as an experienced analyst:
1. Use the deterministic rating: "${breakdown.rating}". You must explain WHY the multi-factor scorecard resulted in a "${breakdown.rating}" rating.
2. In your thesis, explicitly explain the trade-offs between the factors. E.g., if valuation score is low (overvalued) but news catalysts are strong positive (e.g. major restructuring or new projects), explain how these offset each other.
3. Call out specific risk factors from the Safety Score penalties listed above (e.g. weak liquidity or negative FCF) and discuss their implications.

You must output STRICTLY a JSON object matching this schema:
{
  "rating": "${breakdown.rating}",
  "targetPrice": ${valuation.consensusValue || 'null'},
  "investmentThesis": "A detailed 2-3 paragraph explanation of the bullish or bearish thesis supporting the rating. Synthesize the intrinsic value, financial quality, and news context.",
  "risks": [
    "Key risk factor 1 description",
    "Key risk factor 2 description"
  ],
  "confidenceScore": ${confidenceScore}
}
Return only JSON. Do not write markdown quotes or conversational prefixes.
`;

  const confidenceReasons = getConfidenceExplanation(state);
  const lastUpdated = new Date().toISOString();

  try {
    const { data } = await llm.generateJSON(prompt);
    
    // Explicit safety overwrite to guarantee targetPrice & rating match our calculations
    data.targetPrice = valuation.consensusValue;
    data.confidenceScore = confidenceScore;
    data.rating = breakdown.rating;
    data.confidenceReasons = confidenceReasons;
    data.lastUpdated = lastUpdated;

    console.log(`[Graph Node]: Investment report compiled. Recommendation rating: ${data.rating}`);

    return {
      recommendation: data,
      lastUpdated: lastUpdated,
      executionStage: 'completed'
    };
  } catch (err) {
    console.error(`[Graph Node]: LLM recommendation compilation failed: ${err.message}`);
    
    // Graceful degradation: return a fallback recommendation object
    const fallbackRec = {
      rating: scores.overallScore > 65 ? 'Hold/Buy' : 'Hold/Sell',
      targetPrice: valuation.consensusValue,
      investmentThesis: `Quantitative scorecard calculation returned a score of ${scores.overallScore}/100. However, the qualitative synthesis failed due to: ${err.message}`,
      risks: ["System processing limits", "LLM fallback triggered"],
      confidenceScore: confidenceScore,
      confidenceReasons: confidenceReasons,
      lastUpdated: lastUpdated
    };

    return {
      recommendation: fallbackRec,
      lastUpdated: lastUpdated,
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
