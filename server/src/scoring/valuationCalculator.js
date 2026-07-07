/**
 * valuationCalculator.js
 * Performs deterministic financial valuation models.
 * Calculates DCF (Discounted Cash Flow) and Relative Valuation Multiples.
 * Uses current price and market cap from evidence to solve valuation targets keylessly.
 * Utilizes parameters loaded from valuationConfig.js.
 */

const config = require('../config/valuationConfig');

/**
 * Calculates Cost of Equity (Ke) using CAPM and Levered Beta formulas.
 * 
 * @param {number} debtToEquity - Solvency ratio (D/E)
 * @returns {number} Cost of Equity decimal (e.g., 0.11)
 */
function calculateCostOfEquity(debtToEquity) {
  const defaults = config.costOfEquityDefaults;
  
  // 1. Calculate Levered Beta: BL = BU * (1 + (1 - TaxRate) * D/E)
  const betaLevered = defaults.betaUnlevered * (1 + (1 - defaults.taxRate) * Math.max(0, debtToEquity));
  
  // 2. CAPM: Ke = Rf + Beta_levered * MRP
  const costOfEquity = defaults.riskFreeRate + (betaLevered * defaults.marketRiskPremium);

  // 3. Enforce policy bounds
  return Math.max(config.costOfEquityLimits.min, Math.min(config.costOfEquityLimits.max, costOfEquity));
}

/**
 * Calculates a smoothed, average historical growth rate from income statements.
 * Compresses abnormal spikes to prevent distorted forecasting projections.
 * 
 * @param {Object[]} incomeStatements - Historical income statements array
 * @returns {number} Smoothed growth rate as decimal (e.g., 0.05)
 */
function calculateSmoothedGrowth(incomeStatements) {
  if (!incomeStatements || incomeStatements.length < 2) {
    return config.growthLimits.min; // Default to baseline floor
  }

  const growths = [];
  // Calculate year-over-year revenue growths
  for (let i = 0; i < incomeStatements.length - 1; i++) {
    const current = incomeStatements[i].revenue || 0;
    const previous = incomeStatements[i + 1].revenue || 0;

    if (previous > 0) {
      const rawGrowth = ((current - previous) / previous) * 100;
      
      // Smooth abnormal spikes (linear compression for growth > 30% or < -20%)
      let smoothed = rawGrowth;
      if (rawGrowth > 30) {
        smoothed = 30 + 0.1 * (rawGrowth - 30);
      } else if (rawGrowth < -20) {
        smoothed = -20 + 0.1 * (rawGrowth + 20);
      }
      growths.push(smoothed);
    }
  }

  if (growths.length === 0) {
    return config.growthLimits.min;
  }

  // Calculate average of available growths
  const averageGrowth = growths.reduce((acc, g) => acc + g, 0) / growths.length;
  
  // Apply final safety clamps loaded from configuration
  return Math.max(config.growthLimits.min, Math.min(config.growthLimits.max, averageGrowth / 100));
}

/**
 * Executes a Discounted Cash Flow (DCF) projection model.
 * Exposes all intermediate calculations for full mathematical audit trails.
 * 
 * @param {Object} financials 
 * @param {Object} profile 
 * @param {number} currentPrice 
 * @param {number} debtToEquity 
 * @returns {Object} Comprehensive DCF calculations bundle.
 */
function runDcfModel(financials, profile, currentPrice, debtToEquity) {
  const cashFlows = financials?.annualCashFlow || [];
  const income = financials?.annualIncomeStatement || [];
  const marketCap = profile?.marketCap || 0;

  const defaultResult = {
    fairPrice: null,
    costOfEquity: 0,
    fcfGrowth: 0,
    fcfBase: 0,
    projectedFcf: [],
    terminalValue: 0,
    pvCashFlows: [],
    pvTerminalValue: 0,
    totalPv: 0
  };

  if (cashFlows.length === 0 || !currentPrice || marketCap === 0) {
    return defaultResult;
  }

  // Extract base Free Cash Flow from the latest year (OCF + CapEx)
  const latestCF = cashFlows[0];
  const fcfBase = latestCF.freeCashFlow || (latestCF.operatingCashFlow + (latestCF.capitalExpenditures || 0)) || 0;

  if (fcfBase <= 0) {
    return defaultResult;
  }

  // Calculate Cost of Equity (CAPM) using solvency-linked Beta levering
  const costOfEquity = calculateCostOfEquity(debtToEquity);

  // Compute forecast growth logic with confidence smoothing
  const fcfGrowth = calculateSmoothedGrowth(income);

  // Project future cash flows for 5 years
  const projectedFcf = [];
  let currentFcf = fcfBase;
  for (let t = 1; t <= config.forecastYears; t++) {
    currentFcf = currentFcf * (1 + fcfGrowth);
    projectedFcf.push(parseFloat(currentFcf.toFixed(2)));
  }

  // Calculate Terminal Value (TV) using perpetual inflation growth projection
  const terminalFcf = projectedFcf[config.forecastYears - 1] * (1 + config.terminalGrowthRate);
  const divisor = Math.max(0.01, costOfEquity - config.terminalGrowthRate);
  const terminalValue = terminalFcf / divisor;

  // Discount cash flows and terminal value
  const pvCashFlows = [];
  let pvOfCashFlows = 0;
  for (let t = 1; t <= config.forecastYears; t++) {
    const pv = projectedFcf[t - 1] / Math.pow(1 + costOfEquity, t);
    pvCashFlows.push(parseFloat(pv.toFixed(2)));
    pvOfCashFlows += pv;
  }
  const pvTerminalValue = terminalValue / Math.pow(1 + costOfEquity, config.forecastYears);
  const totalPv = pvOfCashFlows + pvTerminalValue;

  // Intrinsic price resolution algebraic trick
  const fairPrice = currentPrice * (totalPv / marketCap);

  return {
    fairPrice: parseFloat(fairPrice.toFixed(2)),
    costOfEquity: parseFloat((costOfEquity * 100).toFixed(2)),
    fcfGrowth: parseFloat((fcfGrowth * 100).toFixed(2)),
    fcfBase: parseFloat(fcfBase.toFixed(2)),
    projectedFcf,
    terminalValue: parseFloat(terminalValue.toFixed(2)),
    pvCashFlows,
    pvTerminalValue: parseFloat(pvTerminalValue.toFixed(2)),
    totalPv: parseFloat(totalPv.toFixed(2))
  };
}

/**
 * Executes a Relative Valuation (comparable multiples) model.
 * 
 * @param {Object} financials 
 * @param {Object} profile 
 * @param {number} currentPrice 
 * @returns {{ fairPrice: number, peVal: number, pbVal: number, targetPe: number, targetPb: number }}
 */
function runRelativeValuation(financials, profile, currentPrice) {
  const marketCap = profile?.marketCap || 0;
  const income = financials?.annualIncomeStatement || [];
  const balance = financials?.annualBalanceSheet || [];

  if (marketCap === 0 || !currentPrice || income.length === 0) {
    return { fairPrice: null, peVal: 0, pbVal: 0, targetPe: 0, targetPb: 0 };
  }

  // Resolve sector benchmark multiples
  const sector = profile.industry || profile.sector || 'Default';
  let targetPE = config.sectorMultiples.Default.pe;
  let targetPB = config.sectorMultiples.Default.pb;

  for (const [key, value] of Object.entries(config.sectorMultiples)) {
    if (sector.toUpperCase().includes(key.toUpperCase())) {
      targetPE = value.pe;
      targetPB = value.pb;
      break;
    }
  }

  // Earnings Multiple (P/E)
  const latestInc = income[0];
  const netIncome = latestInc.netIncome || 0;
  let peVal = 0;
  if (netIncome > 0) {
    peVal = currentPrice * ((netIncome * targetPE) / marketCap);
  }

  // Book Value Multiple (P/B)
  let pbVal = 0;
  if (balance.length > 0) {
    const equity = balance[0].totalEquity || 0;
    if (equity > 0) {
      pbVal = currentPrice * ((equity * targetPB) / marketCap);
    }
  }

  // Consolidated multiples valuation average
  let fairPrice = 0;
  if (peVal > 0 && pbVal > 0) {
    fairPrice = (peVal + pbVal) / 2;
  } else {
    fairPrice = peVal || pbVal || null;
  }

  return {
    fairPrice: fairPrice ? parseFloat(fairPrice.toFixed(2)) : null,
    peVal: parseFloat(peVal.toFixed(2)),
    pbVal: parseFloat(pbVal.toFixed(2)),
    targetPe: targetPE,
    targetPb: targetPB
  };
}

/**
 * Builds the complete rich valuation object containing parameters, valuations, and safety bounds.
 * Exposes all intermediate calculations for observability and frontend charts consumption.
 * 
 * @param {Object} financials 
 * @param {Object} profile 
 * @param {number} currentPrice 
 * @param {number} revenueGrowth 
 * @param {number} debtToEquity 
 * @returns {Object} Full rich valuation report object.
 */
function compileValuationReport(financials, profile, currentPrice, revenueGrowth, debtToEquity) {
  const dcf = runDcfModel(financials, profile, currentPrice, debtToEquity);
  const relative = runRelativeValuation(financials, profile, currentPrice);

  let consensusValue = null;
  const dcfWeight = config.weights.dcfWeight;
  const multiplesWeight = config.weights.multiplesWeight;

  if (dcf.fairPrice && relative.fairPrice) {
    consensusValue = (dcf.fairPrice * dcfWeight) + (relative.fairPrice * multiplesWeight);
  } else {
    consensusValue = dcf.fairPrice || relative.fairPrice || null;
  }

  if (consensusValue) {
    consensusValue = parseFloat(consensusValue.toFixed(2));
  }

  // Calculate Margin of Safety, Upside %, and Downside %
  let upsidePercent = 0;
  let downsidePercent = 0;
  let marginOfSafety = 0;

  if (consensusValue && currentPrice) {
    if (consensusValue > currentPrice) {
      upsidePercent = parseFloat((((consensusValue - currentPrice) / currentPrice) * 100).toFixed(2));
      marginOfSafety = parseFloat((((consensusValue - currentPrice) / consensusValue) * 100).toFixed(2));
    } else if (currentPrice > consensusValue) {
      downsidePercent = parseFloat((((currentPrice - consensusValue) / currentPrice) * 100).toFixed(2));
    }
  }

  // Determine recommendation basis mathematically based on thresholds
  let recommendationBasis = 'Hold: The stock is currently trading close to its intrinsic consensus fair value.';
  if (consensusValue && currentPrice) {
    const upsideRatio = (consensusValue - currentPrice) / currentPrice;
    if (upsideRatio >= config.thresholds.buyUpside) {
      recommendationBasis = `Buy: The intrinsic value of $${consensusValue} is significantly above the market price of $${currentPrice}, providing a Margin of Safety of ${marginOfSafety}%.`;
    } else if (upsideRatio <= -config.thresholds.sellDownside) {
      recommendationBasis = `Sell: The stock is trading at a premium over its intrinsic consensus valuation of $${consensusValue}, indicating overvaluation.`;
    }
  }

  return {
    currentPrice: currentPrice || null,
    dcfValue: dcf.fairPrice,
    relativeValue: relative.fairPrice,
    consensusValue,
    upsidePercent,
    downsidePercent,
    marginOfSafety,
    recommendationBasis,
    
    // Detailed intermediate valuation calculation audit logs
    intermediates: {
      fcfBase: dcf.fcfBase,
      projectedFcf: dcf.projectedFcf,
      terminalValue: dcf.terminalValue,
      pvCashFlows: dcf.pvCashFlows,
      pvTerminalValue: dcf.pvTerminalValue,
      totalPresentValue: dcf.totalPv,
      peValue: relative.peVal,
      pbValue: relative.pbVal
    },

    assumptions: {
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      freeCashFlowGrowth: dcf.fcfGrowth,
      terminalGrowthRate: parseFloat((config.terminalGrowthRate * 100).toFixed(2)),
      costOfEquity: dcf.costOfEquity, // Changed from discountRate WACC
      forecastYears: config.forecastYears,
      targetPE: relative.targetPe,
      targetPB: relative.targetPb,
      dcfWeight: parseFloat((dcfWeight * 100).toFixed(2)),
      multiplesWeight: parseFloat((multiplesWeight * 100).toFixed(2))
    }
  };
}

module.exports = {
  runDcfModel,
  runRelativeValuation,
  compileValuationReport
};
