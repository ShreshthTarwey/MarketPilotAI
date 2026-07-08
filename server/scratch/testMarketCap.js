const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('SWIGGY.NS', {
      modules: ['price', 'summaryDetail']
    });
    console.log('Price marketCap:', summary.price?.marketCap);
    console.log('Detail marketCap:', summary.summaryDetail?.marketCap);
  } catch (err) {
    console.error(err);
  }
}
test();
