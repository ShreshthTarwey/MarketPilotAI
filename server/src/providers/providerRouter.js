/**
 * providerRouter.js
 * Redesigned Evidence Provider Router.
 * Implements field-level recovery and cascading structured/unstructured fallbacks.
 * Merges missing data points dynamically and logs recovery provenance records.
 */

const YahooFinanceProvider = require('./implementations/yahooFinance');
const SecEdgarProvider = require('./implementations/secEdgar');
const StooqProvider = require('./implementations/stooq');
const TavilySearchProvider = require('./implementations/tavilySearch');
const CompanyResolver = require('./implementations/companyResolver');
const LLMRouter = require('./llmRouter');

// Load Quality Gate validators for diagnostics
const {
  evaluateProfile,
  evaluateIncomeStatement,
  evaluateBalanceSheet,
  evaluateCashFlow,
  evaluateNews
} = require('../scoring/qualityGate');

class ProviderRouter {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.financialProvider]
   * @param {Object} [dependencies.secEdgarProvider]
   * @param {Object} [dependencies.stooqProvider]
   * @param {Object} [dependencies.searchProvider]
   * @param {Object} [dependencies.newsProvider]
   * @param {Object} [dependencies.companyResolver]
   * @param {Object} [dependencies.llmRouter]
   */
  constructor(dependencies = {}) {
    this.financialProvider = dependencies.financialProvider || new YahooFinanceProvider();
    this.secEdgarProvider = dependencies.secEdgarProvider || new SecEdgarProvider();
    this.stooqProvider = dependencies.stooqProvider || new StooqProvider();
    this.searchProvider = dependencies.searchProvider || new TavilySearchProvider();
    this.newsProvider = dependencies.newsProvider || new TavilySearchProvider();
    this.companyResolver = dependencies.companyResolver || new CompanyResolver({ llmRouter: dependencies.llmRouter });
    this.llmRouter = dependencies.llmRouter || new LLMRouter();
  }

  /**
   * Resolves a raw company query into a standardized ticker.
   * 
   * @param {string} query 
   * @returns {Promise<Object>} The resolved company metadata payload.
   */
  async resolveCompany(query) {
    return await this.companyResolver.resolve(query);
  }

  /**
   * Helper to merge missing fields from a fallback financial statement object into a primary.
   * Logs details to the recoveryHistory log pool.
   * 
   * @param {Object} primary - Primary statements object
   * @param {Object} fallback - Fallback statements object
   * @param {string} category - Statement key: 'annualIncomeStatement' | 'annualBalanceSheet' | 'annualCashFlow'
   * @param {Function} validatorFunc - Diagnostic scorer
   * @param {string} providerName - Fallback provider source name
   * @param {number} attempt - Current recollection loop index
   * @param {Object[]} recoveryHistory - Accumulating history array
   */
  _mergeMissingFields(primary, fallback, category, validatorFunc, providerName, attempt, recoveryHistory) {
    if (!primary || !fallback) return;

    const primaryList = primary[category] || [];
    const fallbackList = fallback[category] || [];

    // Diagnose which fields are currently missing in primary
    const diagnostic = validatorFunc(primaryList);
    const missingFields = diagnostic.missing;

    if (missingFields.length === 0) return;

    let recoveredCount = 0;

    for (const pStmt of primaryList) {
      const pDate = pStmt.fiscalDate;
      if (!pDate) continue;
      const pYear = new Date(pDate).getFullYear();

      // Find matching record in fallback by date or year
      const fStmt = fallbackList.find(f => {
        if (!f.fiscalDate) return false;
        return f.fiscalDate === pDate || new Date(f.fiscalDate).getFullYear() === pYear;
      });

      if (!fStmt) continue;

      // Patch only missing fields
      for (const field of missingFields) {
        const val = pStmt[field];
        if (val === null || val === undefined || val === 0) {
          const fallbackVal = fStmt[field];
          if (fallbackVal !== null && fallbackVal !== undefined && fallbackVal !== 0) {
            pStmt[field] = fallbackVal;
            recoveredCount++;

            recoveryHistory.push({
              field,
              provider: providerName,
              attempt,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    if (recoveredCount > 0) {
      console.log(`[Provider Router]: Recovered ${recoveredCount} missing fields in ${category} via ${providerName}.`);
    }
  }

  /**
   * Collects company profile data.
   * Primary: Yahoo. Fallback: Tavily Web Search + LLM.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @returns {Promise<Object>} Normalized profile, sources, and fallback logs.
   */
  async collectProfile(ticker, market) {
    const fallbackHistory = [];
    const startTime = Date.now();

    try {
      const data = await this.financialProvider.fetchProfile(ticker);
      return {
        profile: data,
        sources: {
          profile: {
            providerName: 'YahooFinance',
            fallbackLevel: 0,
            fetchedAt: new Date().toISOString()
          }
        },
        fallbackHistory
      };
    } catch (err) {
      console.warn(`[Provider Router]: Primary profile fetch failed for "${ticker}". ${err.message}`);
      fallbackHistory.push({
        category: 'profile',
        providerName: 'YahooFinance',
        error: err.message,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime
      });
    }

    // Fallback: Tavily + LLM Scraper
    const searchStartTime = Date.now();
    try {
      const query = `${ticker} company profile overview headquarters sector industry description`;
      const searchResults = await this.searchProvider.search(query, { maxResults: 2 });
      
      const prompt = `
You are acting as a corporate data scraper.
We need to construct a standard company profile for the ticker "${ticker}".
Here is raw web search data about the company:
${JSON.stringify(searchResults)}

Extract the following information and output STRICTLY a JSON object matching this schema:
{
  "ticker": "${ticker}",
  "name": "Full corporate name",
  "sector": "E.g. Technology or Financial Services",
  "industry": "Specific industry, e.g. Software—Infrastructure",
  "description": "2-3 sentence overview of what the company does",
  "marketCap": 120000000000,
  "country": "E.g. United States or India",
  "website": "E.g. https://www.apple.com"
}
Do not include any surrounding markdown block or conversational explanation.
`;

      const { data } = await this.llmRouter.generateJSON(prompt);
      
      return {
        profile: data,
        sources: {
          profile: {
            providerName: 'TavilySearch+LLM',
            fallbackLevel: 3,
            sourceUrl: searchResults[0]?.url || '',
            fetchedAt: new Date().toISOString()
          }
        },
        fallbackHistory
      };
    } catch (err) {
      fallbackHistory.push({
        category: 'profile',
        providerName: 'TavilySearch+LLM',
        error: err.message,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - searchStartTime
      });

      return {
        profile: null,
        sources: {},
        fallbackHistory
      };
    }
  }

  /**
   * Collects company financial statements.
   * Implements cascading field-level recovery:
   * Yahoo QuoteSummary -> Yahoo fundamentalsTimeSeries -> SEC EDGAR -> Tavily Search + LLM.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @param {Object} [options]
   * @param {number} [options.recollectionAttempt] - Increment loops counter
   * @returns {Promise<Object>} Normalized financials, sources metadata, fallback history, and recovery logs.
   */
  async collectFinancials(ticker, market, options = {}) {
    const fallbackHistory = [];
    const recoveryHistory = [];
    const attempt = options.recollectionAttempt || 1;
    let financials = null;
    const sources = {};
    const startTime = Date.now();

    // Step 1: Try Primary (Yahoo Finance QuoteSummary)
    try {
      financials = await this.financialProvider.fetchStatements(ticker);
      sources.financials = {
        providerName: 'YahooFinanceQuoteSummary',
        fallbackLevel: 0,
        fetchedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`[Provider Router]: Primary QuoteSummary financials fetch failed for "${ticker}". ${err.message}`);
      fallbackHistory.push({
        category: 'financials',
        providerName: 'YahooFinanceQuoteSummary',
        error: err.message,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime
      });
    }

    // Diagnostics: Validate what was fetched
    const checkIncome = () => evaluateIncomeStatement(financials?.annualIncomeStatement);
    const checkBalance = () => evaluateBalanceSheet(financials?.annualBalanceSheet);
    const checkCashFlow = () => evaluateCashFlow(financials?.annualCashFlow);

    const hasMissingFields = () => 
      checkIncome().missing.length > 0 || 
      checkBalance().missing.length > 0 || 
      checkCashFlow().missing.length > 0;

    // Helper to evaluate and run recovery loops
    const runRecoveryPass = async (providerName, fetchFunc) => {
      if (!financials) {
        // If primary failed completely, use fallback as base
        try {
          const fetchStart = Date.now();
          financials = await fetchFunc();
          sources.financials = {
            providerName,
            fallbackLevel: 1,
            fetchedAt: new Date().toISOString()
          };
          console.log(`[Provider Router]: Initial financials recovered completely via ${providerName}.`);
        } catch (e) {
          fallbackHistory.push({
            category: 'financials',
            providerName,
            error: e.message,
            timestamp: new Date().toISOString(),
            latencyMs: Date.now() - startTime
          });
        }
        return;
      }

      if (!hasMissingFields()) return;

      console.log(`[Provider Router]: Missing fields detected. Fetching recovery facts from ${providerName}`);
      try {
        const fallbackData = await fetchFunc();
        this._mergeMissingFields(financials, fallbackData, 'annualIncomeStatement', evaluateIncomeStatement, providerName, attempt, recoveryHistory);
        this._mergeMissingFields(financials, fallbackData, 'annualBalanceSheet', evaluateBalanceSheet, providerName, attempt, recoveryHistory);
        this._mergeMissingFields(financials, fallbackData, 'annualCashFlow', evaluateCashFlow, providerName, attempt, recoveryHistory);
      } catch (err) {
        console.warn(`[Provider Router]: Recovery pass using ${providerName} failed: ${err.message}`);
      }
    };

    // Step 2: Recovery Layer 1 (Yahoo fundamentalsTimeSeries)
    await runRecoveryPass('YahooTimeSeries', () => this.financialProvider.fetchTimeSeriesStatements(ticker));

    // Step 3: Recovery Layer 2 (SEC EDGAR - US equities only)
    if (market === 'US' && hasMissingFields()) {
      await runRecoveryPass('SecEdgar', () => this.secEdgarProvider.fetchStatements(ticker));
    }

    // Step 4: Recovery Layer 3 (Tavily Search + LLM Extraction)
    if (hasMissingFields()) {
      const searchStartTime = Date.now();
      const runLlmScrape = async () => {
        const query = `${ticker} annual balance sheet income statement cash flow revenue net income operating income capex fcf`;
        const searchResults = await this.searchProvider.search(query, { maxResults: 3 });

        const prompt = `
You are acting as a professional financial data extractor.
We need to compile the missing financial statement metrics for "${ticker}".
Here is raw web search data containing balance sheet and income statements:
${JSON.stringify(searchResults)}

Extract annual financial data snapshots.
Output STRICTLY a JSON object matching this schema:
{
  "annualIncomeStatement": [
    { "fiscalDate": "YYYY-MM-DD", "revenue": 100, "operatingIncome": 10, "netIncome": 8, "grossProfit": 25, "ebitda": 15 }
  ],
  "annualBalanceSheet": [
    { "fiscalDate": "YYYY-MM-DD", "totalAssets": 500, "totalLiabilities": 200, "totalEquity": 300, "cash": 50, "shortTermDebt": 10, "longTermDebt": 50 }
  ],
  "annualCashFlow": [
    { "fiscalDate": "YYYY-MM-DD", "operatingCashFlow": 15, "capitalExpenditures": -5, "freeCashFlow": 10 }
  ]
}
Return only JSON. Do not include surrounding explanations or markdown blocks.
`;
        const { data } = await this.llmRouter.generateJSON(prompt);
        return data;
      };

      await runRecoveryPass('TavilySearch+LLM', runLlmScrape);
    }

    return {
      financials,
      sources,
      fallbackHistory,
      recoveryHistory
    };
  }

  /**
   * Collects recent news articles.
   * Primary: Tavily News API. Fallback: Tavily Web Search.
   * 
   * @param {string} companyName - Full company name or ticker
   * @returns {Promise<Object>} Array of news articles, sources, and fallback logs.
   */
  async collectNews(companyName) {
    const fallbackHistory = [];
    const startTime = Date.now();

    try {
      const data = await this.newsProvider.fetchRecentNews(companyName);
      return {
        news: data,
        sources: {
          news: {
            providerName: 'TavilyNews',
            fallbackLevel: 0,
            fetchedAt: new Date().toISOString()
          }
        },
        fallbackHistory
      };
    } catch (err) {
      fallbackHistory.push({
        category: 'news',
        providerName: 'TavilyNews',
        error: err.message,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime
      });
    }

    // Fallback: Tavily General Web Search formatted to articles
    console.log(`[Provider Router]: Triggering fallback news search for "${companyName}"`);
    const searchStartTime = Date.now();
    try {
      const query = `${companyName} corporate recent news press releases events`;
      const searchResults = await this.searchProvider.search(query, { maxResults: 5 });

      const articles = searchResults.map(r => {
        let source = 'Web Resource';
        try {
          source = new URL(r.url).hostname.replace('www.', '').split('.')[0].toUpperCase();
        } catch (e) {
          // Fallback
        }

        return {
          title: r.title,
          url: r.url,
          source,
          publishedAt: new Date().toISOString().split('T')[0],
          summary: r.snippet,
          sentiment: 'unknown'
        };
      });

      return {
        news: articles,
        sources: {
          news: {
            providerName: 'TavilySearchFallback',
            fallbackLevel: 2,
            fetchedAt: new Date().toISOString()
          }
        },
        fallbackHistory
      };
    } catch (err) {
      fallbackHistory.push({
        category: 'news',
        providerName: 'TavilySearchFallback',
        error: err.message,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - searchStartTime
      });

      return {
        news: [],
        sources: {},
        fallbackHistory
      };
    }
  }

  /**
   * Fetches historical price quotes.
   * Primary: Yahoo Chart / Stooq provider.
   * 
   * @param {string} ticker 
   * @param {string} market 
   * @returns {Promise<Object[]>}
   */
  async collectPriceHistory(ticker, market) {
    try {
      return await this.stooqProvider.fetchPriceHistory(ticker, market);
    } catch (err) {
      console.error(`[Provider Router]: Historical price collection failed: ${err.message}`);
      return [];
    }
  }
}

module.exports = ProviderRouter;
