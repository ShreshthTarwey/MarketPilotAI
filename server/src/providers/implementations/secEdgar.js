/**
 * secEdgar.js
 * Concrete Financial Provider wrapping the SEC EDGAR API.
 * Provides keyless, high-reliability financial statement data for US public corporations.
 */

const IFinancialDataProvider = require('../interfaces/financialProvider');
const cache = require('../cache/memoryCache');

class SecEdgarProvider extends IFinancialDataProvider {
  constructor() {
    super();
    this.cachePrefix = 'sec-edgar';
    // SEC EDGAR strictly mandates declaring a descriptive User-Agent header
    this.headers = {
      'User-Agent': 'MarketPilot AI Research (research-dev@marketpilot.com)'
    };
  }

  /**
   * Helper to retrieve CIK string from ticker symbol using SEC public mappings.
   * 
   * @param {string} ticker - E.g. "AAPL"
   * @returns {Promise<string|null>} 10-digit zero-padded CIK string, or null.
   */
  async _resolveCik(ticker) {
    const symbol = ticker.trim().toUpperCase();
    const cacheKey = cache.generateKey('sec-cik', symbol);
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[SEC EDGAR]: Resolving CIK mapping for "${symbol}"`);
    try {
      const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`SEC Mapping HTTP ${response.status}`);
      }

      const mappings = await response.json();
      const match = Object.values(mappings).find(
        item => item.ticker.toUpperCase() === symbol
      );

      if (!match) {
        console.warn(`[SEC EDGAR]: No CIK mapping found for "${symbol}"`);
        return null;
      }

      const paddedCik = String(match.cik_str).padStart(10, '0');
      cache.set(cacheKey, paddedCik);
      return paddedCik;
    } catch (err) {
      console.warn(`[SEC EDGAR]: Failed to resolve CIK for "${symbol}": ${err.message}`);
      return null;
    }
  }

  /**
   * Safe helper to extract annual values from US-GAAP taxonomy concept arrays.
   * Filters for 10-K filings representing full fiscal years (FY).
   * 
   * @param {Object} facts - Raw US-GAAP facts object
   * @param {string[]} concepts - Array of concept names in priority order
   * @param {number} year - Target fiscal year
   * @returns {number} The matched value, or 0.
   */
  _extractFactValue(facts, concepts, year) {
    for (const concept of concepts) {
      const conceptData = facts[concept];
      if (!conceptData || !conceptData.units || !conceptData.units.USD) continue;
      
      const entries = conceptData.units.USD;
      // Search for annual 10-K entries matching our fiscal year
      const match = entries.find(
        e => e.form === '10-K' && e.fy === year && e.fp === 'FY'
      );
      
      if (match && match.val !== undefined) {
        return match.val;
      }
    }
    return 0;
  }

  /**
   * Fetches basic company metadata from SEC EDGAR.
   * Implements IFinancialDataProvider contract.
   * 
   * @param {string} ticker 
   * @returns {Promise<import('../interfaces/financialProvider').CompanyProfile>}
   */
  async fetchProfile(ticker) {
    const symbol = ticker.trim().toUpperCase();
    const cik = await this._resolveCik(symbol);
    if (!cik) {
      throw new Error(`SEC EDGAR profile fetch unsupported for non-US ticker "${symbol}".`);
    }

    const cacheKey = cache.generateKey(`${this.cachePrefix}:profile`, cik);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[SEC EDGAR]: Loading company profile for CIK ${cik}`);
    try {
      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`SEC Facts HTTP ${response.status}`);
      }

      const data = await response.json();
      const profile = {
        ticker: symbol,
        name: data.entityName || symbol,
        sector: 'US Equity', // SEC EDGAR fact sheets don't store sector/industry descriptions directly
        industry: 'SEC Registered',
        description: `SEC Corporate disclosures for CIK ${cik} (${data.entityName || symbol}).`,
        marketCap: 0, // Market cap is not in standard historical accounting statements
        country: 'United States',
        website: 'https://www.sec.gov',
        currency: 'USD',
        
        // Snapshots fallbacks:
        employees: null,
        ceo: null,
        exchange: 'SEC / US Exchanges',
        headquarters: 'United States',
        peRatio: null,
        eps: null,
        founded: null
      };

      cache.set(cacheKey, profile);
      return profile;
    } catch (err) {
      console.error(`[SEC EDGAR]: Profile fetch failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Fetches core financial statement snapshots (annual).
   * Implements IFinancialDataProvider contract.
   * 
   * @param {string} ticker 
   * @returns {Promise<import('../interfaces/financialProvider').FinancialStatements>}
   */
  async fetchStatements(ticker) {
    const symbol = ticker.trim().toUpperCase();
    const cik = await this._resolveCik(symbol);
    if (!cik) {
      throw new Error(`SEC EDGAR financials fetch unsupported for non-US ticker "${symbol}".`);
    }

    const cacheKey = cache.generateKey(`${this.cachePrefix}:statements`, cik);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    console.log(`[SEC EDGAR]: Loading financial facts for CIK ${cik}`);
    try {
      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`SEC Facts HTTP ${response.status}`);
      }

      const data = await response.json();
      const facts = data.facts?.['us-gaap'];

      if (!facts) {
        throw new Error(`US-GAAP facts not found in CIK ${cik} payload.`);
      }

      // 1. Identify which fiscal years exist in the Net Income taxonomy
      // E.g., we query us-gaap.NetIncomeLoss
      const netIncomeEntries = facts['NetIncomeLoss']?.units?.USD || [];
      const annualYears = [
        ...new Set(
          netIncomeEntries
            .filter(e => e.form === '10-K' && e.fp === 'FY')
            .map(e => e.fy)
        )
      ]
        .sort((a, b) => b - a) // Latest years first
        .slice(0, 3); // Get last 3 years

      console.log(`[SEC EDGAR]: Found annual years for facts:`, annualYears);

      // Taxonomies priority mappings (to resolve differences in accounting sheets)
      const REVENUE_CONCEPTS = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax'];
      const NET_INCOME_CONCEPTS = ['NetIncomeLoss'];
      const OPERATING_INCOME_CONCEPTS = ['OperatingIncomeLoss', 'OperatingIncomeLossFromContinuingOperations'];
      const GROSS_PROFIT_CONCEPTS = ['GrossProfit', 'RevenueFromContractWithCustomerExcludingAssessedTax'];
      const EBITDA_CONCEPTS = ['OperatingIncomeLoss']; // If EBITDA is missing, we use Operating Income as proxy
      
      const TOTAL_ASSETS_CONCEPTS = ['Assets'];
      const TOTAL_LIAB_CONCEPTS = ['Liabilities'];
      const TOTAL_EQUITY_CONCEPTS = ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'];
      const CASH_CONCEPTS = ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndMarketableSecuritiesAtCarryingValue'];
      const SHORT_DEBT_CONCEPTS = ['ShortTermBorrowings', 'CommercialPaper'];
      const LONG_DEBT_CONCEPTS = ['LongTermDebtNoncurrent', 'LongTermDebt'];

      const OCF_CONCEPTS = ['NetCashProvidedByUsedInOperatingActivities'];
      const CAPEX_CONCEPTS = ['PaymentsToAcquirePropertyPlantAndEquipment'];

      const annualIncomeStatement = [];
      const annualBalanceSheet = [];
      const annualCashFlow = [];

      for (const year of annualYears) {
        // Build mock dates based on fiscal year end if date not parsed
        const dateStr = `${year}-12-31`;

        // A. Income Statement
        const revenue = this._extractFactValue(facts, REVENUE_CONCEPTS, year);
        const netIncome = this._extractFactValue(facts, NET_INCOME_CONCEPTS, year);
        const operatingIncome = this._extractFactValue(facts, OPERATING_INCOME_CONCEPTS, year);
        const grossProfit = this._extractFactValue(facts, GROSS_PROFIT_CONCEPTS, year);
        const ebitda = this._extractFactValue(facts, EBITDA_CONCEPTS, year);

        annualIncomeStatement.push({
          fiscalDate: dateStr,
          revenue,
          operatingIncome,
          netIncome,
          grossProfit,
          ebitda
        });

        // B. Balance Sheet
        const totalAssets = this._extractFactValue(facts, TOTAL_ASSETS_CONCEPTS, year);
        const totalLiabilities = this._extractFactValue(facts, TOTAL_LIAB_CONCEPTS, year);
        const totalEquity = this._extractFactValue(facts, TOTAL_EQUITY_CONCEPTS, year);
        const cash = this._extractFactValue(facts, CASH_CONCEPTS, year);
        const shortTermDebt = this._extractFactValue(facts, SHORT_DEBT_CONCEPTS, year);
        const longTermDebt = this._extractFactValue(facts, LONG_DEBT_CONCEPTS, year);

        annualBalanceSheet.push({
          fiscalDate: dateStr,
          totalAssets,
          totalLiabilities,
          totalEquity,
          cash,
          shortTermDebt,
          longTermDebt
        });

        // C. Cash Flow
        const operatingCashFlow = this._extractFactValue(facts, OCF_CONCEPTS, year);
        const capitalExpenditures = -Math.abs(this._extractFactValue(facts, CAPEX_CONCEPTS, year)); // Ensure outflow is negative
        const freeCashFlow = operatingCashFlow + capitalExpenditures;

        annualCashFlow.push({
          fiscalDate: dateStr,
          operatingCashFlow,
          capitalExpenditures,
          freeCashFlow
        });
      }

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
      console.error(`[SEC EDGAR]: Financials fetch failed: ${err.message}`);
      throw err;
    }
  }
}

module.exports = SecEdgarProvider;
