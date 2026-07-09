import { Workflow, Sun, Moon } from 'lucide-react';

export default function Navbar({ setReportData, isDark, setIsDark }) {
  return (
    <header className="nav-container">
      <div className="nav-logo" onClick={() => setReportData(null)} style={{ cursor: 'pointer' }}>
        <Workflow size={18} style={{ strokeWidth: 2.5 }} />
        <span>MARKETPILOT AI</span>
      </div>
      <nav className="nav-links">
        <a href="#how-it-works">Flow</a>
        <a href="#why-platform">Architecture</a>
        <a href="https://github.com/ShreshthTarwey/MarketPilotAI" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
          GitHub
        </a>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          type="button" 
          className="theme-toggle-btn"
          onClick={() => setIsDark(!isDark)}
          title="Toggle light/dark theme"
          style={{ padding: '6px 12px', height: '32px' }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
        <button className="btn-primary" onClick={() => setReportData(null)} style={{ height: '32px', display: 'flex', alignItems: 'center' }}>Reset View</button>
      </div>
    </header>
  );
}
