/**
 * resolveCompany.js
 * The first node in our LangGraph workflow.
 * Responsible for normalizing inputs and deterministically resolving company tickers.
 */

const evidenceService = require('../../services/evidenceService');

/**
 * Node function to resolve the user's raw input query to a standard ticker symbol.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} State updates containing resolved details.
 */
async function resolveCompanyNode(state) {
  const query = (state.inputCompanyName || '').trim();
  
  console.log(`[Graph Node]: Executing resolveCompanyNode on query "${query}"`);
  
  const result = await evidenceService.resolveCompany(query);
  
  if (!result.success) {
    console.log(`[Graph Node]: Company resolution failed for "${query}".`);
    
    // Populate warnings and fail the qualityGate report to prevent downstream fetches
    return {
      executionStage: 'resolving company',
      warnings: [{
        code: 'RESOLUTION_FAILED',
        message: result.warning || `Could not resolve company symbol for "${query}".`,
        severity: 'high',
        category: 'validation'
      }],
      qualityReport: {
        profile: 0,
        incomeStatement: 0,
        balanceSheet: 0,
        cashFlow: 0,
        news: 0,
        overall: 0,
        missingFields: ['ticker', 'name', 'exchange'],
        recollectionRequired: false // Cannot recollect because CIK/Ticker lookup failed entirely
      }
    };
  }

  console.log(`[Graph Node]: Successfully resolved to Ticker: "${result.ticker}" (${result.name})`);
  
  return {
    resolvedTicker: result.ticker,
    resolvedName: result.name,
    market: result.market,
    executionStage: 'collecting evidence'
  };
}

module.exports = resolveCompanyNode;
