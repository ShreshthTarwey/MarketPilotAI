/**
 * testTavilyProvider.js
 * Standalone verification script for the Tavily Search & News Provider.
 * Tests general web search scraping and dedicated news fetches.
 */

const TavilySearchProvider = require('../src/providers/implementations/tavilySearch');
const config = require('../src/config/env');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const hasKey = !!config.tavilyApiKey;
const testCompany = process.argv[2] || 'Apple';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing: TavilySearchProvider on Query "${testCompany}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`Tavily Key Configured: ${hasKey ? 'YES' : 'NO'}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

if (!hasKey) {
  console.warn(`${colors.yellow}[Notice]: Skipping Tavily test. Set TAVILY_API_KEY in your .env file to run this test.${colors.reset}\n`);
  process.exit(0);
}

const provider = new TavilySearchProvider();

async function run() {
  // 1. Test Web Search
  try {
    console.log(`${colors.yellow}Executing Web Search query...${colors.reset}`);
    const searchStart = Date.now();
    const searchResults = await provider.search(`${testCompany} stock price financial health`, { maxResults: 2 });
    const latency = Date.now() - searchStart;
    
    console.log(`${colors.green}✔ Web Search Succeeded [Latency: ${latency}ms]${colors.reset}`);
    console.log(`Results count: ${searchResults.length}`);
    if (searchResults.length > 0) {
      console.log('Top Result Snippet:', searchResults[0]);
    }
    console.log('');
  } catch (err) {
    console.error(`${colors.red}✘ Web Search Failed: ${err.message}${colors.reset}\n`);
  }

  // 2. Test News Search
  try {
    console.log(`${colors.yellow}Fetching Recent News...${colors.reset}`);
    const newsStart = Date.now();
    const newsArticles = await provider.fetchRecentNews(testCompany);
    const latency = Date.now() - newsStart;
    
    console.log(`${colors.green}✔ News Succeeded [Latency: ${latency}ms]${colors.reset}`);
    console.log(`Articles count: ${newsArticles.length}`);
    if (newsArticles.length > 0) {
      console.log('Latest Article Summary:', newsArticles[0]);
    }
    console.log('');
  } catch (err) {
    console.error(`${colors.red}✘ News Retrieval Failed: ${err.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}Testing Complete for TavilySearchProvider.${colors.reset}`);
  console.log(`${colors.bold}==================================================${colors.reset}`);
}

run();
