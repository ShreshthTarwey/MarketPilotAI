/**
 * tavilySearch.js
 * Concrete Search and News Provider implementing the Tavily Search API.
 * Extends both ISearchProvider and INewsProvider contracts.
 */

const ISearchProvider = require('../interfaces/searchProvider');
const INewsProvider = require('../interfaces/newsProvider');
const config = require('../../config/env');
const cache = require('../cache/memoryCache');

class TavilySearchProvider {
  /**
   * @param {Object} [dependencies]
   * @param {string} [dependencies.apiKey] - Tavily API key override
   */
  constructor(dependencies = {}) {
    this.apiKey = dependencies.apiKey || config.tavilyApiKey || '';
    this.cachePrefix = 'tavily-queries';
  }

  /**
   * Standardizes date formats parsed from search snippets or metadata.
   * 
   * @param {string} dateStr 
   * @returns {string} ISO Date.
   */
  _formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toISOString().split('T')[0];
  }

  /**
   * Executes a web search query on Tavily.
   * Implements ISearchProvider contract.
   * 
   * @param {string} query - The search query term.
   * @param {Object} [options] - Search options.
   * @param {boolean} [options.includeRawContent] - If true, requests full parsed markdown of pages.
   * @param {number} [options.maxResults] - Limit output length.
   * @returns {Promise<import('../interfaces/searchProvider').SearchResult[]>}
   */
  async search(query, options = {}) {
    if (!this.apiKey) {
      throw new Error("Tavily API key is not configured.");
    }

    const cleanQuery = query.trim();
    const cacheKey = cache.generateKey(`${this.cachePrefix}:search`, { cleanQuery, options });
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[Tavily Search]: Executing query "${cleanQuery}"`);

    const payload = {
      api_key: this.apiKey,
      query: cleanQuery,
      search_depth: 'advanced',
      include_raw_content: !!options.includeRawContent,
      max_results: options.maxResults || 5
    };

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tavily API HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    const results = (data.results || []).map(r => ({
      title: r.title || 'Untitled Page',
      url: r.url || '',
      snippet: r.content || '',
      rawContent: r.raw_content || ''
    }));

    cache.set(cacheKey, results);
    return results;
  }

  /**
   * Fetches recent news and sentiment metadata using Tavily's dedicated News search.
   * Implements INewsProvider contract.
   * 
   * @param {string} companyName - The target company ticker/name.
   * @returns {Promise<import('../interfaces/newsProvider').NewsArticle[]>}
   */
  async fetchRecentNews(companyName) {
    if (!this.apiKey) {
      throw new Error("Tavily API key is not configured.");
    }

    const cleanQuery = `${companyName.trim()} recent business developments news filings`;
    const cacheKey = cache.generateKey(`${this.cachePrefix}:news`, cleanQuery);

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[Tavily News]: Fetching news updates for "${companyName}"`);

    const payload = {
      api_key: this.apiKey,
      query: cleanQuery,
      search_depth: 'advanced',
      include_domains: ['bloomberg.com', 'reuters.com', 'wsj.com', 'finance.yahoo.com', 'cnbc.com', 'investors.com', 'sec.gov'],
      max_results: 6
    };

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tavily News API HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    const articles = (data.results || []).map(r => {
      // Estimate publisher from URL
      let source = 'Web Resource';
      try {
        const domain = new URL(r.url).hostname.replace('www.', '');
        source = domain.split('.')[0].toUpperCase();
      } catch (err) {
        // Fallback
      }

      return {
        title: r.title || 'Recent Update',
        url: r.url || '',
        source,
        publishedAt: this._formatDate(r.published_date),
        summary: r.content || '',
        sentiment: 'unknown' // Sentiment classification will occur downstream in the scoring engine
      };
    });

    cache.set(cacheKey, articles);
    return articles;
  }
}

// Inherit from interface class structures to ensure JSDoc validation passes
Object.setPrototypeOf(TavilySearchProvider.prototype, ISearchProvider.prototype);
Object.setPrototypeOf(TavilySearchProvider.prototype, INewsProvider.prototype);

module.exports = TavilySearchProvider;
