import { FileText } from 'lucide-react';

export default function Sidebar({ reportData, currencySymbol }) {
  return (
    <div className="stitch-dashboard-sidebar">
      {/* Pipeline status card */}
      <div className="stitch-card sidebar-card pipeline-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label">PIPELINE STATUS</span>
          <span className="badge-active">ACTIVE</span>
        </div>
        
        <div className="pipeline-steps-list">
          <div className="pipeline-step-item">
            <div className="step-left">
              <span className="dot-green"></span>
              <span className="step-name">Resolve</span>
            </div>
            <span className="step-latency">12ms</span>
          </div>
          <div className="pipeline-step-item">
            <div className="step-left">
              <span className="dot-green"></span>
              <span className="step-name">Collect</span>
            </div>
            <span className="step-latency">380ms</span>
          </div>
          <div className="pipeline-step-item">
            <div className="step-left">
              <span className="dot-green"></span>
              <span className="step-name">Validate</span>
            </div>
            <span className="step-latency">85ms</span>
          </div>
          <div className="pipeline-step-item">
            <div className="step-left">
              <span className="dot-green"></span>
              <span className="step-name">Score</span>
            </div>
            <span className="step-latency">120ms</span>
          </div>
        </div>
        
        <div className="pipeline-status-box">
          Status: Complete
        </div>
      </div>

      {/* Market Intelligence summary card */}
      <div className="stitch-card sidebar-card intelligence-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label">MARKET INTELLIGENCE</span>
        </div>
        
        <p className="intelligence-body">
          Current metrics indicate a calculated consensus valuation target of {currencySymbol}{reportData.valuation.consensusValue?.toFixed(2)} representing a {reportData.valuation.marginOfSafety > 0 ? reportData.valuation.marginOfSafety.toFixed(1) + '%' : '0%'} safety margin. Solvent structures show resilient cash positioning.
        </p>

        <button className="pdf-button" onClick={() => window.print()}>
          <FileText size={14} />
          <span>Print Research Report</span>
        </button>
      </div>

      {/* Promo/Image card */}
      <div className="stitch-card sidebar-card image-card-stitch">
        <div className="image-card-visual">
          <span className="visual-title">GLOBAL MARKETS</span>
          <span className="visual-subtitle">Platform Node Ingestion Monitor</span>
        </div>
      </div>
    </div>
  );
}
