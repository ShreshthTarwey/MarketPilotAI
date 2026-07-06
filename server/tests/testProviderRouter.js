/**
 * testProviderRouter.js
 * Standalone verification script for the Provider Router.
 * Orchestrates calls across Profile, Financials, and News, displaying
 * colored traces, latency metrics, and evidence completeness.
 */

const ProviderRouter = require('../src/providers/providerRouter');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const router = new ProviderRouter();
const testCompany = process.argv[2] || 'Lenskart';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing ProviderRouter on input: "${testCompany}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

/**
 * Calculates a mock completeness percentage based on our Quality Gate rules
 * (since full gate logic is implemented in Phase 3).
 * 
 * @param {Object} data 
 * @returns {number} Score percentage (0-100).
 */
function calculateCompleteness(data) {
  let score = 0;
  const max = 100;

  if (data.profile) {
    if (data.profile.name) score += 10;
    if (data.profile.sector) score += 10;
    if (data.profile.industry) score += 10;
    if (data.profile.marketCap > 0) score += 10;
  }

  if (data.financials) {
    const annualIncome = data.financials.annualIncomeStatement || [];
    if (annualIncome.length > 0) {
      const latest = annualIncome[0];
      if (latest.revenue > 0) score += 15;
      if (latest.netIncome > 0) score += 15;
      if (latest.operatingIncome > 0) score += 10;
    }
    const annualBalance = data.financials.annualBalanceSheet || [];
    if (annualBalance.length > 0) {
      const latestBal = annualBalance[0];
      if (latestBal.totalAssets > 0) score += 10;
      if (latestBal.totalLiabilities > 0) score += 10;
    }
  }

  return score;
}

async function run() {
  const globalStart = Date.now();
  let resolvedInfo = null;

  // 1. Resolve Company
  try {
    console.log(`${colors.yellow}Resolving company name...${colors.reset}`);
    const resolveStart = Date.now();
    resolvedInfo = await router.resolveCompany(testCompany);
    const latency = Date.now() - resolveStart;

    if (resolvedInfo.success) {
      console.log(`${colors.green}✔ Resolved: ${resolvedInfo.name} (${resolvedInfo.ticker}) [Exchange: ${resolvedInfo.exchange}] [Latency: ${latency}ms]${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✘ Resolve Failed: ${resolvedInfo.warning} [Latency: ${latency}ms]${colors.reset}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${colors.red}Fatal Resolve Exception: ${err.message}${colors.reset}\n`);
    process.exit(1);
  }

  const ticker = resolvedInfo.ticker;
  const market = resolvedInfo.market;
  const gathered = { profile: null, financials: null, news: [] };
  const traces = { sources: {}, fallbacks: [] };

  // 2. Fetch Profile
  try {
    console.log(`${colors.yellow}Fetching company profile...${colors.reset}`);
    const profileStart = Date.now();
    const res = await router.collectProfile(ticker, market);
    const latency = Date.now() - profileStart;

    gathered.profile = res.profile;
    traces.sources = { ...traces.sources, ...res.sources };
    traces.fallbacks = [...traces.fallbacks, ...res.fallbackHistory];

    if (res.profile) {
      console.log(`${colors.green}✔ Profile fetched successfully via ${res.sources.profile?.providerName || 'Unknown'} [Latency: ${latency}ms]${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Profile missing/failed [Latency: ${latency}ms]${colors.reset}`);
    }
  } catch (err) {
    console.error(`${colors.red}Profile fetch error: ${err.message}${colors.reset}`);
  }
  console.log('');

  // 3. Fetch Financials
  try {
    console.log(`${colors.yellow}Fetching financials...${colors.reset}`);
    const finStart = Date.now();
    const res = await router.collectFinancials(ticker, market);
    const latency = Date.now() - finStart;

    gathered.financials = res.financials;
    traces.sources = { ...traces.sources, ...res.sources };
    traces.fallbacks = [...traces.fallbacks, ...res.fallbackHistory];

    if (res.financials) {
      console.log(`${colors.green}✔ Financials fetched successfully via ${res.sources.financials?.providerName || 'Unknown'} [Latency: ${latency}ms]${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Financials missing/failed [Latency: ${latency}ms]${colors.reset}`);
    }
  } catch (err) {
    console.error(`${colors.red}Financials fetch error: ${err.message}${colors.reset}`);
  }
  console.log('');

  // 4. Fetch News
  try {
    console.log(`${colors.yellow}Fetching news updates...${colors.reset}`);
    const newsStart = Date.now();
    const res = await router.collectNews(resolvedInfo.name);
    const latency = Date.now() - newsStart;

    gathered.news = res.news;
    traces.sources = { ...traces.sources, ...res.sources };
    traces.fallbacks = [...traces.fallbacks, ...res.fallbackHistory];

    if (res.news && res.news.length > 0) {
      console.log(`${colors.green}✔ News fetched successfully (${res.news.length} articles) via ${res.sources.news?.providerName || 'Unknown'} [Latency: ${latency}ms]${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ News missing/failed [Latency: ${latency}ms]${colors.reset}`);
    }
  } catch (err) {
    console.error(`${colors.red}News fetch error: ${err.message}${colors.reset}`);
  }
  console.log('\n');

  // 5. Evaluate and Print Complete Console Box Summary
  const completeness = calculateCompleteness(gathered);
  const totalLatency = Date.now() - globalStart;
  const warnings = [];

  if (gathered.financials) {
    const latestInc = gathered.financials.annualIncomeStatement?.[0] || {};
    if (latestInc.operatingIncome === 0) warnings.push("Operating Income unavailable");
    if (latestInc.grossProfit === 0) warnings.push("Gross Profit unavailable");
    if (latestInc.ebitda === 0) warnings.push("EBITDA unavailable");

    const latestBal = gathered.financials.annualBalanceSheet?.[0] || {};
    if (latestBal.totalAssets === 0) warnings.push("Balance Sheet assets unavailable");
  }

  console.log(`${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}Testing Ticker: ${ticker} (Market: ${market}) [Total Latency: ${totalLatency}ms]${colors.reset}`);
  console.log(`${colors.bold}==================================================${colors.reset}`);

  console.log(`\n${colors.bold}Profile:${colors.reset}`);
  console.log(`  Name: ${gathered.profile?.name || 'N/A'}`);
  console.log(`  Sector: ${gathered.profile?.sector || 'N/A'}`);
  console.log(`  Market Cap: $${(gathered.profile?.marketCap || 0).toLocaleString()}`);

  console.log(`\n${colors.bold}Financials (Latest Year):${colors.reset}`);
  if (gathered.financials && gathered.financials.annualIncomeStatement?.length > 0) {
    const inc = gathered.financials.annualIncomeStatement[0];
    console.log(`  Revenue: $${inc.revenue.toLocaleString()}`);
    console.log(`  Net Income: $${inc.netIncome.toLocaleString()}`);
  } else {
    console.log(`  N/A`);
  }

  console.log(`\n${colors.bold}Evidence Completeness: ${colors.green}${completeness}%${colors.reset}`);

  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
    warnings.forEach(w => console.log(`  * ${w}`));
  }

  console.log(`\n${colors.bold}Fallback Trace Logs:${colors.reset}`);
  if (traces.fallbacks.length > 0) {
    traces.fallbacks.forEach(f => {
      console.log(`  * Category [${f.category}] Provider [${f.providerName}] failed: ${f.error}`);
    });
  } else {
    console.log(`  * None (All primary endpoints resolved successfully)`);
  }

  console.log(`\nResult: ${completeness >= 80 ? `${colors.green}${colors.bold}PASS${colors.reset}` : `${colors.red}${colors.bold}FAIL (Threshold not met)${colors.reset}`}`);
  console.log(`${colors.bold}==================================================${colors.reset}\n`);
}

run();
