/**
 * valuationConfig.js
 * Centralized settings and constants for the deterministic valuation engine.
 * Eliminates magic numbers and allows direct tuning of financial model assumptions.
 * Prepares sector configurations for future multiples expansion.
 */

module.exports = {
  // Horizon parameters
  forecastYears: 5,

  // Perpetual/Terminal parameters
  terminalGrowthRate: 0.025, // 2.5% long-term inflation growth rate proxy

  // CAPM Cost of Equity (Ke) parameters
  costOfEquityDefaults: {
    riskFreeRate: 0.04,      // 4.0% Risk-Free Rate (Rf)
    marketRiskPremium: 0.055, // 5.5% Market Risk Premium (MRP)
    betaUnlevered: 1.0,      // Baseline asset unlevered beta (Bu)
    taxRate: 0.25            // 25% corporate tax rate proxy
  },

  // Dynamic Cost of Equity limits to prevent absurd valuations
  costOfEquityLimits: {
    min: 0.075,              // Floor of 7.5%
    max: 0.150               // Cap of 15.0%
  },

  // Projected growth limit bounds
  growthLimits: {
    min: 0.025,              // Floor of 2.5% FCF growth
    max: 0.180               // Cap of 18.0% FCF growth (dynamic caps up to this bound)
  },

  // Comparable multiples sector benchmarks (NYU Stern / Damodaran Sector Valuation Benchmarks)
  sectorMultiples: {
    'Technology': {
      pe: 28,
      pb: 6.0,
      evEbitda: 15.0,
      ps: 4.0
    },
    'Communication Services': {
      pe: 24,
      pb: 4.5,
      evEbitda: 14.0,
      ps: 3.5
    },
    'Consumer Cyclical': {
      pe: 25,
      pb: 5.0,
      evEbitda: 14.0,
      ps: 3.5
    },
    'Healthcare': {
      pe: 20,
      pb: 4.0,
      evEbitda: 14.0,
      ps: 3.5
    },
    'Financial Services': {
      pe: 14,
      pb: 1.5,
      evEbitda: 10.0,
      ps: 2.0
    },
    'Consumer Electronics': {
      pe: 24,
      pb: 6.0,
      evEbitda: 13.0,
      ps: 3.8
    },
    'Consumer Retail': {
      pe: 20,
      pb: 3.5,
      evEbitda: 12.0,
      ps: 1.5
    },
    'Energy': {
      pe: 14,
      pb: 1.8,
      evEbitda: 8.0,
      ps: 1.2
    },
    'Industrial': {
      pe: 16,
      pb: 2.2,
      evEbitda: 11.0,
      ps: 1.8
    },
    'Default': {
      pe: 18,
      pb: 2.5,
      evEbitda: 12.0,
      ps: 2.0
    }
  },

  // Consensus blending model weights
  weights: {
    dcfWeight: 0.60,         // 60% DCF valuation weight
    multiplesWeight: 0.40    // 40% multiples relative valuation weight
  },

  // Intrinsic valuation trading thresholds
  thresholds: {
    buyUpside: 0.15,         // 15% upside target for Buy rating
    sellDownside: 0.15,      // 15% downside target for Sell rating
    marginOfSafetyTarget: 0.20 // 20% default Margin of Safety threshold
  },

  // Resolution confidence similarity minimum threshold
  resolutionMinSimilarity: 0.70, // 70% match threshold between query and LLM correction suggestions

  // Multi-Factor score weightings
  multiFactorWeights: {
    valuation: 0.30,     // Gap between consensus target price and current trading price (30%)
    financials: 0.30,    // Scorecard metrics (Profitability & Solvency) (30%)
    momentum: 0.15,      // Price trend (Bullish/Bearish/Neutral) (15%)
    news: 0.10,          // Sentiment & materiality score (10%)
    risk: 0.15           // Risk metrics penalty (Safety Score) (15%)
  }
};
