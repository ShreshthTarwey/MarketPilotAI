export default function LlmPromptTraceTab({ reportData, activeTab }) {
  return (
    <div className={`stitch-tab-content ${activeTab === 'trace' ? 'active-tab' : 'inactive-tab'}`}>
      {/* Thesis narrative card */}
      <div className="stitch-card thesis-card">
        <h2 className="stitch-card-title">Explainable Investment Thesis</h2>
        <div className="thesis-body-stitch">
          {reportData.recommendation.investmentThesis?.split('\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} className="thesis-para">{para}</p>
          ))}
        </div>

        {reportData.recommendation.risks && reportData.recommendation.risks.length > 0 && (
          <div className="thesis-risks-box">
            <span className="risks-header">AI-Synthesized Qualitative Risk Factors</span>
            <ul className="risks-list-stitch">
              {reportData.recommendation.risks.map((risk, idx) => (
                <li key={idx}>&bull; {risk}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Qualitative news feed */}
      <div className="stitch-card thesis-card" style={{ marginTop: '20px' }}>
        <h2 className="stitch-card-title">Unstructured News Scraping Audit Sources</h2>
        <div className="news-feed-container">
          {reportData.news && reportData.news.length > 0 ? (
            reportData.news.map((item, idx) => (
              <div key={idx} className="news-item-stitch">
                <div className="news-meta">
                  <span className="news-source">[{item.source}]</span>
                  <span className="news-date">{item.date}</span>
                  {item.sentiment && <span className={`sentiment-tag ${item.sentiment}`}>{item.sentiment}</span>}
                </div>
                <h4 className="news-title">{item.title}</h4>
                <p className="news-snippet">{item.snippet}</p>
                {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="news-link">Audit Citation URL &gt;</a>}
              </div>
            ))
          ) : (
            <p className="text-muted">No news files scraped for this asset.</p>
          )}
        </div>
      </div>

      {/* recovery cascade terminal log */}
      <div className="stitch-card thesis-card" style={{ marginTop: '20px' }}>
        <h2 className="stitch-card-title">Recovery Cascade Ingestion Trace</h2>
        <div className="terminal-console" style={{ maxWidth: '100%' }}>
          <div className="terminal-stream" style={{ maxHeight: 'none' }}>
            <p className="terminal-line"><span className="terminal-prefix">&gt;</span>Audit: Checking Recovery Cascades History...</p>
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
  );
}
