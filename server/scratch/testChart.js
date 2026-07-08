const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const res = await yahooFinance.chart('SWIGGY.NS', {
      period1: '2025-07-08',
      interval: '1d'
    });
    console.log('Success:', res.quotes ? res.quotes.length : 0, 'quotes');
  } catch (err) {
    console.error('Chart failed:', err);
  }
}
test();
