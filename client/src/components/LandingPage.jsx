import { Search, Calculator, ShieldCheck, Workflow, Database } from 'lucide-react';

export default function LandingPage({
  searchQuery,
  setSearchQuery,
  suggestions,
  setSuggestions,
  handleSearchSubmit,
  handleSuggestionClick,
  runResearch
}) {
  const handlePopularSearchClick = (ticker) => {
    setSearchQuery(ticker);
    runResearch(ticker);
  };

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="hero-section" style={{ paddingTop: '40px' }}>
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
            src="/architecture_workflow.png"
            alt="MarketPilot AI Flow Diagram"
            className="preview-image"
          />
          <p className="preview-caption">The MarketPilot AI Pipeline: From Query to Deterministic Report</p>
        </div>
      </section>
    </div>
  );
}
