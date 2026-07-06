/**
 * evidenceService.js
 * The service layer wrapping data collection business logic.
 * Sits between LangGraph nodes (orchestration) and the Provider Router (collection).
 * Isolates the graph nodes from provider selection, fallback logic, and network exceptions.
 */

const ProviderRouter = require('../providers/providerRouter');

class EvidenceService {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.providerRouter] - Custom provider router override
   */
  constructor(dependencies = {}) {
    this.router = dependencies.providerRouter || new ProviderRouter();
  }

  /**
   * Resolves a search string into a validated stock ticker.
   * 
   * @param {string} query - E.g. "Apple" or "Reliance"
   * @returns {Promise<Object>} Resolved company details.
   */
  async resolveCompany(query) {
    console.log(`[Evidence Service]: Resolving query "${query}"`);
    return await this.router.resolveCompany(query);
  }

  /**
   * Gathers normalized company profiling metadata.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @returns {Promise<Object>} Profile facts and sources trace.
   */
  async getProfile(ticker, market) {
    console.log(`[Evidence Service]: Requesting profile facts for "${ticker}"`);
    return await this.router.collectProfile(ticker, market);
  }

  /**
   * Gathers normalized financial statements, handling field-level recovery cascades internally.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @param {number} recollectionAttempt - Current loop index
   * @returns {Promise<Object>} Statements, source trace, and recovery audit history.
   */
  async getFinancials(ticker, market, recollectionAttempt = 1) {
    console.log(`[Evidence Service]: Requesting financials for "${ticker}" (Recollection Loop: ${recollectionAttempt})`);
    return await this.router.collectFinancials(ticker, market, { recollectionAttempt });
  }

  /**
   * Gathers news articles restricted to authoritative channels.
   * 
   * @param {string} companyName - Full corporate name
   * @returns {Promise<Object>} News articles list and sources trace.
   */
  async getNews(companyName) {
    console.log(`[Evidence Service]: Requesting news items for "${companyName}"`);
    return await this.router.collectNews(companyName);
  }

  /**
   * Gathers historical price closing series.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @returns {Promise<Object[]>} Array of historical date/close price records.
   */
  async getPriceHistory(ticker, market) {
    console.log(`[Evidence Service]: Requesting historical price stats for "${ticker}"`);
    return await this.router.collectPriceHistory(ticker, market);
  }
}

// Export single singleton instance for consistent provider sharing
module.exports = new EvidenceService();
