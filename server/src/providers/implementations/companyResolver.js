/**
 * companyResolver.js
 * Concrete implementation of the Company Resolution Provider.
 * Resolves raw queries to standard stock tickers using Yahoo Finance Search API.
 * Employs LLM auto-correction as a fallback, verifying all suggestions deterministically.
 */

const cache = require('../cache/memoryCache');
const LLMRouter = require('../llmRouter');
const valuationConfig = require('../../config/valuationConfig');

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(s1, s2) {
  const a = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a.length === 0 || b.length === 0) return 0;
  if (a === b) return 1.0;
  
  // Acronym/abbreviation check (e.g. "TCS" for "Tata Consultancy Services")
  const words = s2.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => !!w);
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('');
    if (acronym.includes(a) || a.includes(acronym)) {
      return 0.95;
    }
  }
  
  const distance = getLevenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1.0 - (distance / maxLength);
}

class CompanyResolver {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.llmRouter] - LLM Router instance for corrections
   */
  constructor(dependencies = {}) {
    this.llmRouter = dependencies.llmRouter || new LLMRouter();
    this.cachePrefix = 'company-resolution';
  }

  /**
   * Translates Yahoo Finance exchange codes to clean market segments.
   * 
   * @param {string} exchangeCode - E.g. "NSI", "BSE", "NMS", "NYQ"
   * @param {string} ticker - The stock symbol
   * @returns {("US"|"IN"|"Global")} Market segment
   */
  _resolveMarket(exchangeCode, ticker) {
    const code = (exchangeCode || '').toUpperCase();
    const symbol = (ticker || '').toUpperCase();

    if (code === 'NSI' || code === 'BSE' || symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
      return 'IN';
    }
    if (code === 'NMS' || code === 'NYQ' || code === 'ASE' || code === 'PCX') {
      return 'US';
    }
    return 'Global';
  }

  /**
   * Helper to normalize exchange names to human-readable versions.
   * 
   * @param {string} code 
   * @returns {string} Human-friendly exchange name.
   */
  _normalizeExchange(code) {
    const exchangeMap = {
      'NMS': 'NASDAQ',
      'NYQ': 'NYSE',
      'NSI': 'NSE',
      'BSE': 'BSE',
      'AMS': 'Euronext Amsterdam',
      'LSE': 'London Stock Exchange',
      'GER': 'Frankfurt Stock Exchange'
    };
    return exchangeMap[code.toUpperCase()] || code || 'Unknown Exchange';
  }

  /**
   * Deterministically searches Yahoo Finance autocomplete search API.
   * 
   * @param {string} query 
   * @returns {Promise<Object[]|null>} Array of matching quote objects or null.
   */
  async _queryYahooSearch(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Search HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.quotes || [];
    } catch (err) {
      console.warn(`[Company Resolver]: Yahoo Search call failed for "${cleanQuery}": ${err.message}`);
      return null;
    }
  }

  /**
   * Core resolution method.
   * 
   * @param {string} companyName - Raw input string (e.g. "Apple" or "TCS")
   * @returns {Promise<Object>} Resolved company object.
   */
  async resolve(companyName) {
    const query = (companyName || '').trim();
    if (!query) {
      return {
        success: false,
        ticker: null,
        name: null,
        exchange: null,
        market: 'Global',
        suggestions: [],
        warning: 'Empty search query provided.'
      };
    }

    // Step 1: Check Memory Cache
    const cacheKey = cache.generateKey(this.cachePrefix, query);
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    console.log(`[Company Resolver]: Resolving "${query}"`);

    // Step 2: Query Yahoo Finance Search API
    const quotes = await this._queryYahooSearch(query);

    if (quotes && quotes.length > 0) {
      // Find the top Equity/Stock quote (ignoring ETFs, Funds, or Options)
      const topMatch = quotes.find(q => q.quoteType === 'EQUITY' || q.typeDisp === 'Equity');

      if (topMatch) {
        const result = {
          success: true,
          ticker: topMatch.symbol,
          name: topMatch.shortname || topMatch.longname || topMatch.symbol,
          exchange: this._normalizeExchange(topMatch.exchange),
          market: this._resolveMarket(topMatch.exchange, topMatch.symbol),
          resolutionConfidence: 1.0,
          suggestions: []
        };
        cache.set(cacheKey, result);
        return result;
      }
    }

    // Step 3: Fallback - Query LLM to suggest correct names or tickers
    console.log(`[Company Resolver]: Direct lookup failed for "${query}". Triggering LLM auto-correct.`);

    const prompt = `
You are acting as an investment research resolution tool.
The user entered: "${query}"
Our database search returned zero stock symbol results. This could be due to a typo (e.g., "Aple"), an abbreviation, or a colloquial name.
Suggest up to 3 publicly traded companies that might match.
Return your response STRICTLY as a JSON object of this structure:
{
  "suggestions": [
    { "name": "Apple Inc.", "ticker": "AAPL" },
    { "name": "Tata Consultancy Services", "ticker": "TCS.NS" }
  ]
}
Do not return any surrounding text. Do not invent symbols. Suggest only real public equities.
`;

    let suggestions = [];
    try {
      const { data } = await this.llmRouter.generateJSON(prompt);
      suggestions = data?.suggestions || [];
    } catch (err) {
      console.warn(`[Company Resolver]: LLM suggestion query failed: ${err.message}`);
    }

    // Step 4: Verify LLM suggestions deterministically
    const suggestedNames = [];
    for (const item of suggestions) {
      const candidateSymbol = item.ticker;
      if (!candidateSymbol) continue;

      // Compute similarity match score to prevent LLM hallucinations on numeric or garbage inputs
      const nameSim = item.name ? calculateSimilarity(query, item.name) : 0;
      const tickerSim = candidateSymbol ? calculateSimilarity(query, candidateSymbol) : 0;
      const similarity = Math.max(nameSim, tickerSim);
      const minSim = valuationConfig.resolutionMinSimilarity || 0.70;

      if (similarity < minSim) {
        console.log(`[Company Resolver]: Skipping LLM suggestion "${item.name || candidateSymbol}" due to low similarity confidence: ${(similarity * 100).toFixed(1)}%`);
        continue;
      }

      console.log(`[Company Resolver]: Verifying LLM suggested ticker "${candidateSymbol}" (Similarity: ${(similarity * 100).toFixed(1)}%)`);
      const verifyQuotes = await this._queryYahooSearch(candidateSymbol);

      if (verifyQuotes && verifyQuotes.length > 0) {
        const topVerifyMatch = verifyQuotes.find(
          q => (q.symbol && q.symbol.toUpperCase() === candidateSymbol.toUpperCase()) &&
            (q.quoteType === 'EQUITY' || q.typeDisp === 'Equity')
        );

        if (topVerifyMatch) {
          const verifiedResult = {
            success: true,
            ticker: topVerifyMatch.symbol,
            name: topVerifyMatch.shortname || topVerifyMatch.longname || topVerifyMatch.symbol,
            exchange: this._normalizeExchange(topVerifyMatch.exchange),
            market: this._resolveMarket(topVerifyMatch.exchange, topVerifyMatch.symbol),
            resolutionConfidence: parseFloat(similarity.toFixed(2)),
            suggestions: []
          };
          console.log(`[Company Resolver]: LLM suggested ticker "${candidateSymbol}" successfully verified.`);
          cache.set(cacheKey, verifiedResult);
          return verifiedResult;
        }
      } else if (verifyQuotes === null && similarity >= 0.90) {
        console.log(`[Company Resolver]: Yahoo Search validation is offline. Accepting high-confidence LLM candidate "${candidateSymbol}" directly.`);
        const verifiedResult = {
          success: true,
          ticker: candidateSymbol.toUpperCase(),
          name: item.name || candidateSymbol.toUpperCase(),
          exchange: 'Global',
          market: 'Global',
          resolutionConfidence: parseFloat(similarity.toFixed(2)),
          suggestions: []
        };
        cache.set(cacheKey, verifiedResult);
        return verifiedResult;
      }

      if (item.name) {
        suggestedNames.push(item.name);
      }
    }

    // Step 5: If resolution fails completely, return suggestions from Yahoo autocomplete
    const yahooSuggestions = (quotes || [])
      .slice(0, 3)
      .map(q => q.shortname || q.longname || q.symbol)
      .filter(name => !!name);

    const finalSuggestions = [...new Set([...suggestedNames, ...yahooSuggestions])].slice(0, 4);

    const failResult = {
      success: false,
      ticker: null,
      name: null,
      exchange: null,
      market: 'Global',
      resolutionConfidence: 0.0,
      suggestions: finalSuggestions,
      warning: `Could not resolve company symbol for "${query}".`
    };

    cache.set(cacheKey, failResult);
    return failResult;
  }
}

module.exports = CompanyResolver;
