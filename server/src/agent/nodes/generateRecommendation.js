/**
 * generateRecommendation.js
 * Graph node responsible for qualitative synthesis and investment recommendation generation.
 * Merges scores, profile, news, history, and the rich valuation object.
 * Instructs the LLM to act as a qualitative reasoner rather than a calculator.
 */

const LLMRouter = require('../../providers/llmRouter');
const { calculateConfidence } = require('../../scoring/evidenceAggregator');
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
  const valuation = state.valuation || {};

  // Calculate the deterministic confidence score in JavaScript (not the LLM)
  const confidenceScore = calculateConfidence(state);

  // Construct a summary of recent articles for prompt context
  const newsSummary = news.slice(0, 5).map(article => 
    `- [${article.source}] ${article.title}: ${article.summary}`
  ).join('\n');

  const prompt = `
You are an expert investment research analyst.
We need to generate a formal investment thesis for "${name}" (Ticker: ${ticker}).

Here is the objective data calculated by our deterministic financial engine.
Do NOT attempt to recalculate, modify, or invent any of these numbers:

1. Company Description:
${profile.description || 'N/A'}

2. Quantitative Financial Scorecard:
- Overall Financial Score: ${scores.overallScore}/100
- Profitability Subscore: ${scores.profitabilityScore}/100 (Operating Margin: ${scores.ratios?.operatingMargin}%, Revenue Growth: ${scores.ratios?.revenueGrowth}%)
- Solvency Subscore: ${scores.solvencyScore}/100 (Current Ratio: ${scores.ratios?.currentRatio}, Debt-to-Equity: ${scores.ratios?.debtToEquity})
- Momentum Subscore: ${scores.momentumScore}/100 (Trend: ${scores.ratios?.priceTrend})

3. Valuation Calculations (Blended Consensus):
- Current Market Price: ${valuation.currentPrice ? `$${valuation.currentPrice.toFixed(2)}` : 'N/A'}
- Intrinsic DCF Fair Value: ${valuation.dcfValue ? `$${valuation.dcfValue.toFixed(2)}` : 'Not Estimated'}
- Intrinsic Multiples Fair Value: ${valuation.relativeValue ? `$${valuation.relativeValue.toFixed(2)}` : 'Not Estimated'}
- Intrinsic Blended Consensus Target Price: ${valuation.consensusValue ? `$${valuation.consensusValue.toFixed(2)}` : 'Not Estimated'}
- Valuation Upside: ${valuation.upsidePercent}%
- Valuation Downside: ${valuation.downsidePercent}%
- Margin of Safety Calculated: ${valuation.marginOfSafety}%
- Quantitative Recommendation Basis: ${valuation.recommendationBasis}
- WACC / Cost of Equity used in DCF: ${valuation.assumptions?.discountRate}%
- FCF Growth rate projected in DCF: ${valuation.assumptions?.freeCashFlowGrowth}%
- Sector PE Multiplier used: ${valuation.assumptions?.targetPE}

4. Recent News & Developments:
${newsSummary || 'No recent news articles collected.'}

5. Analysis Assessment:
- Deterministic analysis confidence level calculated in JS: ${confidenceScore}%

==================================================
Role of the LLM: Qualitative Synthesizer
==================================================
Your task is to interpret these numbers and compile a recommendation report.
Do NOT invent financial numbers, target prices, margins of safety, or confidence levels. Use them exactly as provided above.

Act as an experienced analyst:
1. Formulate the final investment rating (Buy, Hold, or Sell). It should logically align with the quantitative price targets, BUT you may adjust it (e.g. from Sell to Hold, or Buy to Hold) if qualitative evidence strongly warrants it.
2. Explain the core drivers of the thesis, tying the calculated metrics (Operating Margin, Leverage, Intrinsic Value, Upside/Downside) together.
3. Incorporate the recent news articles. Assess how news trends, business developments, or macro factors impact their risk profile.
4. Enumerate the risk factors.
5. If you adjust the rating away from the pure valuation direction based on news, acquisitions, or strategic developments, you MUST explicitly explain the rationale in your thesis.

You MUST output the "targetPrice" exactly as provided: ${valuation.consensusValue}.

You must output STRICTLY a JSON object matching this schema:
{
  "rating": "Buy" | "Hold" | "Sell",
  "targetPrice": ${valuation.consensusValue},
  "investmentThesis": "A detailed 2-3 paragraph explanation of the bullish or bearish thesis supporting the rating. Synthesize the intrinsic value and qualitative context.",
  "risks": [
    "Key risk factor 1 description",
    "Key risk factor 2 description"
  ],
  "confidenceScore": ${confidenceScore}
}
Return only JSON. Do not write markdown quotes or conversational prefixes.
`;

  try {
    const { data } = await llm.generateJSON(prompt);
    
    // Explicit safety overwrite to guarantee targetPrice matches our calculation
    data.targetPrice = valuation.consensusValue;
    data.confidenceScore = confidenceScore;

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
      targetPrice: valuation.consensusValue,
      investmentThesis: `Quantitative scorecard calculation returned a score of ${scores.overallScore}/100. However, the qualitative synthesis failed due to: ${err.message}`,
      risks: ["System processing limits", "LLM fallback triggered"],
      confidenceScore: confidenceScore
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
