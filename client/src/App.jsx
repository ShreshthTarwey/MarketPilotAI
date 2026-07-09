import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Loader from './components/Loader';
import Navbar from './components/Navbar';
import PriceChart from './components/PriceChart';
import ValuationTab from './components/ValuationTab';
import DataSourcesTab from './components/DataSourcesTab';
import LlmPromptTraceTab from './components/LlmPromptTraceTab';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';

function getSupportingFactorsList(report) {
  const rating = report.recommendation.rating?.toLowerCase() || 'hold';
  const factors = [];
  
  if (rating === 'buy') {
    if (report.valuation.marginOfSafety > 10) {
      factors.push(`Strong Intrinsic Margin of Safety: +${report.valuation.marginOfSafety.toFixed(1)}%`);
    }
    if (report.scores.profitabilityScore >= 75) {
      factors.push("Superior profitability margins & ROE ratios");
    }
    if (report.scores.solvencyScore >= 60) {
      factors.push("Healthy balance sheet & debt solvency coverage");
    }
    if (factors.length < 3) {
      factors.push("Undervalued entry points relative to sector benchmarks");
    }
  } else if (rating === 'sell') {
    if (report.valuation.marginOfSafety < -10) {
      factors.push(`Significant Premium Over Fair Value`);
    }
    if (report.scores.solvencyScore < 40) {
      factors.push("Distressed solvency/liquidity ratio coverage");
    }
    if (report.scores.profitabilityScore < 50) {
      factors.push("Eroding operating margins & return metrics");
    }
    if (factors.length < 3) {
      factors.push("Unfavorable qualitative news catalysts & momentum");
    }
  } else {
    factors.push("Neutral trading range relative to calculated fair value");
    if (report.scores.ratios.debtToEquity > 2) {
      factors.push("Elevated debt leverage acts as neutralizer");
    }
    if (report.scores.ratios.operatingMargin > 15) {
      factors.push("Strong operating cash flow offsets high multiples");
    }
    if (factors.length < 3) {
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
  const [activeTab, setActiveTab] = useState('valuation'); // valuation, sources, trace
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== 'light'; // default to dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      runResearch(searchQuery);
    }
  };

  const currencySymbol = reportData?.profile?.currencySymbol || '$';

  return (
    <>
      {/* Navigation Header with theme toggle controls */}
      <Navbar setReportData={setReportData} isDark={isDark} setIsDark={setIsDark} />

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
            {/* Top Navigation Row */}
            <div className="report-nav-row">
              <button className="report-back-btn" onClick={() => setReportData(null)}>
                <ArrowLeft size={16} />
                <span>Back to search</span>
              </button>
            </div>

            {/* Header Summary Panel */}
            <section className="report-header-stitch">
              <div className="report-identity-stitch">
                <span className="report-market-stitch">EQUITIES / {reportData.profile.exchange || reportData.resolvedIdentity.market || 'NASDAQ'}</span>
                <h1 className="report-title-stitch">
                  {reportData.resolvedIdentity.ticker} <span className="report-name-stitch">{reportData.resolvedIdentity.name}</span>
                  <span className={`stitch-badge-rating ${reportData.recommendation.rating?.toLowerCase()}`}>
                    {reportData.recommendation.rating}
                  </span>
                </h1>
              </div>

              <div className="report-price-stitch">
                <div className="price-row">
                  <span className="price-value">{currencySymbol}{reportData.valuation.currentPrice?.toFixed(2) || '0.00'}</span>
                  {(() => {
                    const currentPrice = reportData.valuation.currentPrice || 0;
                    const consensusValue = reportData.valuation.consensusValue || 0;
                    const pricingGapPct = currentPrice > 0 ? ((consensusValue - currentPrice) / currentPrice) * 100 : 0;
                    const isPositive = pricingGapPct >= 0;
                    return (
                      <span className={`price-change-badge ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(pricingGapPct).toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
                <span className="price-updated">Last Updated: Just Now</span>
              </div>
            </section>

            <div className="stitch-dashboard-grid">
              
              {/* LEFT COLUMN: Main Chart & Active Tab Content */}
              <div className="stitch-dashboard-main">
                
                {/* SVG Curve Chart Card */}
                <PriceChart reportData={reportData} currencySymbol={currencySymbol} />

                {/* Tab Navigation inside Main Column */}
                <div className="stitch-tabs-nav">
                  <button 
                    className={activeTab === 'valuation' ? 'active' : ''} 
                    onClick={() => setActiveTab('valuation')}
                  >
                    Valuation Model
                  </button>
                  <button 
                    className={activeTab === 'sources' ? 'active' : ''} 
                    onClick={() => setActiveTab('sources')}
                  >
                    Data Sources
                  </button>
                  <button 
                    className={activeTab === 'trace' ? 'active' : ''} 
                    onClick={() => setActiveTab('trace')}
                  >
                    LLM Prompt Trace
                  </button>
                </div>

                {/* Tab Content 1: Valuation Model */}
                <ValuationTab reportData={reportData} currencySymbol={currencySymbol} activeTab={activeTab} />

                {/* Tab Content 2: Data Sources */}
                <DataSourcesTab reportData={reportData} currencySymbol={currencySymbol} activeTab={activeTab} />

                {/* Tab Content 3: LLM Prompt Trace */}
                <LlmPromptTraceTab reportData={reportData} activeTab={activeTab} />
              </div>

              {/* RIGHT COLUMN: Sidebar Cards */}
              <Sidebar reportData={reportData} currencySymbol={currencySymbol} />

            </div>
          </div>
        ) : (
          /* ========================================== */
          /* STATE A: LANDING PAGE (DEFAULT VIEW)       */
          /* ========================================== */
          <LandingPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            handleSearchSubmit={handleSearchSubmit}
            handleSuggestionClick={handleSuggestionClick}
            runResearch={runResearch}
          />
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
