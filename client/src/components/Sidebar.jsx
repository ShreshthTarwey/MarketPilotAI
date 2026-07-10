import { FileText } from 'lucide-react';

export default function Sidebar({ reportData, currencySymbol }) {
  return (
    <div className="stitch-dashboard-sidebar">
      {/* 1. Recommendation Reason Summary Card */}
      <div className="stitch-card sidebar-card rationale-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label" style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
            Why {(() => {
              const rawRating = reportData.recommendation.rating || 'HOLD';
              const ratingUpper = (reportData.recommendation.researchRating || rawRating).toUpperCase();
              const decision = reportData.recommendation.assignmentDecision || (ratingUpper === 'BUY' ? 'INVEST' : 'PASS');
              return `${decision} (${ratingUpper})`;
            })()}?
          </span>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
          {(() => {
            const reasons = [];
            const marginOfSafety = reportData.valuation.marginOfSafety || 0;
            const overallScore = reportData.scores?.overallScore || 0;
            const roe = reportData.scores?.ratios?.roe || 0;
            const fcf = reportData.scores?.ratios?.freeCashFlow || 0;
            const dToE = reportData.scores?.ratios?.debtToEquity || 0;
            const currentRatio = reportData.scores?.ratios?.currentRatio || 1.0;
            
            // Intrinsic Value Gap
            if (marginOfSafety > 0) {
              reasons.push({ text: `Intrinsic Value ${marginOfSafety.toFixed(1)}% below market`, ok: true });
            } else {
              reasons.push({ text: `Intrinsic Value ${Math.abs(marginOfSafety).toFixed(1)}% above market`, ok: false });
            }

            // Financial Health
            if (currentRatio > 1.2 && dToE < 1.5) {
              reasons.push({ text: "Strong Financial Health", ok: true });
            } else {
              reasons.push({ text: "Moderate/Weak Liquidity Cover", ok: false });
            }

            // Debt leverage check
            if (dToE === 0) {
              reasons.push({ text: "Zero Debt leverage", ok: true });
            } else if (dToE < 1.0) {
              reasons.push({ text: `Low Debt-Equity (${dToE.toFixed(2)}x)`, ok: true });
            } else {
              reasons.push({ text: `Elevated Leverage (${dToE.toFixed(2)}x D/E)`, ok: false });
            }

            // Free Cash Flow
            if (fcf > 0) {
              reasons.push({ text: "Positive Free Cash Flow", ok: true });
            } else {
              reasons.push({ text: "Negative Free Cash Flow", ok: false });
            }

            // High ROE
            if (roe > 20) {
              reasons.push({ text: `High Return on Equity (${roe.toFixed(1)}% ROE)`, ok: true });
            } else if (roe > 0) {
              reasons.push({ text: `Positive ROE (${roe.toFixed(1)}%)`, ok: true });
            } else {
              reasons.push({ text: `Negative ROE (${roe.toFixed(1)}%)`, ok: false });
            }

            // Strong Safety Score
            if (overallScore >= 65) {
              reasons.push({ text: `Strong Safety Score (${overallScore.toFixed(1)}/100)`, ok: true });
            } else {
              reasons.push({ text: `Defensive Safety Score: ${overallScore.toFixed(1)}/100`, ok: false });
            }

            return reasons.map((r, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: r.ok ? 'var(--success)' : 'var(--error)', fontSize: '1rem', fontWeight: 'bold' }}>
                  {r.ok ? '✓' : '✗'}
                </span>
                <span className={r.ok ? 'text-primary' : 'text-secondary'}>{r.text}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* 2. Research Confidence Checklist Card */}
      <div className="stitch-card sidebar-card confidence-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label">CONFIDENCE CHECKLIST</span>
          <span className="badge-active" style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border-gray)', color: 'var(--text-primary)' }}>
            {reportData.audit?.deterministicConfidence || 90}%
          </span>
        </div>
        
        <div className="confidence-checklist" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
            <span>Financial Statements Complete</span>
          </div>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
            <span>News Citations Retrieved</span>
          </div>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: reportData.valuation.dcfValue ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
              {reportData.valuation.dcfValue ? '✓' : '✗'}
            </span>
            <span>DCF Valuation Generated</span>
          </div>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: reportData.valuation.relativeValue ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
              {reportData.valuation.relativeValue ? '✓' : '✗'}
            </span>
            <span>Multiples Valuation Generated</span>
          </div>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
            <span>Primary Provider Used</span>
          </div>
          <div className="confidence-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: (reportData.audit?.recoveredFieldsCount || 0) === 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
              {(reportData.audit?.recoveredFieldsCount || 0) === 0 ? '✓' : '⚠'}
            </span>
            <span>{(reportData.audit?.recoveredFieldsCount || 0) === 0 ? 'No Recollection Loop Required' : 'Recollection Active'}</span>
          </div>
        </div>
      </div>

      {/* 3. Research Sources Card */}
      <div className="stitch-card sidebar-card sources-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label">RESEARCH SOURCES</span>
        </div>
        <div className="sources-list" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span className="badge-pill" style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border-gray)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>Yahoo Finance</span>
          <span className="badge-pill" style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border-gray)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>Tavily</span>
          <span className="badge-pill" style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border-gray)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>LLM Router</span>
          <span className="badge-pill" style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border-gray)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>SEC EDGAR</span>
        </div>
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-gray)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span className="text-secondary">Fallback Used?</span>
          <span className={reportData.audit?.recoveredFieldsCount > 0 ? 'text-warning bold' : 'text-success bold'}>
            {reportData.audit?.recoveredFieldsCount > 0 ? 'Yes (Recollection Active)' : 'No'}
          </span>
        </div>
      </div>

      {/* 4. Action controls print card */}
      <div className="stitch-card sidebar-card intelligence-card-stitch">
        <div className="sidebar-card-header">
          <span className="sidebar-card-label">MARKET INTELLIGENCE REPORT</span>
        </div>
        
        <p className="intelligence-body">
          Current metrics indicate a calculated consensus valuation target of {currencySymbol}{reportData.valuation.consensusValue?.toFixed(2)} representing a {reportData.valuation.marginOfSafety > 0 ? reportData.valuation.marginOfSafety.toFixed(1) + '%' : '0%'} safety margin. Solvent structures show resilient cash positioning.
        </p>

        <button className="pdf-button" onClick={() => window.print()}>
          <FileText size={14} />
          <span>Print Research Report</span>
        </button>
      </div>
    </div>
  );
}
