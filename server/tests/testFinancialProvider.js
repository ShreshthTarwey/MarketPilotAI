/**
 * testFinancialProvider.js
 * Standalone verification script for the Financial Providers.
 * Compares Yahoo QuoteSummary, SEC EDGAR XBRL mapping, and Stooq prices keylessly.
 */

const YahooFinanceProvider = require('../src/providers/implementations/yahooFinance');
const SecEdgarProvider = require('../src/providers/implementations/secEdgar');
const StooqProvider = require('../src/providers/implementations/stooq');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const yahoo = new YahooFinanceProvider();
const edgar = new SecEdgarProvider();
const stooq = new StooqProvider();

const testTicker = process.argv[2] || 'AAPL';
const testMarket = process.argv[3] || 'US';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing Multi-Structured Financial Providers: "${testTicker}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

async function run() {
  // Test 1: Yahoo Finance Provider
  console.log(`${colors.bold}1. Yahoo Finance Provider QuoteSummary...${colors.reset}`);
  try {
    const start = Date.now();
    const res = await yahoo.fetchStatements(testTicker);
    console.log(`${colors.green}✔ Yahoo Finance Success [Latency: ${Date.now() - start}ms]${colors.reset}`);
    console.log(`- Annual Income Statements: ${res.annualIncomeStatement?.length}`);
    if (res.annualIncomeStatement?.length > 0) {
      console.log('  Revenue (Latest):', res.annualIncomeStatement[0].revenue);
      console.log('  Net Income (Latest):', res.annualIncomeStatement[0].netIncome);
      console.log('  Operating Income (Latest):', res.annualIncomeStatement[0].operatingIncome);
    }
  } catch (err) {
    console.error(`${colors.red}Yahoo Finance Failed: ${err.message}${colors.reset}`);
  }
  console.log('');

  // Test 1.1: Yahoo Finance Provider fundamentalsTimeSeries fallback
  console.log(`${colors.bold}1.1 Yahoo Finance Provider fundamentalsTimeSeries...${colors.reset}`);
  try {
    const start = Date.now();
    const res = await yahoo.fetchTimeSeriesStatements(testTicker);
    console.log(`${colors.green}✔ Yahoo fundamentalsTimeSeries Success [Latency: ${Date.now() - start}ms]${colors.reset}`);
    console.log(`- Annual Income Statements: ${res.annualIncomeStatement?.length}`);
    if (res.annualIncomeStatement?.length > 0) {
      console.log('  Revenue (Latest):', res.annualIncomeStatement[0].revenue);
      console.log('  Net Income (Latest):', res.annualIncomeStatement[0].netIncome);
      console.log('  Operating Income (Latest):', res.annualIncomeStatement[0].operatingIncome);
      console.log('  Gross Profit (Latest):', res.annualIncomeStatement[0].grossProfit);
      console.log('  EBITDA (Latest):', res.annualIncomeStatement[0].ebitda);
    }
  } catch (err) {
    console.error(`${colors.red}Yahoo fundamentalsTimeSeries Failed: ${err.message}${colors.reset}`);
  }
  console.log('');

  // Test 2: SEC EDGAR Provider (US Equities Only)
  if (testMarket === 'US') {
    console.log(`${colors.bold}2. SEC EDGAR US government filing parser...${colors.reset}`);
    try {
      const start = Date.now();
      const res = await edgar.fetchStatements(testTicker);
      console.log(`${colors.green}✔ SEC EDGAR Success [Latency: ${Date.now() - start}ms]${colors.reset}`);
      console.log(`- Annual Income Statements: ${res.annualIncomeStatement?.length}`);
      if (res.annualIncomeStatement?.length > 0) {
        console.log('  Revenue (Latest):', res.annualIncomeStatement[0].revenue);
        console.log('  Net Income (Latest):', res.annualIncomeStatement[0].netIncome);
        console.log('  Operating Income (Latest):', res.annualIncomeStatement[0].operatingIncome);
        console.log('  Total Assets (Latest):', res.annualBalanceSheet[0].totalAssets);
        console.log('  Total Liabilities (Latest):', res.annualBalanceSheet[0].totalLiabilities);
        console.log('  Free Cash Flow (Latest):', res.annualCashFlow[0].freeCashFlow);
      }
    } catch (err) {
      console.error(`${colors.red}SEC EDGAR Failed: ${err.message}${colors.reset}`);
    }
    console.log('');
  }

  // Test 3: Stooq Provider (Price History)
  console.log(`${colors.bold}3. Stooq CSV Price history Downloader...${colors.reset}`);
  try {
    const start = Date.now();
    const res = await stooq.fetchPriceHistory(testTicker, testMarket);
    console.log(`${colors.green}✔ Stooq Success [Latency: ${Date.now() - start}ms]${colors.reset}`);
    console.log(`- Historical Quotes count: ${res.length}`);
    if (res.length > 0) {
      console.log('  Latest close price:', res[0].close, 'on date:', res[0].date);
      console.log('  Previous close price:', res[1]?.close, 'on date:', res[1]?.date);
    }
  } catch (err) {
    console.error(`${colors.red}Stooq Failed: ${err.message}${colors.reset}`);
  }
  console.log('\n');

  console.log(`${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}Multi-Provider Testing Complete.${colors.reset}`);
  console.log(`${colors.bold}==================================================${colors.reset}`);
}

run();
