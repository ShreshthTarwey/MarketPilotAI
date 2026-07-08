const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('SWIGGY.NS', {
      modules: ['price', 'summaryDetail']
    });
    console.log('Price regularMarketPrice:', summary.price?.regularMarketPrice);
    console.log('Detail regularMarketPrice:', summary.summaryDetail?.regularMarketPrice);
    console.log('Detail previousClose:', summary.summaryDetail?.previousClose);
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();
