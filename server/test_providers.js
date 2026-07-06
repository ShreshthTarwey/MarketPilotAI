/**
 * test_providers.js
 * Comprehensive integration verification script for Phase 1 & 2.
 * Tests keyless APIs immediately, and key-based APIs if credentials are provided in .env.
 */

const path = require('path');
const config = require('./src/config/env');
const ProviderRouter = require('./src/providers/providerRouter');
const LLMRouter = require('./src/providers/llmRouter');

// Validate key presence for test reporting
const hasKeys = !!config.geminiApiKey || (config.groqApiKeys && config.groqApiKeys.length > 0);

console.log('==================================================');
console.log('  MarketPilot AI — Provider Integration Testing   ');
console.log('==================================================');
console.log(`Port: ${config.port}`);
console.log(`Gemini Key Configured: ${!!config.geminiApiKey}`);
console.log(`Groq Key Pool Count: ${config.groqApiKeys.length}`);
console.log(`Tavily Key Configured: ${!!config.tavilyApiKey}`);
console.log(`Is API Testing Available: ${hasKeys && !!config.tavilyApiKey ? 'YES' : 'NO (Yahoo only)'}`);
console.log('==================================================\n');

const router = new ProviderRouter();

async function runTests() {
  // Test 1: Keyless Company Resolution (Autocomplete check)
  console.log('--- Test 1: Keyless Company Resolution ("Apple") ---');
  try {
    const res = await router.resolveCompany('Apple');
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Test 1 Failed:', err.message);
  }
  console.log('\n');

  // Test 2: Keyless Company Resolution ("Reliance")
  console.log('--- Test 2: Keyless Company Resolution ("Reliance") ---');
  try {
    const res = await router.resolveCompany('Reliance');
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Test 2 Failed:', err.message);
  }
  console.log('\n');

  // Test 3: Keyless Financial Profile fetch ("AAPL")
  console.log('--- Test 3: Keyless Financial Profile fetch ("AAPL") ---');
  try {
    const profileRes = await router.collectProfile('AAPL', 'US');
    console.log('Profile Data (Summary):', {
      name: profileRes.profile?.name,
      sector: profileRes.profile?.sector,
      industry: profileRes.profile?.industry,
      marketCap: profileRes.profile?.marketCap
    });
    console.log('Sources Trace:', JSON.stringify(profileRes.sources, null, 2));
  } catch (err) {
    console.error('Test 3 Failed:', err.message);
  }
  console.log('\n');

  // Test 4: Keyless Financial Statements fetch ("AAPL")
  console.log('--- Test 4: Keyless Financial Statements fetch ("AAPL") ---');
  try {
    const finRes = await router.collectFinancials('AAPL', 'US');
    console.log('Income Statements count:', finRes.financials?.annualIncomeStatement?.length);
    console.log('Latest Annual Income statement summary:', finRes.financials?.annualIncomeStatement?.[0]);
    console.log('Sources Trace:', JSON.stringify(finRes.sources, null, 2));
  } catch (err) {
    console.error('Test 4 Failed:', err.message);
  }
  console.log('\n');

  // Skip key-based tests if no keys are found
  if (!hasKeys || !config.tavilyApiKey) {
    console.log('==================================================');
    console.log('[Notice]: Skipping API-key dependent tests (Tavily/LLM).');
    console.log('To run full test: create a .env file in project root with:');
    console.log('GEMINI_API_KEY=...');
    console.log('TAVILY_API_KEY=...');
    console.log('GROQ_API_KEY_1=...');
    console.log('==================================================');
    process.exit(0);
  }

  // Test 5: Key-based LLM Auto-correction lookup ("Aple" typo)
  console.log('--- Test 5: Key-based Ticker Auto-correction ("Aple" typo) ---');
  try {
    const resolveTypo = await router.resolveCompany('Aple');
    console.log('Auto-corrected Result:', JSON.stringify(resolveTypo, null, 2));
  } catch (err) {
    console.error('Test 5 Failed:', err.message);
  }
  console.log('\n');

  // Test 6: Tavily News Retrieval ("Reliance")
  console.log('--- Test 6: Tavily News Retrieval ("Reliance") ---');
  try {
    const newsRes = await router.collectNews('Reliance');
    console.log('News Articles retrieved count:', newsRes.news?.length);
    console.log('Latest article summary:', newsRes.news?.[0]);
    console.log('Sources Trace:', JSON.stringify(newsRes.sources, null, 2));
  } catch (err) {
    console.error('Test 6 Failed:', err.message);
  }
  console.log('\n');

  // Test 7: Fallback Scraper (Fetch financials using search for missing tickers)
  console.log('--- Test 7: Fallback Financial Scraper ("TCS.NS" Mock Fallback via Search) ---');
  try {
    // We intentionally query a mock ticker "MOCK_FAIL_TICKER" on the financials method,
    // which triggers the Tavily search fallback + LLM extraction since Yahoo summary will reject it.
    console.log('Sending mock query to trigger fallback search...');
    const fallbackRes = await router.collectFinancials('MOCK_FAIL_TICKER', 'US');
    console.log('Fallback Financials (Summary):', {
      annualIncomeStatementCount: fallbackRes.financials?.annualIncomeStatement?.length,
      annualBalanceSheetCount: fallbackRes.financials?.annualBalanceSheet?.length,
      latestRevenue: fallbackRes.financials?.annualIncomeStatement?.[0]?.revenue
    });
    console.log('Fallback Sources:', JSON.stringify(fallbackRes.sources, null, 2));
    console.log('Fallback Logs History:', JSON.stringify(fallbackRes.fallbackHistory, null, 2));
  } catch (err) {
    console.error('Test 7 Failed:', err.message);
  }
  console.log('\n');

  console.log('==================================================');
  console.log('  Testing complete. Review logs above.           ');
  console.log('==================================================');
}

runTests();
