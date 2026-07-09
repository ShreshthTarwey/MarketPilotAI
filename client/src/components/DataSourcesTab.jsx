import { formatCount, formatLargeNumber } from '../utils/formatters';

export default function DataSourcesTab({ reportData, currencySymbol, activeTab }) {
  return (
    <div className={`stitch-tab-content ${activeTab === 'sources' ? 'active-tab' : 'inactive-tab'}`}>
      {/* Snapshot Card */}
      <div className="stitch-card details-card">
        <h2 className="stitch-card-title">Corporate Profile Details</h2>
        <div className="stitch-details-grid">
          <div className="detail-row">
            <span className="detail-label">CEO</span>
            <span className="detail-value">{reportData.profile.ceo || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Employees</span>
            <span className="detail-value">{formatCount(reportData.profile.employees)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Headquarters</span>
            <span className="detail-value">{reportData.profile.headquarters || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Exchange Listing</span>
            <span className="detail-value">{reportData.profile.exchange || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Domicile Country</span>
            <span className="detail-value">{reportData.profile.country || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Incorporated / Founded</span>
            <span className="detail-value">{reportData.profile.founded || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Market Capitalization</span>
            <span className="detail-value">{formatLargeNumber(reportData.profile.marketCap, currencySymbol)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Website URL</span>
            <span className="detail-value">
              <a href={reportData.profile.website} target="_blank" rel="noreferrer" className="text-accent underline">
                {reportData.profile.website?.replace('https://', '') || 'N/A'}
              </a>
            </span>
          </div>
        </div>
        
        {reportData.profile.description && (
          <div className="profile-desc-box">
            <span className="desc-title">Business Operations Narrative</span>
            <p className="desc-text">"{reportData.profile.description}"</p>
          </div>
        )}
      </div>
      
      {/* Ingestion audit card */}
      <div className="stitch-card details-card" style={{ marginTop: '20px' }}>
        <h2 className="stitch-card-title">Provider Ingestion & Coverage Logs</h2>
        <div className="terminal-console" style={{ maxWidth: '100%' }}>
          <div className="terminal-stream" style={{ maxHeight: 'none' }}>
            <p className="terminal-line"><span className="terminal-prefix">&gt;</span>Audit: Checking Provider Ingestion Log...</p>
            {reportData.providerCoverage && Object.keys(reportData.providerCoverage).map((prov, i) => (
              <p key={i} className="terminal-line">
                <span className="terminal-prefix">&gt;</span>Provider: [{prov}] Status: {reportData.providerCoverage[prov] ? 'Active (Coverage Passed)' : 'Inactive'}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
