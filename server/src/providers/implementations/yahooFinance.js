/**
 * yahooFinance.js
 * Concrete Financial Data Provider implementing Yahoo Finance.
 * Extends IFinancialDataProvider and conforms to unified schemas.
 * Includes both quoteSummary and fundamentalsTimeSeries modules.
 * Implements in-flight request de-duplication to prevent cache stampedes.
 */

const IFinancialDataProvider = require('../interfaces/financialProvider');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const cache = require('../cache/memoryCache');

class YahooFinanceProvider extends IFinancialDataProvider {
  constructor() {
    super();
    this.cachePrefix = 'yahoo-financials';
    // In-flight promise registry to de-duplicate concurrent fetches (cache stampede prevention)
    this.inFlightBundles = new Map();
  }

  /**
   * Helper to safely extract raw numerical values from Yahoo's value/format objects.
   * Yahoo API values frequently return in shape: { raw: 100000, fmt: "100k" }
   * 
   * @param {Object|number} obj 
   * @returns {number} The raw number, or 0.
   */
  _val(obj) {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'number') return obj;
    return obj.raw !== undefined ? obj.raw : 0;
  }

  /**
   * Normalizes dates returned by Yahoo (can be Date objects or timestamps).
   * 
   * @param {*} dateObj 
   * @returns {string} ISO Date string formatted YYYY-MM-DD.
   */
  _formatDate(dateObj) {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }

  /**
   * Internal helper to retrieve the full quoteSummary bundle from Yahoo Finance.
   * Resolves concurrent cache stampede drops by returning a single shared promise.
   * 
   * @param {string} ticker 
   * @returns {Promise<Object>} Raw summary bundle.
   */
  async _getSummaryBundle(ticker) {
    const symbol = ticker.trim().toUpperCase();
    const cacheKey = cache.generateKey(this.cachePrefix, symbol);
    
    // 1. Check completed memory cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Check if a duplicate request for this ticker is already in-flight
    if (this.inFlightBundles.has(symbol)) {
      console.log(`[Yahoo Finance]: Reusing concurrent in-flight promise for "${symbol}"`);
      return this.inFlightBundles.get(symbol);
    }

    const modules = [
      'assetProfile',
      'price',
      'summaryDetail',
      'defaultKeyStatistics',
      'incomeStatementHistory',
      'balanceSheetHistory',
      'cashflowStatementHistory',
      'incomeStatementHistoryQuarterly',
      'balanceSheetHistoryQuarterly',
      'cashflowStatementHistoryQuarterly'
    ];

    console.log(`[Yahoo Finance]: Fetching QuoteSummary modules for "${symbol}"`);
    const options = { validateResult: false };
    
    // Instantiate fetching promise
    const fetchPromise = yahooFinance.quoteSummary(symbol, { modules }, options)
      .then(summary => {
        // Cache success payload and clear promise registry entry
        cache.set(cacheKey, summary);
        this.inFlightBundles.delete(symbol);
        return summary;
      })
      .catch(err => {
        // Clear promise entry to allow retry triggers later
        this.inFlightBundles.delete(symbol);
        throw err;
      });

    this.inFlightBundles.set(symbol, fetchPromise);
    return fetchPromise;
  }

  /**
   * Fetches basic company profile data.
   * 
   * @param {string} ticker 
   * @returns {Promise<import('../interfaces/financialProvider').CompanyProfile>}
   */
  async fetchProfile(ticker) {
    const summary = await this._getSummaryBundle(ticker);
    const profile = summary.assetProfile || {};
    const price = summary.price || {};
    const detail = summary.summaryDetail || {};
    const stats = summary.defaultKeyStatistics || {};

    const ceoOfficer = (profile.companyOfficers || []).find(o => 
      o.title && (o.title.toLowerCase().includes('ceo') || o.title.toLowerCase().includes('chief executive officer'))
    );
    const ceo = ceoOfficer ? ceoOfficer.name : (profile.companyOfficers?.[0]?.name || null);

    return {
      ticker: ticker.trim().toUpperCase(),
      name: price.longName || price.shortName || ticker,
      sector: profile.sector || 'Unknown Sector',
      industry: profile.industry || 'Unknown Industry',
      description: profile.longBusinessSummary || 'No description available.',
      marketCap: this._val(detail.marketCap || price.marketCap),
      currentPrice: this._val(price.regularMarketPrice || detail.previousClose),
      beta: this._val(detail.beta || stats.beta),
      country: profile.country || 'Unknown Country',
      website: profile.website || 'No website available.',
      currency: price.currency || detail.currency || null,
      
      // New snapshots:
      employees: profile.fullTimeEmployees || null,
      ceo: ceo,
      exchange: price.exchangeName || null,
      headquarters: profile.city ? `${profile.city}${profile.state ? ', ' + profile.state : ''}${profile.country ? ', ' + profile.country : ''}` : null,
      peRatio: this._val(detail.trailingPE || detail.forwardPE) || null,
      eps: this._val(detail.trailingEps || stats.trailingEps || stats.earningsShare) || null,
      founded: profile.founded || null
    };
  }

  /**
   * Fetches core financial statement snapshots (annual + quarterly) using the standard quoteSummary.
   * 
   * @param {string} ticker 
   * @returns {Promise<import('../interfaces/financialProvider').FinancialStatements>}
   */
  async fetchStatements(ticker) {
    const summary = await this._getSummaryBundle(ticker);

    // Map helper for annual/quarterly statements
    const mapIncome = (stmt) => ({
      fiscalDate: this._formatDate(stmt.endDate),
      revenue: this._val(stmt.totalRevenue),
      operatingIncome: this._val(stmt.operatingIncome),
      netIncome: this._val(stmt.netIncome),
      grossProfit: this._val(stmt.grossProfit),
      ebitda: this._val(stmt.ebitda || stmt.operatingIncome) // Fallback to operating income if ebitda is empty
    });

    const mapBalance = (stmt) => ({
      fiscalDate: this._formatDate(stmt.endDate),
      totalAssets: this._val(stmt.totalAssets),
      totalLiabilities: this._val(stmt.totalLiab),
      totalEquity: this._val(stmt.totalStockholderEquity),
      cash: this._val(stmt.cash || stmt.cashAndCashEquivalents),
      shortTermDebt: this._val(stmt.shortLongTermDebt),
      longTermDebt: this._val(stmt.longTermDebt)
    });

    const mapCashFlow = (stmt) => {
      const operatingCashFlow = this._val(stmt.totalCashFromOperatingActivities);
      const capEx = this._val(stmt.capitalExpenditures);
      const freeCashFlow = operatingCashFlow + capEx; 
      
      return {
        fiscalDate: this._formatDate(stmt.endDate),
        operatingCashFlow,
        capitalExpenditures: capEx,
        freeCashFlow
      };
    };

    const annualIncome = (summary.incomeStatementHistory?.incomeStatementHistory || []).map(mapIncome);
    const annualBalance = (summary.balanceSheetHistory?.balanceSheetStatements || []).map(mapBalance);
    const annualCash = (summary.cashflowStatementHistory?.cashflowStatements || []).map(mapCashFlow);

    const quarterlyIncome = (summary.incomeStatementHistoryQuarterly?.incomeStatementHistory || []).map(mapIncome);
    const quarterlyBalance = (summary.balanceSheetHistoryQuarterly?.balanceSheetStatements || []).map(mapBalance);
    const quarterlyCash = (summary.cashflowStatementHistoryQuarterly?.cashflowStatements || []).map(mapCashFlow);

    return {
      annualIncomeStatement: annualIncome,
      annualBalanceSheet: annualBalance,
      annualCashFlow: annualCash,
      quarterlyIncomeStatement: quarterlyIncome,
      quarterlyBalanceSheet: quarterlyBalance,
      quarterlyCashFlow: quarterlyCash
    };
  }

  /**
   * Refined Fallback Method. Fetches historical statements using fundamentalsTimeSeries
   * to bypass Yahoo's QuoteSummary deprecations for Gross Profit, EBITDA, Operating Income, and Assets.
   * 
   * @param {string} ticker 
   * @returns {Promise<import('../interfaces/financialProvider').FinancialStatements>}
   */
  async fetchTimeSeriesStatements(ticker) {
    const symbol = ticker.trim().toUpperCase();
    const cacheKey = cache.generateKey(`${this.cachePrefix}:timeseries`, symbol);
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[Yahoo Finance]: Fetching fundamentalsTimeSeries for "${symbol}"`);

    try {
      const oneYearAgo = new Date();
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
      const period1 = fourYearsAgo.toISOString().split('T')[0];
      const period2 = new Date().toISOString().split('T')[0];

      const res = await yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        period2,
        type: 'annual',
        module: 'all'
      });

      if (!res || res.length === 0) {
        throw new Error(`fundamentalsTimeSeries returned empty payload for "${symbol}"`);
      }

      // Map helper for statement rows
      const mapIncome = (stmt) => ({
        fiscalDate: this._formatDate(stmt.date),
        revenue: stmt.totalRevenue || 0,
        operatingIncome: stmt.operatingIncome || 0,
        netIncome: stmt.netIncome || 0,
        grossProfit: stmt.grossProfit || 0,
        ebitda: stmt.EBITDA || stmt.normalizedEBITDA || stmt.operatingIncome || 0
      });

      const mapBalance = (stmt) => ({
        fiscalDate: this._formatDate(stmt.date),
        totalAssets: stmt.totalAssets || 0,
        totalLiabilities: stmt.totalLiabilitiesNetMinorityInterest || stmt.totalLiabilities || 0,
        totalEquity: stmt.stockholdersEquity || stmt.totalEquityGrossMinorityInterest || 0,
        cash: stmt.cashAndCashEquivalents || stmt.cashCashEquivalentsAndShortTermInvestments || 0,
        shortTermDebt: stmt.currentDebt || 0,
        longTermDebt: stmt.longTermDebt || 0
      });

      const mapCashFlow = (stmt) => ({
        fiscalDate: this._formatDate(stmt.date),
        operatingCashFlow: stmt.operatingCashFlow || 0,
        capitalExpenditures: stmt.capitalExpenditure || 0,
        freeCashFlow: stmt.freeCashFlow || 0
      });

      // Filter and sort items (latest years first)
      const sortedRes = [...res].sort((a, b) => new Date(b.date) - new Date(a.date));

      const annualIncomeStatement = sortedRes.map(mapIncome);
      const annualBalanceSheet = sortedRes.map(mapBalance);
      const annualCashFlow = sortedRes.map(mapCashFlow);

      const statements = {
        annualIncomeStatement,
        annualBalanceSheet,
        annualCashFlow,
        quarterlyIncomeStatement: [],
        quarterlyBalanceSheet: [],
        quarterlyCashFlow: []
      };

      cache.set(cacheKey, statements);
      return statements;
    } catch (err) {
      console.warn(`[Yahoo Finance]: fundamentalsTimeSeries failed for "${symbol}": ${err.message}`);
      throw err;
    }
  }
}

module.exports = YahooFinanceProvider;
