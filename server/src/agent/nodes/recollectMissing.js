/**
 * recollectMissing.js
 * Graph node responsible for running targeted recollection checks.
 * Incrementing recollection attempts and patching missing fields.
 */

const evidenceService = require('../../services/evidenceService');

/**
 * Node function to target recover only missing categories.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} Recovery updates.
 */
async function recollectMissingNode(state) {
  const ticker = state.resolvedTicker;
  const name = state.resolvedName;
  const market = state.market;
  const nextAttempt = (state.recollectionAttempts || 0) + 1;

  console.log(`[Graph Node]: Executing recollectMissingNode (Attempt: ${nextAttempt})`);

  const report = state.qualityReport || {};
  const updates = {
    recollectionAttempts: nextAttempt,
    executionStage: 'evaluating quality'
  };

  const tasks = [];

  // 1. Recover Profile if below 80%
  const shouldRecoverProfile = report.profile < 80;
  if (shouldRecoverProfile) {
    console.log(`[Graph Node]: Profile completeness is low (${report.profile}%). Triggering recovery...`);
    tasks.push(
      evidenceService.getProfile(ticker, market).then(res => {
        if (res.profile) {
          updates.profile = { ...state.profile, ...res.profile };
          updates.sources = { ...updates.sources, ...res.sources };
          updates.fallbackHistory = [...(res.fallbackHistory || [])];
        }
      })
    );
  }

  // 2. Recover Financials if any sheet is below 80%
  const shouldRecoverFinancials = report.incomeStatement < 80 || report.balanceSheet < 80 || report.cashFlow < 80;
  if (shouldRecoverFinancials) {
    console.log(`[Graph Node]: Financials completeness is low. Triggering field-level recovery cascade...`);
    tasks.push(
      evidenceService.getFinancials(ticker, market, nextAttempt).then(res => {
        if (res.financials) {
          // Note: financials merge is handled inside the router's field patching logic,
          // so we can overwrite/merge the financials directly in the updates payload.
          updates.financials = res.financials;
          updates.sources = { ...updates.sources, ...res.sources };
          updates.fallbackHistory = [...(updates.fallbackHistory || []), ...(res.fallbackHistory || [])];
          updates.recoveryHistory = [...(res.recoveryHistory || [])];
        }
      })
    );
  }

  // 3. Recover News if below 60%
  const shouldRecoverNews = report.news < 60;
  if (shouldRecoverNews) {
    console.log(`[Graph Node]: News completeness is low (${report.news}%). Triggering fallback news scraper...`);
    tasks.push(
      evidenceService.getNews(name).then(res => {
        if (res.news && res.news.length > 0) {
          updates.news = res.news;
          updates.sources = { ...updates.sources, ...res.sources };
          updates.fallbackHistory = [...(updates.fallbackHistory || []), ...(res.fallbackHistory || [])];
        }
      })
    );
  }

  // Wait for all active recovery requests to resolve
  if (tasks.length > 0) {
    await Promise.all(tasks);
  } else {
    console.log(`[Graph Node]: No low completeness indicators found. Skipping recollection.`);
  }

  return updates;
}

module.exports = recollectMissingNode;
