/**
 * qualityGate.js
 * Pure, stateless validator module that scores the completeness of collected evidence.
 * Calculates category-specific scores, lists missing fields, and determines if recovery is required.
 */

/**
 * Evaluates the completeness score of the Company Profile.
 * 
 * @param {Object} profile 
 * @returns {{ score: number, missing: string[] }}
 */
function evaluateProfile(profile) {
  const missing = [];
  let score = 0;

  if (!profile) {
    return { score: 0, missing: ['name', 'sector', 'industry', 'marketCap'] };
  }

  if (profile.name) score += 25; else missing.push('name');
  if (profile.sector && profile.sector !== 'Unknown Sector') score += 25; else missing.push('sector');
  if (profile.industry && profile.industry !== 'Unknown Industry') score += 25; else missing.push('industry');
  if (profile.marketCap > 0) score += 25; else missing.push('marketCap');

  return { score, missing };
}

/**
 * Evaluates the completeness of the Income Statement.
 * 
 * @param {Object[]} annualIncomeStatement 
 * @returns {{ score: number, missing: string[] }}
 */
function evaluateIncomeStatement(annualIncomeStatement) {
  const missing = [];
  if (!annualIncomeStatement || annualIncomeStatement.length === 0) {
    return { score: 0, missing: ['revenue', 'netIncome', 'operatingIncome', 'grossProfit', 'ebitda'] };
  }

  const latest = annualIncomeStatement[0] || {};
  let score = 0;

  if (latest.revenue > 0) score += 30; else missing.push('revenue');
  if (latest.netIncome !== undefined && latest.netIncome !== 0) score += 30; else missing.push('netIncome');
  if (latest.operatingIncome !== undefined && latest.operatingIncome !== 0) score += 20; else missing.push('operatingIncome');
  if (latest.grossProfit !== undefined && latest.grossProfit !== 0) score += 10; else missing.push('grossProfit');
  if (latest.ebitda !== undefined && latest.ebitda !== 0) score += 10; else missing.push('ebitda');

  return { score, missing };
}

/**
 * Evaluates the completeness of the Balance Sheet.
 * 
 * @param {Object[]} annualBalanceSheet 
 * @returns {{ score: number, missing: string[] }}
 */
function evaluateBalanceSheet(annualBalanceSheet) {
  const missing = [];
  if (!annualBalanceSheet || annualBalanceSheet.length === 0) {
    return { score: 0, missing: ['totalAssets', 'totalLiabilities', 'totalEquity', 'cash'] };
  }

  const latest = annualBalanceSheet[0] || {};
  let score = 0;

  if (latest.totalAssets > 0) score += 40; else missing.push('totalAssets');
  if (latest.totalLiabilities > 0) score += 30; else missing.push('totalLiabilities');
  if (latest.totalEquity !== undefined && latest.totalEquity !== 0) score += 20; else missing.push('totalEquity');
  if (latest.cash !== undefined && latest.cash > 0) score += 10; else missing.push('cash');

  return { score, missing };
}

/**
 * Evaluates the completeness of the Cash Flow statement.
 * 
 * @param {Object[]} annualCashFlow 
 * @returns {{ score: number, missing: string[] }}
 */
function evaluateCashFlow(annualCashFlow) {
  const missing = [];
  if (!annualCashFlow || annualCashFlow.length === 0) {
    return { score: 0, missing: ['operatingCashFlow', 'capitalExpenditures', 'freeCashFlow'] };
  }

  const latest = annualCashFlow[0] || {};
  let score = 0;

  if (latest.operatingCashFlow !== undefined && latest.operatingCashFlow !== 0) score += 40; else missing.push('operatingCashFlow');
  if (latest.capitalExpenditures !== undefined && latest.capitalExpenditures !== 0) score += 30; else missing.push('capitalExpenditures');
  if (latest.freeCashFlow !== undefined && latest.freeCashFlow !== 0) score += 30; else missing.push('freeCashFlow');

  return { score, missing };
}

/**
 * Evaluates news availability. Target: >= 3 articles.
 * 
 * @param {Object[]} news 
 * @returns {{ score: number, missing: string[] }}
 */
function evaluateNews(news) {
  const count = (news || []).length;
  const missing = [];
  
  if (count === 0) {
    missing.push('recentNews');
    return { score: 0, missing };
  }

  // Linear progression to 3 articles
  const score = Math.min(100, Math.round((count / 3) * 100));
  if (count < 3) {
    missing.push('additionalNewsArticles');
  }

  return { score, missing };
}

/**
 * Runs diagnostic evaluations across all data categories and scores completeness.
 * 
 * @param {Object} state - The current Graph state keys.
 * @returns {import('../agent/state').QualityReport & { recollectionRequired: boolean }}
 */
function evaluateQualityGate(state) {
  const profileRes = evaluateProfile(state.profile);
  const incomeRes = evaluateIncomeStatement(state.financials?.annualIncomeStatement);
  const balanceRes = evaluateBalanceSheet(state.financials?.annualBalanceSheet);
  const cashRes = evaluateCashFlow(state.financials?.annualCashFlow);
  const newsRes = evaluateNews(state.news);

  // Group all unique missing fields
  const missingFields = [
    ...profileRes.missing,
    ...incomeRes.missing,
    ...balanceRes.missing,
    ...cashRes.missing,
    ...newsRes.missing
  ];

  // We assign relative category weights for overall completeness
  // Profile (15%), Income (25%), Balance (25%), Cash Flow (25%), News (10%)
  const overall = Math.round(
    (profileRes.score * 0.15) +
    (incomeRes.score * 0.25) +
    (balanceRes.score * 0.25) +
    (cashRes.score * 0.25) +
    (newsRes.score * 0.10)
  );

  // Configured thresholds: 80% for profile/financials, 60% for news
  const isProfileComplete = profileRes.score >= 80;
  const isIncomeComplete = incomeRes.score >= 80;
  const isBalanceComplete = balanceRes.score >= 80;
  const isCashComplete = cashRes.score >= 80;
  const isNewsComplete = newsRes.score >= 60;

  const recollectionRequired = 
    !isProfileComplete || 
    !isIncomeComplete || 
    !isBalanceComplete || 
    !isCashComplete || 
    !isNewsComplete;

  return {
    profile: profileRes.score,
    incomeStatement: incomeRes.score,
    balanceSheet: balanceRes.score,
    cashFlow: cashRes.score,
    news: newsRes.score,
    overall,
    missingFields,
    recollectionRequired
  };
}

module.exports = {
  evaluateQualityGate,
  evaluateProfile,
  evaluateIncomeStatement,
  evaluateBalanceSheet,
  evaluateCashFlow,
  evaluateNews
};
