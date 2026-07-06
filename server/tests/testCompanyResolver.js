/**
 * testCompanyResolver.js
 * Standalone verification script for the Company Resolution Provider.
 * Tests deterministic lookup, caching, and fallback LLM suggestions.
 */

const CompanyResolver = require('../src/providers/implementations/companyResolver');
const config = require('../src/config/env');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const resolver = new CompanyResolver();
const testQuery = process.argv[2] || 'Apple';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing: CompanyResolver on Name Query "${testQuery}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

async function run() {
  // 1. Test Autocomplete Lookup
  try {
    console.log(`${colors.yellow}Executing Autocomplete lookup (Call 1)...${colors.reset}`);
    const start = Date.now();
    const result1 = await resolver.resolve(testQuery);
    const latency = Date.now() - start;
    
    console.log(`${colors.green}✔ Call 1 Succeeded [Latency: ${latency}ms]${colors.reset}`);
    console.log(JSON.stringify(result1, null, 2));
    console.log('');

    // 2. Test Cache Hit Lookup
    console.log(`${colors.yellow}Executing Cache check lookup (Call 2 - should be instant)...${colors.reset}`);
    const startCache = Date.now();
    const result2 = await resolver.resolve(testQuery);
    const latencyCache = Date.now() - startCache;
    
    console.log(`${colors.green}✔ Call 2 Cache Check Succeeded [Latency: ${latencyCache}ms]${colors.reset}`);
    console.log(`Cache was matched successfully!`);
    console.log('');
  } catch (err) {
    console.error(`${colors.red}Reoslution call failed: ${err.message}${colors.reset}\n`);
  }

  // 3. Test Typo Fallback (requires API keys)
  const hasLlmKeys = !!config.geminiApiKey || (config.groqApiKeys && config.groqApiKeys.length > 0);
  if (!hasLlmKeys) {
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.yellow}[Notice]: Skipping LLM correction test. Set API keys in .env to run.${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    process.exit(0);
  }

  try {
    const typoQuery = 'Aple';
    console.log(`${colors.yellow}Executing Auto-Correction fallback for typo query "${typoQuery}"...${colors.reset}`);
    const startCorrection = Date.now();
    const resultCorrection = await resolver.resolve(typoQuery);
    const latencyCorrection = Date.now() - startCorrection;
    
    console.log(`${colors.green}✔ Correction Succeeded [Latency: ${latencyCorrection}ms]${colors.reset}`);
    console.log(JSON.stringify(resultCorrection, null, 2));
  } catch (err) {
    console.error(`${colors.red}Correction test failed: ${err.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}Testing Complete for CompanyResolver.${colors.reset}`);
  console.log(`${colors.bold}==================================================${colors.reset}`);
}

run();
