import { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowLeft, 
  ShieldCheck, 
  Cpu, 
  Database, 
  FileText, 
  Calculator, 
  Activity, 
  Workflow, 
  FileCheck, 
  DollarSign, 
  BookOpen, 
  AlertTriangle
} from 'lucide-react';
import Loader from './components/Loader';

function formatLargeNumber(num, currencySymbol = '$') {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'N/A';
  const absNum = Math.abs(num);
  let formatted = '';
  if (absNum >= 1e12) {
    formatted = (num / 1e12).toFixed(2) + 'T';
  } else if (absNum >= 1e9) {
    formatted = (num / 1e9).toFixed(2) + 'B';
  } else if (absNum >= 1e6) {
    formatted = (num / 1e6).toFixed(2) + 'M';
  } else {
    formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return currencySymbol + formatted;
}

function formatCount(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'N/A';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return num.toLocaleString();
}

function getSupportingFactorsList(reportData) {
  const factors = [];
  const ratios = reportData.scores?.ratios || {};
  const scoresObj = reportData.scores || {};
  const breakdown = scoresObj.breakdown || {};
  const valuation = reportData.valuation || {};
  const rating = reportData.recommendation?.rating?.toLowerCase() || 'hold';

  if (rating === 'buy') {
    if (ratios.revenueGrowth > 10) factors.push("Accelerating revenue growth");
    if (ratios.operatingMargin > 15) factors.push("Strong operating profitability");
    if (ratios.debtToEquity < 0.8) factors.push("Healthy solvency (low leverage)");
    if (ratios.currentRatio > 1.5) factors.push("Robust short-term liquidity");
    if (ratios.freeCashFlow > 0) factors.push("Positive free cash flow generation");
    if (valuation.marginOfSafety > 0) factors.push(`Trades at ${valuation.marginOfSafety.toFixed(0)}% safety discount`);
    if (factors.length === 0) {
      factors.push("Strong quantitative scoring breakdown");
      factors.push("Healthy overall solvency profiles");
    }
  } else if (rating === 'sell') {
    if (ratios.revenueGrowth < 0) factors.push("Declining revenue growth trends");
    if (ratios.operatingMargin < 0) factors.push("Operating losses recorded");
    if (ratios.debtToEquity > 2.0) factors.push("High leverage ratio (debt risk)");
    if (ratios.currentRatio < 1.0) factors.push("Weak short-term liquidity cover");
    if (ratios.freeCashFlow <= 0) factors.push("Negative free cash flow burn");
    if (valuation.marginOfSafety <= 0) factors.push("No margin of safety (trading premium)");
    if (breakdown.safetyScore < 40) factors.push("Critical solvency safety alerts active");
    if (factors.length === 0) {
      factors.push("Weak scoring metrics across factor scales");
      factors.push("Elevated valuation risks identified");
    }
  } else {
    if (valuation.marginOfSafety <= 0) factors.push("Fair valuation (trading at premium)");
    else factors.push(`Fair valuation (${valuation.marginOfSafety.toFixed(0)}% safety buffer)`);
    if (ratios.operatingMargin > 0 && ratios.operatingMargin < 15) factors.push("Moderate operating profitability");
    if (ratios.debtToEquity >= 0.8 && ratios.debtToEquity <= 2.0) factors.push("Moderate balance sheet leverage");
    if (ratios.priceTrend === 'Sideways') factors.push("Sideways market price momentum");
    if (factors.length === 0) {
      factors.push("Balanced profitability and trend factors");
      factors.push("Neutral qualitative news catalyst score");
    }
  }
  return factors.slice(0, 4);
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingLogs, setLoadingLogs] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, financials, risks
  const [errorMsg, setErrorMsg] = useState(null);

  // Pre-flight Resolve Autocomplete Debounce
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/resolve?company=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && data.ticker) {
          setSuggestions([data]);
        } else if (data && !data.success && data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Pre-flight resolve error:', err);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Auto-dismiss execution error toast after 5 seconds
  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  // Execute Core LangGraph Research Pipeline
  const runResearch = async (companyName) => {
    setIsLoading(true);
    setSuggestions([]);
    setReportData(null);
    setLoadingProgress(0);
    setLoadingStage('Initializing orchestrator...');
    setLoadingLogs([]);

    // Custom console stream logs
    const stages = [
      { prg: 5, stage: 'Validating Query...', log: 'VALIDATOR: String checks and character sanity checks passed.' },
      { prg: 15, stage: 'Resolving Company...', log: 'RESOLVER: Contacting symbol resolver autocomplete endpoints...' },
      { prg: 25, stage: 'Contacting Primary Feeds...', log: 'RESOLVER: Bound resolved identity details.' },
      { prg: 35, stage: 'Sweeping Financials...', log: 'COLLECTOR: Triggering concurrent API queries to Yahoo Finance...' },
      { prg: 45, stage: 'Scraping Fallbacks...', log: 'COLLECTOR: Fetching fundamentalsTimeSeries database profiles...' },
      { prg: 55, stage: 'Collecting News...', log: 'COLLECTOR: Concurrently querying Tavily Search endpoint for news logs...' },
      { prg: 65, stage: 'Evaluating Evidence Quality...', log: 'QUALITY GATE: Evaluating collected fields completeness metric...' },
      { prg: 75, stage: 'Calculating Solvency & Scorecard...', log: 'SCORING ENGINE: Computing Solvency, Profitability, and Momentum subscores...' },
      { prg: 85, stage: 'Solving Valuation Models...', log: 'VALUATION ENGINE: Solving dynamic Levered Beta and CAPM Cost of Equity...' },
      { prg: 90, stage: 'Compiling DCF and Comps...', log: 'VALUATION ENGINE: Discounting projected cash flows and sector multiples...' },
      { prg: 95, stage: 'Generating Qualitative Thesis...', log: 'LLM ROUTER: Feeding inputs to Llama-3.3-70b qualitative prompt synthesizer...' }
    ];

    // Speed up log stream simulation
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < stages.length) {
        const next = stages[currentStep];
        setLoadingProgress(next.prg);
        setLoadingStage(next.stage);
        setLoadingLogs(prev => [...prev, next.log]);
        currentStep++;
      }
    }, 1100);

    try {
      const res = await fetch(`http://localhost:5000/api/research?company=${encodeURIComponent(companyName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName })
      });

      clearInterval(interval);

      if (!res.ok) {
        const errPayload = await res.json();
        throw new Error(errPayload.message || 'API Server Error');
      }

      const report = await res.json();
      
      // Complete progress loader transition
      setLoadingProgress(100);
      setLoadingStage('State Graph execution complete.');
      setLoadingLogs(prev => [...prev, 'SYSTEM: Structured JSON report compiled. Transitioning view.']);
      
      setTimeout(() => {
        setReportData(report.data);
        setIsLoading(false);
        setSearchQuery('');
      }, 500);

    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (item) => {
    runResearch(item.ticker);
  };

  const handlePopularSearchClick = (ticker) => {
    runResearch(ticker);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      runResearch(searchQuery);
    }
  };

  const currencySymbol = reportData?.profile?.currencySymbol || '$';

  return (
    <>
      {/* Navigation Header */}
      <header className="nav-container">
        <div className="nav-logo" onClick={() => setReportData(null)} style={{ cursor: 'pointer' }}>
          <Workflow size={18} style={{ strokeWidth: 2.5 }} />
          <span>MARKETPILOT AI</span>
        </div>
        <nav className="nav-links">
          <a href="#how-it-works">Flow</a>
          <a href="#why-platform">Architecture</a>
          <a href="https://github.com/ShreshthTarwey/MarketPilotAI" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            GitHub
          </a>
        </nav>
        <button className="btn-primary" onClick={() => setReportData(null)}>Reset View</button>
      </header>

      {errorMsg && (
        <div className="error-toast-container">
          <div className="error-toast-card">
            <div className="error-toast-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} className="error-toast-icon" style={{ color: '#ff7b72' }} />
                <span className="error-toast-title">Research Execution Error</span>
              </div>
              <button className="error-toast-close" onClick={() => setErrorMsg(null)}>&times;</button>
            </div>
            <p className="error-toast-body">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="page-container">
        {isLoading ? (
          <Loader progress={loadingProgress} stage={loadingStage} logs={loadingLogs} />
        ) : reportData ? (
          /* ========================================== */
          /* STATE B: ACTIVE STOCK REPORT DASHBOARD UI  */
          /* ========================================== */
          <div className="fade-in">
            {/* Back Button */}
            <button className="report-back-btn" onClick={() => setReportData(null)}>
              <ArrowLeft size={16} />
              <span>Back to search</span>
            </button>

            {/* Header Summary Panel */}
            <section className="report-header">
              <div className="report-identity">
                <h1 className="report-ticker">
                  {reportData.resolvedIdentity.ticker}
                  <span className="report-market-label">{reportData.resolvedIdentity.market || 'Equity'}</span>
                </h1>
                <p className="report-name">{reportData.resolvedIdentity.name}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '8px' }}>
                  Sector: {reportData.profile.sector || 'N/A'} &bull; Industry: {reportData.profile.industry || 'N/A'}
                  {reportData.resolvedIdentity.resolutionConfidence !== undefined && (
                    <> &bull; Resolution Match: {Math.round(reportData.resolvedIdentity.resolutionConfidence * 100)}%</>
                  )}
                </p>
                {reportData.profile.description && (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.5', maxWidth: '800px' }}>
                    "{reportData.profile.description.split('. ').slice(0, 2).join('. ') + '.'}"
                  </p>
                )}
              </div>

              <div className="report-rating-badge" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
                <div className={`badge-value ${reportData.recommendation.rating?.toLowerCase()}`}>
                  {reportData.recommendation.rating}
                </div>
                <p className="badge-sublabel">Calculated Intrinsic Decision</p>
                
                {/* Recommendation Summary Card */}
                <div className="rec-summary-box">
                  <span className="rec-summary-title">Key Decision Drivers</span>
                  <ul className="rec-summary-list">
                    {getSupportingFactorsList(reportData).map((factor, idx) => (
                      <li key={idx} className="rec-summary-item">{factor}</li>
                    ))}
                  </ul>
                </div>
                
                {reportData.recommendation.lastUpdated && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', display: 'block', marginTop: '4px' }}>
                    Last Updated: {new Date(reportData.recommendation.lastUpdated).toLocaleString()}
                  </span>
                )}
              </div>
            </section>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-gray)', marginBottom: '24px', paddingBottom: '12px' }}>
              <button 
                className={activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'} 
                onClick={() => setActiveTab('overview')}
                style={{ borderRadius: '4px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Executive Summary
              </button>
              <button 
                className={activeTab === 'financials' ? 'btn-primary' : 'btn-secondary'} 
                onClick={() => setActiveTab('financials')}
                style={{ borderRadius: '4px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Valuation Models & Cash Flow
              </button>
              <button 
                className={activeTab === 'risks' ? 'btn-primary' : 'btn-secondary'} 
                onClick={() => setActiveTab('risks')}
                style={{ borderRadius: '4px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Provenance & System Logs
              </button>
            </div>

            {/* TAB CONTENT: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* ROW 1: Snapshot & Key Financial Metrics */}
                <div className="report-grid">
                  {/* Card 1.1: Company Snapshot */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 className="report-card-title">
                      <Workflow size={18} />
                      Company Snapshot
                    </h2>
                    <div className="snapshot-grid">
                      {reportData.profile.ceo && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">CEO</span>
                          <span className="snapshot-value">{reportData.profile.ceo}</span>
                        </div>
                      )}
                      {reportData.profile.employees && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Employees</span>
                          <span className="snapshot-value">{formatCount(reportData.profile.employees)}</span>
                        </div>
                      )}
                      {reportData.profile.headquarters && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Headquarters</span>
                          <span className="snapshot-value">{reportData.profile.headquarters}</span>
                        </div>
                      )}
                      {reportData.profile.exchange && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Exchange</span>
                          <span className="snapshot-value">{reportData.profile.exchange}</span>
                        </div>
                      )}
                      {reportData.profile.country && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Country</span>
                          <span className="snapshot-value">{reportData.profile.country}</span>
                        </div>
                      )}
                      {reportData.profile.founded && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Founded</span>
                          <span className="snapshot-value">{reportData.profile.founded}</span>
                        </div>
                      )}
                      {reportData.profile.marketCap > 0 && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Market Cap</span>
                          <span className="snapshot-value">{formatLargeNumber(reportData.profile.marketCap, currencySymbol)}</span>
                        </div>
                      )}
                      {reportData.profile.website && reportData.profile.website !== 'No website available.' && (
                        <div className="snapshot-item">
                          <span className="snapshot-label">Website</span>
                          <span className="snapshot-value">
                            <a href={reportData.profile.website} target="_blank" rel="noreferrer" className="snapshot-link">
                              {reportData.profile.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                            </a>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 1.2: Key Financial Metrics */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 className="report-card-title">
                      <Activity size={18} />
                      Key Financial Metrics
                    </h2>
                    {(() => {
                      const ratios = reportData.scores?.ratios || {};
                      return (
                        <div className="metrics-grid">
                          {reportData.profile.peRatio !== null && (
                            <div className="metric-item">
                              <span className="metric-label">P/E Ratio</span>
                              <span className="metric-value">{reportData.profile.peRatio.toFixed(1)}x</span>
                            </div>
                          )}
                          {reportData.profile.eps !== null && (
                            <div className="metric-item">
                              <span className="metric-label">EPS</span>
                              <span className="metric-value">{currencySymbol}{reportData.profile.eps.toFixed(2)}</span>
                            </div>
                          )}
                          {ratios.roe !== undefined && ratios.roe !== null && ratios.roe !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Return on Equity (ROE)</span>
                              <span className="metric-value">{ratios.roe.toFixed(1)}%</span>
                            </div>
                          )}
                          {ratios.operatingMargin !== undefined && ratios.operatingMargin !== null && ratios.operatingMargin !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Operating Margin</span>
                              <span className="metric-value">{ratios.operatingMargin.toFixed(1)}%</span>
                            </div>
                          )}
                          {ratios.revenueGrowth !== undefined && ratios.revenueGrowth !== null && ratios.revenueGrowth !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Revenue Growth</span>
                              <span className="metric-value">{ratios.revenueGrowth.toFixed(1)}%</span>
                            </div>
                          )}
                          {ratios.currentRatio !== undefined && ratios.currentRatio !== null && ratios.currentRatio !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Current Ratio</span>
                              <span className="metric-value">{ratios.currentRatio.toFixed(2)}x</span>
                            </div>
                          )}
                          {ratios.debtToEquity !== undefined && ratios.debtToEquity !== null && ratios.debtToEquity !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Debt-to-Equity</span>
                              <span className="metric-value">{ratios.debtToEquity.toFixed(2)}x</span>
                            </div>
                          )}
                          {ratios.freeCashFlow !== undefined && ratios.freeCashFlow !== null && ratios.freeCashFlow !== 0 && (
                            <div className="metric-item">
                              <span className="metric-label">Free Cash Flow</span>
                              <span className="metric-value">{formatLargeNumber(ratios.freeCashFlow, currencySymbol)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ROW 2: Thesis & Calculated Targets */}
                <div className="report-grid">
                  {/* Card 2.1: Investment Thesis & AI Risks */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '24px' }}>
                    <div>
                      <h2 className="report-card-title">
                        <FileText size={18} />
                        Investment Thesis
                      </h2>
                      <div className="thesis-body">
                        {reportData.recommendation.investmentThesis?.split('\n').filter(p => p.trim()).map((para, i) => (
                          <p key={i} className="thesis-paragraph">{para}</p>
                        ))}
                      </div>
                    </div>
                    
                    {/* AI-Synthesized Qualitative Risks */}
                    {reportData.recommendation.risks && reportData.recommendation.risks.length > 0 && (
                      <div className="ai-risks-section">
                        <h3 className="ai-risks-title">
                          <AlertTriangle size={15} />
                          AI-Synthesized Qualitative Risk Factors
                        </h3>
                        <ul className="ai-risks-list">
                          {reportData.recommendation.risks.map((risk, idx) => (
                            <li key={idx} className="ai-risk-item">
                              <span className="risk-bullet">&bull;</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card 2.2: Calculated Targets */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h2 className="report-card-title">
                      <Calculator size={18} />
                      Calculated Targets
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1, justifyContent: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consensus Fair Price Target</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                          {currencySymbol}{reportData.valuation.consensusValue?.toFixed(2)}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '16px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Trading Price</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.3rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                          {currencySymbol}{reportData.valuation.currentPrice?.toFixed(2)}
                        </p>
                      </div>

                      {(() => {
                        const diff = (reportData.valuation.consensusValue || 0) - (reportData.valuation.currentPrice || 0);
                        const sign = diff >= 0 ? '+' : '';
                        return (
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '16px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valuation Pricing Gap</span>
                            <p style={{ fontFamily: 'var(--mono)', fontSize: '1.3rem', color: diff >= 0 ? 'var(--success)' : 'var(--error)', margin: '4px 0 0 0' }}>
                              {sign}{currencySymbol}{diff.toFixed(2)}
                            </p>
                          </div>
                        );
                      })()}

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '16px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Margin of Safety</span>
                        <div style={{ marginTop: '8px' }}>
                          {reportData.valuation.marginOfSafety > 0 ? (
                            <div className="mos-alert positive">
                              <ShieldCheck size={14} />
                              <span>+{reportData.valuation.marginOfSafety.toFixed(1)}% Discount</span>
                            </div>
                          ) : (
                            <div className="mos-alert negative">
                              <AlertTriangle size={14} />
                              <span>Premium Price Gap (No Safety Margin)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Score Breakdown Table & Confidence Explanation */}
                <div className="report-grid">
                  {/* Card 3.1: Compact Score Breakdown Table */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 className="report-card-title">
                      <ShieldCheck size={18} />
                      Multi-Factor Scoring Engine Breakdown
                    </h2>
                    {(() => {
                      const breakdown = reportData.scores?.breakdown || {
                        valuationScore: null,
                        financialsScore: 50,
                        momentumScore: 50,
                        newsScore: 50,
                        safetyScore: 100,
                        newsModifier: 0
                      };
                      const weights = { valuation: 0.30, financials: 0.30, momentum: 0.15, news: 0.10, risk: 0.15 };
                      const isValuationNull = breakdown.valuationScore === null;
                      const activeWeightsSum = isValuationNull ? 0.70 : 1.0;
                      const normWeights = {
                        valuation: isValuationNull ? 0 : 0.30 / activeWeightsSum,
                        financials: 0.30 / activeWeightsSum,
                        momentum: 0.15 / activeWeightsSum,
                        news: 0.10 / activeWeightsSum,
                        risk: 0.15 / activeWeightsSum
                      };

                      return (
                        <table className="score-breakdown-table">
                          <thead>
                            <tr>
                              <th>Factor Category</th>
                              <th style={{ textAlign: 'center' }}>Raw Score</th>
                              <th style={{ textAlign: 'center' }}>Weight</th>
                              <th style={{ textAlign: 'right' }}>Weighted Contribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            {breakdown.valuationScore !== null && (
                              <tr>
                                <td>Valuation Model Gap</td>
                                <td style={{ textAlign: 'center' }}>{breakdown.valuationScore}%</td>
                                <td style={{ textAlign: 'center' }}>{Math.round(normWeights.valuation * 100)}%</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                  {((breakdown.valuationScore / 100) * (normWeights.valuation * 100)).toFixed(1)} / {Math.round(normWeights.valuation * 100)}
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td>Financial Health Quality</td>
                              <td style={{ textAlign: 'center' }}>{breakdown.financialsScore}%</td>
                              <td style={{ textAlign: 'center' }}>{Math.round(normWeights.financials * 100)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                {((breakdown.financialsScore / 100) * (normWeights.financials * 100)).toFixed(1)} / {Math.round(normWeights.financials * 100)}
                              </td>
                            </tr>
                            <tr>
                              <td>Price Trend Momentum</td>
                              <td style={{ textAlign: 'center' }}>{breakdown.momentumScore}%</td>
                              <td style={{ textAlign: 'center' }}>{Math.round(normWeights.momentum * 100)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                {((breakdown.momentumScore / 100) * (normWeights.momentum * 100)).toFixed(1)} / {Math.round(normWeights.momentum * 100)}
                              </td>
                            </tr>
                            <tr>
                              <td>News Sentiment Catalysts</td>
                              <td style={{ textAlign: 'center' }}>{breakdown.newsScore}%</td>
                              <td style={{ textAlign: 'center' }}>{Math.round(normWeights.news * 100)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                {((breakdown.newsScore / 100) * (normWeights.news * 100)).toFixed(1)} / {Math.round(normWeights.news * 100)}
                              </td>
                            </tr>
                            <tr>
                              <td>Solvency Risk Safety</td>
                              <td style={{ textAlign: 'center' }}>{breakdown.safetyScore}%</td>
                              <td style={{ textAlign: 'center' }}>{Math.round(normWeights.risk * 100)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                {((breakdown.safetyScore / 100) * (normWeights.risk * 100)).toFixed(1)} / {Math.round(normWeights.risk * 100)}
                              </td>
                            </tr>
                            {breakdown.newsModifier !== 0 && (
                              <tr className="modifier-row">
                                <td colSpan="3" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Proportional News Catalyst Modifier</td>
                                <td style={{ textAlign: 'right', color: breakdown.newsModifier > 0 ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
                                  {breakdown.newsModifier > 0 ? `+${breakdown.newsModifier}` : breakdown.newsModifier}
                                </td>
                              </tr>
                            )}
                            <tr className="total-row">
                              <td colSpan="3" style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Consolidated Investment Score</td>
                              <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: '800', fontSize: '1.2rem' }}>
                                {reportData.scores.overallScore} / 100
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  {/* Card 3.2: Research Confidence Checklist */}
                  <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 className="report-card-title">
                      <FileCheck size={18} />
                      Research Confidence Checklist
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <span>Completeness Score</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        {reportData.recommendation.confidenceScore || reportData.evidenceCompleteness || 0}%
                      </span>
                    </div>
                    
                    {reportData.recommendation.confidenceReasons && (
                      <ul className="confidence-checklist">
                        {reportData.recommendation.confidenceReasons.map((item, idx) => (
                          <li key={idx} className={`confidence-item status-${item.status}`}>
                            <span className="chk-icon">{item.status === 'success' ? '✓' : item.status === 'warning' ? '⚠' : '✗'}</span>
                            <span className="chk-text">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {reportData.warnings && reportData.warnings.length > 0 && (
                      <div className="warn-list" style={{ marginTop: '10px' }}>
                        {reportData.warnings.slice(0, 2).map((w, idx) => (
                          <div key={idx} className="warn-item">
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ROW 4: Market News & Sentiment Summary + Cards */}
                <div className="report-card">
                  <h2 className="report-card-title">
                    <BookOpen size={18} />
                    Market News & Sentiment Catalysts
                  </h2>
                  
                  {/* News Sentiment Summary Panel */}
                  {(() => {
                    const newsList = reportData.news || [];
                    let posCount = 0; let neuCount = 0; let negCount = 0;
                    let highCount = 0; let medCount = 0; let lowCount = 0;
                    newsList.forEach(n => {
                      if (n.sentiment === 'positive') posCount++;
                      else if (n.sentiment === 'negative') negCount++;
                      else neuCount++;
                      if (n.materiality === 'high') highCount++;
                      else if (n.materiality === 'medium') medCount++;
                      else lowCount++;
                    });

                    return newsList.length > 0 ? (
                      <>
                        <div className="news-summary-panel">
                          <div className="news-summary-card">
                            <span className="summary-label">News Sentiment Balance</span>
                            <div className="summary-indicators">
                              <span className="summary-indicator sentiment-positive">Positive: {posCount}</span>
                              <span className="summary-indicator sentiment-neutral">Neutral: {neuCount}</span>
                              <span className="summary-indicator sentiment-negative">Negative: {negCount}</span>
                            </div>
                          </div>
                          <div className="news-summary-card">
                            <span className="summary-label">Material Impact Levels</span>
                            <div className="summary-indicators">
                              <span className="summary-indicator materiality-high">High Impact: {highCount}</span>
                              <span className="summary-indicator materiality-medium">Medium: {medCount}</span>
                              <span className="summary-indicator materiality-low">Low: {lowCount}</span>
                            </div>
                          </div>
                        </div>

                        <div className="news-card-grid" style={{ marginTop: '20px' }}>
                          {newsList.map((item, idx) => (
                            <div key={idx} className="news-card">
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                  <span className="news-source">{item.source} &bull; {item.date}</span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {item.sentiment && (
                                      <span className={`tag-badge sentiment-${item.sentiment}`}>
                                        {item.sentiment}
                                      </span>
                                    )}
                                    {item.materiality && (
                                      <span className={`tag-badge materiality-${item.materiality}`}>
                                        {item.materiality}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <h4 className="news-title">{item.title}</h4>
                                <p className="news-snippet">{item.snippet}</p>
                              </div>
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noreferrer" className="news-audit-link">
                                  View Reference Article &gt;
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No unstructured news found for this company.</p>
                    );
                  })()}
                </div>

              </div>
            )}

            {/* TAB CONTENT: VALUATION MODELS */}
            {activeTab === 'financials' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Models Splitting card */}
                <div className="report-card">
                  <h2 className="report-card-title">
                    <DollarSign size={18} />
                    Intrinsic Valuation Model Inputs
                  </h2>
                  <div className="val-split-grid">
                    <div className="val-col">
                      <span className="val-col-title">Discounted Cash Flow (60% Weight)</span>
                      <p className="val-col-price">{currencySymbol}{reportData.valuation.dcfValue?.toFixed(2)}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Based on Cost of Equity Ke: {reportData.valuation.assumptions.costOfEquity}% (CAPM derived).
                      </p>
                    </div>
                    <div className="val-col">
                      <span className="val-col-title">Comparable Sector Multiples (40% Weight)</span>
                      <p className="val-col-price">{currencySymbol}{reportData.valuation.relativeValue?.toFixed(2)}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Uses Sector PE target Multiple ({reportData.valuation.assumptions.targetSectorPe}x) and PB ({reportData.valuation.assumptions.targetSectorPb}x).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Free Cash Flow projections Spreadsheet */}
                {reportData.valuation.projections && (
                  <div className="report-card">
                    <h2 className="report-card-title">
                      <Activity size={18} />
                      5-Year Free Cash Flow Projections Table
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                      FCF Projections smoothen historical YoY growth spikes. Forecast Horizon: 5 Years. Perpetual Terminal Growth Rate pegged to macro economy: 2.5%.
                    </p>
                    <div className="table-scroll">
                      <table className="fcf-table">
                        <thead>
                          <tr>
                            <th>Variable / Period</th>
                            <th>Base Year</th>
                            <th>Year 1</th>
                            <th>Year 2</th>
                            <th>Year 3</th>
                            <th>Year 4</th>
                            <th>Year 5</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Projected Free Cash Flow</td>
                            <td className="highlight">{currencySymbol}{reportData.valuation.projections.fcfArray[0]?.toFixed(1)}M</td>
                            {reportData.valuation.projections.fcfArray.slice(1).map((val, idx) => (
                              <td key={idx}>{currencySymbol}{val.toFixed(1)}M</td>
                            ))}
                          </tr>
                          <tr>
                            <td>Discount Factor (CAPM)</td>
                            <td className="highlight">1.000</td>
                            {reportData.valuation.projections.discountFactors.slice(1).map((val, idx) => (
                              <td key={idx}>{val.toFixed(3)}</td>
                            ))}
                          </tr>
                          <tr>
                            <td>Present Value (PV) of FCF</td>
                            <td className="highlight">{currencySymbol}{reportData.valuation.projections.presentValues[0]?.toFixed(1)}M</td>
                            {reportData.valuation.projections.presentValues.slice(1).map((val, idx) => (
                              <td key={idx} className="highlight">{currencySymbol}{val.toFixed(1)}M</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sum PV of Projections</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {currencySymbol}{(reportData.valuation.projections.totalPresentValue - reportData.valuation.projections.terminalValue).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Perpetual Terminal Value (PV)</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {currencySymbol}{reportData.valuation.projections.terminalValue?.toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total PV of Equity Value</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {currencySymbol}{reportData.valuation.projections.totalPresentValue?.toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PROVENANCE / RECOVERY LOGS */}
            {activeTab === 'risks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* News & Scrapes Panel */}
                <div className="report-card">
                  <h2 className="report-card-title">
                    <BookOpen size={18} />
                    Qualitative Synthesized News Sources
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reportData.news && reportData.news.length > 0 ? (
                      reportData.news.map((item, idx) => (
                        <div key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '12px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                            <span>[{item.source}] &bull; {item.date}</span>
                            {item.sentiment && (
                              <span className={`tag-badge sentiment-${item.sentiment}`} style={{ textTransform: 'uppercase', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                {item.sentiment}
                              </span>
                            )}
                            {item.materiality && (
                              <span className={`tag-badge materiality-${item.materiality}`} style={{ textTransform: 'uppercase', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                Impact: {item.materiality}
                              </span>
                            )}
                          </span>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500', margin: '4px 0' }}>
                            {item.title}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.snippet}</p>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--info)', display: 'inline-block', marginTop: '6px' }}>
                              Audit Reference URL &gt;
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No unstructured news found for this company.</p>
                    )}
                  </div>
                </div>

                {/* System Recovery History logs */}
                <div className="report-card">
                  <h2 className="report-card-title">
                    <Database size={18} />
                    Provenance Audit Log & Provider Coverage
                  </h2>
                  <div className="terminal-console" style={{ maxWidth: '100%' }}>
                    <div className="terminal-stream" style={{ maxHeight: 'none' }}>
                      <p className="terminal-line"><span className="terminal-prefix">&gt;</span>Audit: Checking Provider Ingestion Log...</p>
                      {reportData.providerCoverage && Object.keys(reportData.providerCoverage).map((prov, i) => (
                        <p key={i} className="terminal-line">
                          <span className="terminal-prefix">&gt;</span>Provider: [{prov}] Status: {reportData.providerCoverage[prov] ? 'Active (Coverage Passed)' : 'Inactive'}
                        </p>
                      ))}
                      <p className="terminal-line" style={{ marginTop: '12px' }}><span className="terminal-prefix">&gt;</span>Audit: Checking Recovery Cascades History...</p>
                      {reportData.recoveryHistory && reportData.recoveryHistory.length > 0 ? (
                        reportData.recoveryHistory.map((rec, i) => (
                          <p key={i} className="terminal-line">
                            <span className="terminal-prefix">&gt;</span>Recovery: [{rec.provider}] recovered missing field [{rec.field}] at level [{rec.level}] ({rec.status})
                          </p>
                        ))
                      ) : (
                        <p className="terminal-line"><span className="terminal-prefix">&gt;</span>Recovery: No missing fields triggered. Primary feeds returned 100% data payload integrity.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================== */
          /* STATE A: LANDING PAGE (DEFAULT VIEW)       */
          /* ========================================== */
          <div className="fade-in">
            {/* Hero Section */}
            <section className="hero-section">
              <h1 className="hero-title">MarketPilot AI</h1>
              <p className="hero-subtitle">
                Institutional-grade stock research powered by deterministic finance and explainable AI.
              </p>

              {/* Centered Search Bar */}
              <div className="search-wrapper">
                <form onSubmit={handleSearchSubmit}>
                  <div className="search-input-container">
                    <Search className="search-icon" size={20} />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search Apple, Microsoft, TCS..."
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (!val.trim()) {
                          setSuggestions([]);
                        }
                      }}
                    />
                    <button type="submit" style={{ display: 'none' }} />
                  </div>
                </form>

                {/* Autocomplete Dropdown overlay */}
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="autocomplete-item"
                        onClick={() => handleSuggestionClick(item)}
                      >
                        <span className="ticker-badge">{item.ticker}</span>
                        <span className="company-name">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Searches underneath */}
              <div className="popular-searches">
                <span className="popular-label">Popular searches:</span>
                <span className="popular-pill" onClick={() => handlePopularSearchClick('AAPL')}>Apple (AAPL)</span>
                <span className="popular-pill" onClick={() => handlePopularSearchClick('MSFT')}>Microsoft (MSFT)</span>
                <span className="popular-pill" onClick={() => handlePopularSearchClick('TCS.NS')}>TCS (TCS.NS)</span>
              </div>
            </section>

            {/* How it Works cards */}
            <section id="how-it-works" className="section-wrapper">
              <div className="section-header">
                <h2 className="section-title">How It Works</h2>
                <p className="section-subtitle">Six decoupled steps defining the research pipeline</p>
              </div>

              <div className="flow-grid">
                <div className="flow-card">
                  <span className="flow-num">01</span>
                  <h3 className="flow-card-title">Resolve</h3>
                  <p className="flow-card-desc">Queries autocompleted to verified global tickers.</p>
                </div>
                <div className="flow-card">
                  <span className="flow-num">02</span>
                  <h3 className="flow-card-title">Collect</h3>
                  <p className="flow-card-desc">Concurrent sweeps from Yahoo Finance and Tavily.</p>
                </div>
                <div className="flow-card">
                  <span className="flow-num">03</span>
                  <h3 className="flow-card-title">Validate</h3>
                  <p className="flow-card-desc">Diagnostic quality gate audits completeness levels.</p>
                </div>
                <div className="flow-card">
                  <span className="flow-num">04</span>
                  <h3 className="flow-card-title">Score</h3>
                  <p className="flow-card-desc">Deterministic solvency and profitability ratios.</p>
                </div>
                <div className="flow-card">
                  <span className="flow-num">05</span>
                  <h3 className="flow-card-title">Value</h3>
                  <p className="flow-card-desc">CAPM discount factor models and DCF target prices.</p>
                </div>
                <div className="flow-card">
                  <span className="flow-num">06</span>
                  <h3 className="flow-card-title">Explain</h3>
                  <p className="flow-card-desc">LLM qualitative analysis explains calculations.</p>
                </div>
              </div>
            </section>

            {/* Why MarketPilot cards */}
            <section id="why-platform" className="section-wrapper">
              <div className="section-header">
                <h2 className="section-title">Why MarketPilot AI</h2>
                <p className="section-subtitle">Mathematical integrity combined with explainable reasoning</p>
              </div>

              <div className="feature-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Calculator size={22} />
                  </div>
                  <h3 className="feature-title">Deterministic Valuation</h3>
                  <p className="feature-desc">Calculations executed in JavaScript engine, preventing LLMs from guessing metrics.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <ShieldCheck size={22} />
                  </div>
                  <h3 className="feature-title">Evidence Quality Gate</h3>
                  <p className="feature-desc">Ensures data completeness satisfies requirements before running models.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Workflow size={22} />
                  </div>
                  <h3 className="feature-title">LangGraph Agent</h3>
                  <p className="feature-desc">A stateful orchestrator loops to recollect missing elements dynamically.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Database size={22} />
                  </div>
                  <h3 className="feature-title">Multi-source Evidence</h3>
                  <p className="feature-desc">Gathers annual cash flows, profile descriptions, and news stories in parallel.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Cpu size={22} />
                  </div>
                  <h3 className="feature-title">Explainable AI</h3>
                  <p className="feature-desc">Reports explain reasoning transparently with citation URLs and audit links.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Activity size={22} />
                  </div>
                  <h3 className="feature-title">Transparent Calculations</h3>
                  <p className="feature-desc">Renders projections schedules, and CAPM inputs directly in the UI dashboard.</p>
                </div>
              </div>
            </section>

            {/* Architecture Preview section */}
            <section className="section-wrapper">
              <div className="section-header">
                <h2 className="section-title">Architecture Preview</h2>
                <p className="section-subtitle">LangGraph node execution loop</p>
              </div>
              <div className="preview-container">
                <img 
                  src="https://lh3.googleusercontent.com/aida/AP1WRLsKDwuGkPKI4WeHpNK2XTS4Vdgk-4_Kbc7_Y___CJ99I1iKS7MsMZEjouwX7C_PXyj7OBzJg7DgLs9OFAkGXuVYLGCuu2LDu_TjKyxoaLK_Je4-e4Lgubt9yoc9pASObPpgHyg-VL0x1VY2LwEDI8vSrJl55-UrY-Ka4GlFZD22WUsQFVvvfoVX0SRwjMtY0KQ3lXUY6u0NOVr9V2M7fQ3LBtmppuGDZaouYLcQAygG-xMcNvEsMjKNFg" 
                  alt="MarketPilot AI Flow Diagram" 
                  className="preview-image"
                />
                <p className="preview-caption">The MarketPilot AI Pipeline: From Query to Deterministic Report</p>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer minimal */}
      <footer className="footer-container">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} MarketPilot AI. All rights reserved. &bull; Institutional Stock Valuation Platform.
        </p>
      </footer>
    </>
  );
}
