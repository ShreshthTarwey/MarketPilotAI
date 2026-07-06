/**
 * searchProvider.js
 * Abstract interface contract and JSDoc schemas for all Web Search Providers.
 * Any concrete provider (e.g. Tavily, Google, Mock) must extend this class and override its methods.
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} title - Page title of the search result
 * @property {string} url - Link URL of the page
 * @property {string} snippet - Brief text snippet matching the query
 * @property {string} [rawContent] - Full text scrape of the page (if scraping was enabled)
 */

class ISearchProvider {
  constructor() {
    if (new.target === ISearchProvider) {
      throw new TypeError("Cannot construct ISearchProvider instances directly. Implementations must override.");
    }
  }

  /**
   * Executes a web search query.
   * 
   * @param {string} query - The search query term.
   * @param {Object} [options] - Search options (e.g., limit, depth).
   * @returns {Promise<SearchResult[]>} Array of parsed search results.
   * @abstract
   */
  async search(query, options = {}) {
    throw new Error(`search(${query}) not implemented in sub-class.`);
  }
}

module.exports = ISearchProvider;
