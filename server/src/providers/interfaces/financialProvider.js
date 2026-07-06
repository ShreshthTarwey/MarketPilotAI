/**
 * financialProvider.js
 * Abstract interface contract and JSDoc schemas for all Financial Data Providers.
 * Any concrete provider (e.g. Yahoo, AlphaVantage, Mock) must extend this class and override its methods.
 */

/**
 * @typedef {Object} CompanyProfile
 * @property {string} ticker - Clean stock symbol (e.g., "RELIANCE.NS", "AAPL")
 * @property {string} name - Official corporate name
 * @property {string} sector - Macro sector (e.g., "Technology")
 * @property {string} industry - Specific industry (e.g., "Consumer Electronics")
 * @property {string} description - Summary of business operations
 * @property {number} marketCap - Current market capitalization in currency units
 * @property {string} country - Country of headquarters
 * @property {string} website - URL of the corporate website
 */

/**
 * @typedef {Object} FinancialStatements
 * @property {Array<Object>} annualIncomeStatement - Array of parsed annual income statements (latest first)
 * @property {Array<Object>} annualBalanceSheet - Array of annual balance sheet snapshots (latest first)
 * @property {Array<Object>} annualCashFlow - Array of annual cash flow statements (latest first)
 * @property {Array<Object>} [quarterlyIncomeStatement] - Quarterly income statement records
 * @property {Array<Object>} [quarterlyBalanceSheet] - Quarterly balance sheet snapshots
 * @property {Array<Object>} [quarterlyCashFlow] - Quarterly cash flow statements
 */

class IFinancialDataProvider {
  constructor() {
    if (new.target === IFinancialDataProvider) {
      throw new TypeError("Cannot construct IFinancialDataProvider instances directly. Implementations must override.");
    }
  }

  /**
   * Fetches basic company profile data.
   * 
   * @param {string} ticker - Standardized stock ticker symbol.
   * @returns {Promise<CompanyProfile>} Parsed company metadata.
   * @abstract
   */
  async fetchProfile(ticker) {
    throw new Error(`fetchProfile(${ticker}) not implemented in sub-class.`);
  }

  /**
   * Fetches core financial statement snapshots (annual and quarterly).
   * 
   * @param {string} ticker - Standardized stock ticker symbol.
   * @returns {Promise<FinancialStatements>} Structured financial reports.
   * @abstract
   */
  async fetchStatements(ticker) {
    throw new Error(`fetchStatements(${ticker}) not implemented in sub-class.`);
  }
}

module.exports = IFinancialDataProvider;
