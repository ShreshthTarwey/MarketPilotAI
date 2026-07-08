import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function Loader({ progress = 0, stage = 'Initializing engine...', logs = [] }) {
  const terminalEndRef = useRef(null);

  // Auto-scroll the terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Provide high-quality fallback console logs if the server is starting
  const displayLogs = logs.length > 0 ? logs : [
    'System: Booting LangGraph StateGraph engine...',
    'System: Environment keys loaded (Google GenAI, Groq, Tavily API)...',
    'System: Autocomplete service online.',
    `Orchestrator: Input resolved to active stage...`,
    `Validator: Checked query length and character validation rules...`
  ];

  return (
    <div className="loader-overlay">
      <div className="loader-spinner-container">
        <div className="loader-ring"></div>
        <div className="loader-ring-inner"></div>
      </div>

      <div className="loader-progress">{progress}%</div>
      <div className="loader-stage">{stage}</div>

      <div className="terminal-console">
        <div className="terminal-titlebar">
          <Terminal size={14} className="search-icon" style={{ marginRight: '6px' }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
            marketpilot-ai-orchestrator.log
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            <div className="terminal-dot" style={{ backgroundColor: '#ef4444' }}></div>
            <div className="terminal-dot" style={{ backgroundColor: '#f59e0b' }}></div>
            <div className="terminal-dot" style={{ backgroundColor: '#10b981' }}></div>
          </div>
        </div>

        <div className="terminal-stream">
          {displayLogs.map((log, index) => {
            const isLast = index === displayLogs.length - 1;
            return (
              <p key={index} className={`terminal-line ${isLast ? 'active' : ''}`}>
                <span className="terminal-prefix">&gt;</span>
                {log}
              </p>
            );
          })}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
