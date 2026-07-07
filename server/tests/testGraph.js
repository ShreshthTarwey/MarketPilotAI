/**
 * testGraph.js
 * Standalone verification script for the Compiled LangGraph Orchestration Workflow.
 * Executes the complete state machine node sequence, conditional routing, and reporting.
 * Outputs detailed grouped audits, provider coverages, and intermediate valuations.
 */

const graph = require('../src/agent/graph');
const { createInitialState } = require('../src/agent/state');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const testQuery = process.argv[2] || 'Apple';

console.log(`${colors.bold}==================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}Testing End-to-End LangGraph Orchestration: "${testQuery}"${colors.reset}`);
console.log(`${colors.bold}==================================================${colors.reset}\n`);

async function run() {
  const initialState = createInitialState(testQuery);
  const startTime = Date.now();

  try {
    console.log(`[Test]: Invoking compiled StateGraph...`);
    const finalState = await graph.invoke(initialState);
    const duration = Date.now() - startTime;

    console.log(`\n${colors.green}${colors.bold}✔ LangGraph Execution Finished [Total Latency: ${duration}ms]${colors.reset}\n`);

    // 1. RESOLUTION
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}1. RESOLUTION${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`  Input Query: "${finalState.inputCompanyName}"`);
    console.log(`  Resolved Name: ${finalState.resolvedName || 'N/A'}`);
    console.log(`  Resolved Ticker: ${finalState.resolvedTicker || 'N/A'}`);
    console.log(`  Market Context: ${finalState.market || 'N/A'}`);
    console.log(`  Execution Stage: ${finalState.executionStage}`);
    console.log('');

    // 2. EVIDENCE COLLECTION
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}2. EVIDENCE COLLECTION${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`  Company Profile: ${finalState.profile ? '✓ Loaded' : '✘ Missing'}`);
    console.log(`  Financial Statements: ${finalState.financials ? '✓ Loaded' : '✘ Missing'}`);
    console.log(`  News Articles Count: ${finalState.news?.length || 0}`);
    console.log(`  Price History Length: ${finalState.marketContext?.priceHistory?.length || 0} quotes`);
    console.log('');

    // 3. PROVIDER SUMMARY (Provider Coverage Audit)
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}3. PROVIDER COVERAGE SUMMARY${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.providerCoverage) {
      for (const [category, meta] of Object.entries(finalState.providerCoverage)) {
        console.log(`  Category [${colors.bold}${category}${colors.reset}]:`);
        console.log(`    * Provider: ${meta.providerName || 'Unknown'}`);
        console.log(`    * Fallback Level: ${meta.fallbackLevel}`);
        console.log(`    * Date Fetched: ${meta.fetchedAt || 'N/A'}`);
        if (meta.sourceUrl) {
          console.log(`    * Source URL: ${meta.sourceUrl}`);
        }
      }
    } else {
      console.log(`  No provider coverage metadata available.`);
    }
    console.log('');

    // 4. RECOVERY SUMMARY (Grouped logs of field-level recovery)
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}4. FIELD RECOVERY SUMMARY${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.recoveryHistory && finalState.recoveryHistory.length > 0) {
      const grouped = {};
      const categoryMap = {
        revenue: 'Income Statement',
        netIncome: 'Income Statement',
        operatingIncome: 'Income Statement',
        grossProfit: 'Income Statement',
        ebitda: 'Income Statement',
        totalAssets: 'Balance Sheet',
        totalLiabilities: 'Balance Sheet',
        totalEquity: 'Balance Sheet',
        cash: 'Balance Sheet',
        shortTermDebt: 'Balance Sheet',
        longTermDebt: 'Balance Sheet',
        operatingCashFlow: 'Cash Flow',
        capitalExpenditures: 'Cash Flow',
        freeCashFlow: 'Cash Flow'
      };

      finalState.recoveryHistory.forEach(log => {
        const cat = categoryMap[log.field] || 'Profile / Other';
        if (!grouped[log.provider]) grouped[log.provider] = {};
        if (!grouped[log.provider][cat]) grouped[log.provider][cat] = new Set();
        grouped[log.provider][cat].add(log.field);
      });

      for (const [provider, cats] of Object.entries(grouped)) {
        console.log(`  Provider Source: ${colors.bold}${provider}${colors.reset}`);
        for (const [cat, fields] of Object.entries(cats)) {
          console.log(`    * ${cat}:`);
          console.log(`      Recovered: ${[...fields].map(f => `✓ ${f}`).join(', ')}`);
        }
      }
      console.log(`\n  Total recovery operations logged: ${finalState.recoveryHistory.length}`);
      console.log(`  Recollection Loops Completed: ${finalState.recollectionAttempts}`);
    } else {
      console.log(`  No recovery operations required. All data resolved by primary providers.`);
    }
    console.log('');

    // 5. QUALITY GATE
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}5. EVIDENCE QUALITY GATE scorecards${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.qualityReport) {
      console.log(`  Company Profile Completeness: ${finalState.qualityReport.profile}%`);
      console.log(`  Income Statement Completeness: ${finalState.qualityReport.incomeStatement}%`);
      console.log(`  Balance Sheet Completeness: ${finalState.qualityReport.balanceSheet}%`);
      console.log(`  Cash Flow Completeness: ${finalState.qualityReport.cashFlow}%`);
      console.log(`  News Articles Completeness: ${finalState.qualityReport.news}%`);
      console.log(`  Overall Evidence Score: ${colors.green}${finalState.evidenceCompleteness || finalState.qualityReport.overall}%${colors.reset}`);
      
      if (finalState.warnings && finalState.warnings.length > 0) {
        console.log(`\n  Warnings (${finalState.warnings.length}):`);
        finalState.warnings.forEach(w => console.log(`    - [${w.category}] ${w.message}`));
      }
    } else {
      console.log(`  Quality check report not generated.`);
    }
    console.log('');

    // 6. SCORECARD
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}6. QUANTITATIVE SCORECARDS${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.scores) {
      console.log(`  Profitability Subscore: ${finalState.scores.profitabilityScore}/100`);
      console.log(`  Solvency Subscore: ${finalState.scores.solvencyScore}/100`);
      console.log(`  Momentum Subscore: ${finalState.scores.momentumScore}/100`);
      console.log(`  Overall Financial Score: ${colors.green}${finalState.scores.overallScore}/100${colors.reset}`);
      console.log(`  Key Ratios:`);
      console.log(`    * Operating Margin: ${finalState.scores.ratios?.operatingMargin}%`);
      console.log(`    * Revenue Growth: ${finalState.scores.ratios?.revenueGrowth}%`);
      console.log(`    * Current Ratio: ${finalState.scores.ratios?.currentRatio}`);
      console.log(`    * Debt-to-Equity: ${finalState.scores.ratios?.debtToEquity}`);
      console.log(`    * Price Trend: ${finalState.scores.ratios?.priceTrend}`);
    } else {
      console.log(`  Scorecard calculations skipped.`);
    }
    console.log('');

    // 6.5. DETERMINISTIC VALUATION ENGINE
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}6.5. DETERMINISTIC VALUATION ENGINE${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.valuation) {
      const val = finalState.valuation;
      const im = val.intermediates || {};
      
      console.log(`  Current Trading Price: $${val.currentPrice?.toFixed(2) || 'N/A'}`);
      console.log(`  Intrinsic DCF Fair Value: ${val.dcfValue ? `$${val.dcfValue.toFixed(2)}` : 'Not Calculated'}`);
      console.log(`  Intrinsic Relative Multiples Value: ${val.relativeValue ? `$${val.relativeValue.toFixed(2)}` : 'Not Calculated'}`);
      console.log(`  Intrinsic Consensus Blended Price: ${colors.green}$${val.consensusValue?.toFixed(2) || 'N/A'}${colors.reset}`);
      console.log(`  Valuation Upside: ${val.upsidePercent > 0 ? `${colors.green}${val.upsidePercent}%${colors.reset}` : '0%'}`);
      console.log(`  Valuation Downside: ${val.downsidePercent > 0 ? `${colors.red}${val.downsidePercent}%${colors.reset}` : '0%'}`);
      console.log(`  Margin of Safety: ${val.marginOfSafety > 0 ? `${colors.green}${val.marginOfSafety}%${colors.reset}` : '0%'}`);
      console.log(`  Quantitative Valuation Basis: ${colors.bold}${val.recommendationBasis}${colors.reset}`);
      
      console.log(`\n  Centralized Valuation Assumptions:`);
      console.log(`    * Revenue Growth (Smoothed Avg): ${val.assumptions?.revenueGrowth}%`);
      console.log(`    * Free Cash Flow Forecast Growth: ${val.assumptions?.freeCashFlowGrowth}%`);
      console.log(`    * Perpetual Terminal Growth Rate: ${val.assumptions?.terminalGrowthRate}%`);
      console.log(`    * Cost of Equity (CAPM): ${val.assumptions?.costOfEquity}%`);
      console.log(`    * Forecast Horizon Length: ${val.assumptions?.forecastYears} Years`);
      console.log(`    * Target Sector PE Benchmark Multiple: ${val.assumptions?.targetPE}`);
      console.log(`    * Target Sector PB Benchmark Multiple: ${val.assumptions?.targetPB}`);
      console.log(`    * Intrinsic Models Weight: ${val.assumptions?.dcfWeight}% DCF / ${val.assumptions?.multiplesWeight}% Multiples`);

      console.log(`\n  Intermediate DCF Audit Trail Calculations:`);
      console.log(`    * Base Free Cash Flow (FCF0): $${(im.fcfBase || 0).toLocaleString()}`);
      console.log(`    * Projected Cash Flows (Years 1-5):`, im.projectedFcf?.map(f => `$${f.toLocaleString()}`) || []);
      console.log(`    * Present Value of Projected FCFs:`, im.pvCashFlows?.map(f => `$${f.toLocaleString()}`) || []);
      console.log(`    * Terminal Value (Year 5 Perpetual): $${(im.terminalValue || 0).toLocaleString()}`);
      console.log(`    * Present Value of Terminal Value: $${(im.pvTerminalValue || 0).toLocaleString()}`);
      console.log(`    * Total Present Value of Equity (PV): $${(im.totalPresentValue || 0).toLocaleString()}`);
      console.log(`    * Comparable PE Multiple Value: ${im.peValue ? `$${im.peValue.toFixed(2)}` : 'N/A'}`);
      console.log(`    * Comparable PB Multiple Value: ${im.pbValue ? `$${im.pbValue.toFixed(2)}` : 'N/A'}`);
    } else {
      console.log(`  Valuation calculations not completed.`);
    }
    console.log('');

    // 7. LLM RECOMMENDATION
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}7. LLM SYNTHESIS & REPORT${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    if (finalState.recommendation) {
      const rec = finalState.recommendation;
      console.log(`  Rating: ${colors.bold}${rec.rating === 'Buy' ? colors.green : rec.rating === 'Sell' ? colors.red : colors.yellow}${rec.rating}${colors.reset}`);
      console.log(`  Target Price: ${rec.targetPrice !== null ? `$${rec.targetPrice}` : 'Not Estimated'}`);
      console.log(`  Deterministic Confidence: ${colors.green}${rec.confidenceScore}% (Calculated in JS)${colors.reset}`);
      console.log(`\n  Investment Thesis:\n    ${rec.investmentThesis}`);
      console.log(`\n  Risk Factors:`);
      (rec.risks || []).forEach(risk => console.log(`    - ${risk}`));

      if (rec.metadata) {
        console.log(`\n  LLM Call Metadata Audit:`);
        console.log(`    * Provider: ${rec.metadata.provider || 'Unknown'}`);
        console.log(`    * Model: ${rec.metadata.model || 'Unknown'}`);
        console.log(`    * Key Masked: ${rec.metadata.keyMasked || 'N/A'}`);
        console.log(`    * Latency: ${rec.metadata.latencyMs ? `${rec.metadata.latencyMs}ms` : 'N/A'}`);
        console.log(`    * Fallback Executed: ${rec.metadata.fallbackHappened ? 'YES' : 'NO'}`);
      }
    } else {
      console.log(`  Investment report not generated.`);
    }
    console.log('');

    // 8. PERFORMANCE METRICS
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}8. PERFORMANCE & LATENCY METRICS${colors.reset}`);
    console.log(`${colors.bold}==================================================${colors.reset}`);
    console.log(`  Total Flow Execution Latency: ${duration}ms`);
    console.log(`  Cache Hits: Check cache hit tags in logs above.`);
    console.log(`${colors.bold}==================================================${colors.reset}\n`);

  } catch (err) {
    console.error(`\n${colors.red}✘ Graph Invocation Failed: ${err.stack}${colors.reset}\n`);
  }
}

run();
