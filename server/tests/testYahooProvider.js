/**
 * testYahooProvider.js
 * Standalone verification script for the Yahoo Finance Provider.
 * Tests quote summary profiling and statements fetching keylessly.
 */

const YahooFinanceProvider = require('../src/providers/implementations/yahooFinance');

// ANSI Color helper codes for console logging
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const provider = new YahooFinanceProvider();
const testTicker = process.argv[2] || 'AAPL';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing: YahooFinanceProvider on Ticker "${testTicker}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

async function run() {
  let profileStart = Date.now();
  let statementsStart = Date.now();
  
  // 1. Test Profile Fetch
  try {
    console.log(`${colors.yellow}Fetching Company Profile...${colors.reset}`);
    profileStart = Date.now();
    const profile = await provider.fetchProfile(testTicker);
    const latency = Date.now() - profileStart;
    
    console.log(`${colors.green}✔ Profile Fetched Successfully [Latency: ${latency}ms]${colors.reset}`);
    console.log(JSON.stringify(profile, null, 2));
    console.log('');
  } catch (err) {
    console.error(`${colors.red}✘ Profile Fetch Failed: ${err.message}${colors.reset}\n`);
  }

  // 2. Test Statements Fetch
  try {
    console.log(`${colors.yellow}Fetching Financial Statements...${colors.reset}`);
    statementsStart = Date.now();
    const statements = await provider.fetchStatements(testTicker);
    const latency = Date.now() - statementsStart;
    
    console.log(`${colors.green}✔ Statements Fetched Successfully [Latency: ${latency}ms]${colors.reset}`);
    
    console.log(`Income Statements (Annual) Count: ${statements.annualIncomeStatement?.length}`);
    if (statements.annualIncomeStatement?.length > 0) {
      console.log('Latest Income Statement Summary:', statements.annualIncomeStatement[0]);
    }
    
    console.log(`Balance Sheet Snapshots (Annual) Count: ${statements.annualBalanceSheet?.length}`);
    if (statements.annualBalanceSheet?.length > 0) {
      console.log('Latest Balance Sheet Summary:', statements.annualBalanceSheet[0]);
    }
    
    console.log(`Cash Flow Statements (Annual) Count: ${statements.annualCashFlow?.length}`);
    if (statements.annualCashFlow?.length > 0) {
      console.log('Latest Cash Flow Summary:', statements.annualCashFlow[0]);
    }
    
    console.log('');
  } catch (err) {
    console.error(`${colors.red}✘ Statements Fetch Failed: ${err.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}Testing Complete for YahooFinanceProvider.${colors.reset}`);
  console.log(`${colors.bold}==================================================${colors.reset}`);
}

run();
