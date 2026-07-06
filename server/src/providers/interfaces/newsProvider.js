/**
 * newsProvider.js
 * Abstract interface contract and JSDoc schemas for all News Providers.
 * Any concrete provider (e.g. Tavily, NewsAPI, Mock) must extend this class and override its methods.
 */

/**
 * @typedef {Object} NewsArticle
 * @property {string} title - Heading/Title of the news article
 * @property {string} url - Source URL link for validation/citations
 * @property {string} source - Publisher name (e.g., "Reuters", "Bloomberg")
 * @property {string} publishedAt - ISO timestamp or clean date string
 * @property {string} summary - Brief excerpt or content snippet of the article
 * @property {("positive"|"negative"|"neutral"|"unknown")} [sentiment] - Calculated/Estimated market sentiment of this article
 */

class INewsProvider {
  constructor() {
    if (new.target === INewsProvider) {
      throw new TypeError("Cannot construct INewsProvider instances directly. Implementations must override.");
    }
  }

  /**
   * Fetches recent news articles and market updates for a company.
   * 
   * @param {string} companyName - Resolving corporate name or ticker.
   * @returns {Promise<NewsArticle[]>} Array of structured news items.
   * @abstract
   */
  async fetchRecentNews(companyName) {
    throw new Error(`fetchRecentNews(${companyName}) not implemented in sub-class.`);
  }
}

module.exports = INewsProvider;
