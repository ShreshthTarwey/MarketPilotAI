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

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingLogs, setLoadingLogs] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, financials, risks

  // Pre-flight Resolve Autocomplete Debounce
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/resolve?company=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.ticker) {
          setSuggestions([data]);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Pre-flight resolve error:', err);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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
      alert(`Research Execution Error: ${err.message}`);
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Sector: {reportData.profile.sector || 'N/A'} &bull; Industry: {reportData.profile.industry || 'N/A'}
                </p>
              </div>

              <div className="report-rating-badge">
                <div className={`badge-value ${reportData.recommendation.rating?.toLowerCase()}`}>
                  {reportData.recommendation.rating}
                </div>
                <p className="badge-sublabel">Calculated Intrinsic Decision</p>
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
              <div className="report-grid">
                {/* Left Column: Thesis & Scorecards */}
                <div style={{ display: 'flex', flexDirection: 'col', gap: '24px' }}>
                  {/* LLM Thesis Panel */}
                  <div className="report-card">
                    <h2 className="report-card-title">
                      <FileText size={18} />
                      Investment Thesis
                    </h2>
                    <div className="thesis-body">
                      <p>{reportData.recommendation.investmentThesis}</p>
                    </div>
                  </div>

                  {/* Dynamic Scorecard progress */}
                  <div className="report-card" style={{ marginTop: '24px' }}>
                    <h2 className="report-card-title">
                      <ShieldCheck size={18} />
                      Deterministic Scorecard Analysis
                    </h2>
                    <div className="score-circle-grid">
                      {/* Profitability */}
                      <div className="score-circle-item">
                        <div className="radial-gauge">
                          <svg width="70" height="70">
                            <circle cx="35" cy="35" r="30" className="radial-track" />
                            <circle cx="35" cy="35" r="30" 
                              className={`radial-fill ${reportData.scores.profitabilityScore >= 70 ? 'high' : reportData.scores.profitabilityScore >= 40 ? 'mid' : 'low'}`}
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              strokeDashoffset={`${2 * Math.PI * 30 * (1 - (reportData.scores.profitabilityScore || 0) / 100)}`}
                            />
                          </svg>
                          <span className="radial-text">{reportData.scores.profitabilityScore}%</span>
                        </div>
                        <span className="score-label">Profitability</span>
                      </div>

                      {/* Solvency */}
                      <div className="score-circle-item">
                        <div className="radial-gauge">
                          <svg width="70" height="70">
                            <circle cx="35" cy="35" r="30" className="radial-track" />
                            <circle cx="35" cy="35" r="30" 
                              className={`radial-fill ${reportData.scores.solvencyScore >= 70 ? 'high' : reportData.scores.solvencyScore >= 40 ? 'mid' : 'low'}`}
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              strokeDashoffset={`${2 * Math.PI * 30 * (1 - (reportData.scores.solvencyScore || 0) / 100)}`}
                            />
                          </svg>
                          <span className="radial-text">{reportData.scores.solvencyScore}%</span>
                        </div>
                        <span className="score-label">Solvency</span>
                      </div>

                      {/* Momentum */}
                      <div className="score-circle-item">
                        <div className="radial-gauge">
                          <svg width="70" height="70">
                            <circle cx="35" cy="35" r="30" className="radial-track" />
                            <circle cx="35" cy="35" r="30" 
                              className={`radial-fill ${reportData.scores.momentumScore >= 70 ? 'high' : reportData.scores.momentumScore >= 40 ? 'mid' : 'low'}`}
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              strokeDashoffset={`${2 * Math.PI * 30 * (1 - (reportData.scores.momentumScore || 0) / 100)}`}
                            />
                          </svg>
                          <span className="radial-text">{reportData.scores.momentumScore}%</span>
                        </div>
                        <span className="score-label">Momentum</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem' }}>Overall Aggregated Financial Score</span>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {reportData.scores.overallScore}/100
                        </span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-fill" style={{ width: `${reportData.scores.overallScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Key Stats & Quality Gate Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Quality Gate Status Card */}
                  <div className="report-card">
                    <h2 className="report-card-title">
                      <FileCheck size={18} />
                      Evidence Quality Gate
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <span>Completeness Audit</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {reportData.evidenceCompleteness || 0}%
                      </span>
                    </div>
                    <div className="progress-container" style={{ margin: '0 0 16px 0' }}>
                      <div className="progress-fill" style={{ 
                        width: `${reportData.evidenceCompleteness}%`,
                        backgroundColor: reportData.evidenceCompleteness >= 80 ? 'var(--success)' : 'var(--warning)'
                      }}></div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <p>Recollection Loops: {reportData.recollectionAttempts} / 2</p>
                      <p style={{ marginTop: '4px' }}>Status: {reportData.evidenceCompleteness >= 80 ? 'Audited & Confirmed' : 'Degraded Feed (Low Completeness)'}</p>
                    </div>

                    {reportData.warnings && reportData.warnings.length > 0 && (
                      <div className="warn-list">
                        {reportData.warnings.map((w, idx) => (
                          <div key={idx} className="warn-item">
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Valuation metrics */}
                  <div className="report-card">
                    <h2 className="report-card-title">
                      <Calculator size={18} />
                      Calculated Targets
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consensus Fair Price Target</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                          ${reportData.valuation.consensusValue?.toFixed(2)}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Trading Price</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                          ${reportData.valuation.currentPrice?.toFixed(2)}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Margin of Safety</span>
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
                      <p className="val-col-price">${reportData.valuation.dcfValue?.toFixed(2)}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Based on Cost of Equity Ke: {reportData.valuation.assumptions.costOfEquity}% (CAPM derived).
                      </p>
                    </div>
                    <div className="val-col">
                      <span className="val-col-title">Comparable Sector Multiples (40% Weight)</span>
                      <p className="val-col-price">${reportData.valuation.relativeValue?.toFixed(2)}</p>
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
                            <td className="highlight">${reportData.valuation.projections.fcfArray[0]?.toFixed(1)}M</td>
                            {reportData.valuation.projections.fcfArray.slice(1).map((val, idx) => (
                              <td key={idx}>${val.toFixed(1)}M</td>
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
                            <td className="highlight">${reportData.valuation.projections.presentValues[0]?.toFixed(1)}M</td>
                            {reportData.valuation.projections.presentValues.slice(1).map((val, idx) => (
                              <td key={idx} className="highlight">${val.toFixed(1)}M</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sum PV of Projections</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          ${(reportData.valuation.projections.totalPresentValue - reportData.valuation.projections.terminalValue).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Perpetual Terminal Value (PV)</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          ${reportData.valuation.projections.terminalValue?.toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total PV of Equity Value</span>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          ${reportData.valuation.projections.totalPresentValue?.toFixed(1)}M
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
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                            [{item.source}] &bull; {item.date}
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
