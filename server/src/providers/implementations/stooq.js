/**
 * stooq.js
 * Concrete Historical Price Provider.
 * Originally designed for Stooq CSV; refactored to use yahooFinance.chart internally
 * due to Stooq's Cloudflare browser-verification blocks on serverless environments.
 * Provides keyless daily and historical stock prices for global tickers.
 */

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const cache = require('../cache/memoryCache');

class StooqProvider {
  constructor() {
    this.cachePrefix = 'stooq-prices';
  }

  /**
   * Fetches historical close prices keylessly.
   * Uses yahooFinance.chart under the hood to bypass scraping bans and blocklists.
   * 
   * @param {string} ticker - Standardized ticker symbol.
   * @param {string} market - "US" | "IN" | "Global"
   * @returns {Promise<Object[]>} Array of parsed historical records { date, close }.
   */
  async fetchPriceHistory(ticker, market) {
    const symbol = ticker.trim().toUpperCase();
    const cacheKey = cache.generateKey(this.cachePrefix, symbol);

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[Stooq Wrapper/Yahoo Chart]: Fetching historical price series for "${symbol}"`);

    try {
      // Fetch the last 1 year of daily stock prices
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateStr = oneYearAgo.toISOString().split('T')[0];

      const res = await yahooFinance.chart(symbol, {
        period1: dateStr,
        interval: '1d'
      });

      if (!res || !res.quotes || res.quotes.length === 0) {
        throw new Error(`No quote data returned by Yahoo Chart for "${symbol}".`);
      }

      // Parse and sort records (latest date first)
      const records = res.quotes
        .map(q => ({
          date: q.date ? new Date(q.date).toISOString().split('T')[0] : '',
          close: q.close
        }))
        .filter(r => !!r.date && r.close !== null && r.close !== undefined)
        .reverse();

      cache.set(cacheKey, records);
      return records;
    } catch (err) {
      console.warn(`[Stooq Wrapper/Yahoo Chart]: Failed to fetch prices for "${symbol}": ${err.message}`);
      throw err;
    }
  }
}

module.exports = StooqProvider;
