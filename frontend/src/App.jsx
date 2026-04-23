import { useState, useEffect, createContext, useContext, useRef } from 'react';
import axios from 'axios';
import {
  Shield, ShieldAlert, ShieldCheck, Activity, Search,
  History as HistoryIcon, BarChart3, Settings, Menu, X,
  Sun, Moon, ScanLine, Server, Database, Users,
  LogOut, LogIn, UserPlus, Lock, Mail, FileText, Globe, AlertTriangle,
  MessageSquare, Send
} from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/* ---- Theme Context ---- */
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('phishguard-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('phishguard-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() { return useContext(ThemeContext); }

/* ---- Main App ---- */
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [emailContent, setEmailContent] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [liveUrl, setLiveUrl] = useState('');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [activePage, setActivePage] = useState('scan');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('phishguard-user')) || null;
    } catch { return null; }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('phishguard-user', JSON.stringify(userData));
    setActivePage('scan');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('phishguard-user');
    setActivePage('scan');
  };

  useEffect(() => {
    if (user && user.access_token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.access_token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  // Store all scan results locally for analytics
  const [allScans, setAllScans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('phishguard-scans') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('phishguard-scans', JSON.stringify(allScans));
  }, [allScans]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`);
      if (Array.isArray(res.data)) setHistory(res.data);
      else setHistory(allScans.slice(0, 20));
    } catch {
      setHistory(allScans.slice(0, 20));
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/stats`);
      if (!res.data.error) { setStats(res.data); return; }
    } catch { /* fallback below */ }
    // Build stats from local scans
    const total = allScans.length;
    const phishing = allScans.filter(s => s.status === 'Phishing').length;
    const suspicious = allScans.filter(s => s.status === 'Suspicious').length;
    const safe = allScans.filter(s => s.status === 'Safe').length;
    setStats({
      total_scans: total, phishing_count: phishing,
      suspicious_count: suspicious, safe_count: safe,
      phishing_percentage: total ? Math.round((phishing / total) * 100) : 0
    });
  };

  useEffect(() => {
    if (activePage === 'history') fetchHistory();
    if (activePage === 'analytics' || activePage === 'admin') { fetchStats(); fetchHistory(); }
  }, [activePage]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/scan`, { url });
      setResult(res.data);
      if (res.data && !res.data.error) {
        setAllScans(prev => [{ ...res.data, timestamp: new Date().toISOString(), type: 'url' }, ...prev].slice(0, 100));
      }
    } catch {
      setResult({ error: "Failed to scan URL. Please check the backend server.", status: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailScan = async (e) => {
    e.preventDefault();
    if (!emailContent) return;
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/scan-email`, { content: emailContent });
      setEmailResult(res.data);
      if (res.data && !res.data.error) {
        const snippet = emailContent.length > 50 ? emailContent.substring(0, 50) + '...' : emailContent;
        setAllScans(prev => [{ 
          ...res.data, 
          url: snippet, 
          timestamp: new Date().toISOString(), 
          type: 'email' 
        }, ...prev].slice(0, 100));
      }
    } catch {
      setEmailResult({ error: "Failed to scan email content. Please check the backend server.", status: "Error" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLiveScan = async (e) => {
    e.preventDefault();
    if (!liveUrl) return;
    setLiveLoading(true);
    setLiveResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/scan-live`, { url: liveUrl });
      setLiveResult(res.data);
      if (res.data && !res.data.error) {
        setAllScans(prev => [{ 
          ...res.data, 
          timestamp: new Date().toISOString(), 
          type: 'live' 
        }, ...prev].slice(0, 100));
      }
    } catch {
      setLiveResult({ error: "Failed to perform live scan. Please check the backend server.", status: "Error" });
    } finally {
      setLiveLoading(false);
    }
  };

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        activePage={activePage}
        onNavigate={navigate}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Hamburger */}
      <button className="hamburger" onClick={() => setSidebarOpen(true)} id="menu-toggle">
        <Menu />
      </button>

      {/* Main */}
      <div className="app-main">
        <div className="bg-blob bg-blob--blue" />
        <div className="bg-blob bg-blob--purple" />

        <header className="header">
          <div className="header__brand">
            <img src="/logo.png" alt="PhishGuard" className="header__logo" />
            <h1 className="header__title">PhishGuard</h1>
          </div>
        </header>

        <main className="main-content">
          {activePage === 'scan' && (
            <>
              <section className="hero-card glass-panel">
                <h2 className="hero-card__title">Is this link safe?</h2>
                <p className="hero-card__subtitle">
                  Enter a URL below to analyze it using our machine learning detection engine.
                  We check for deceptive patterns and known phishing indicators.
                </p>
                <form onSubmit={handleScan} className="search-form">
                  <Search className="search-form__icon" />
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com" className="search-form__input" id="url-input" />
                  <button type="submit" disabled={loading || !url} className="search-form__btn" id="analyze-btn">
                    {loading ? <Activity className="spinner" style={{ width: 20, height: 20 }} /> : <span>Analyze URL</span>}
                  </button>
                </form>
              </section>
              {result && <ResultCard result={result} />}
            </>
          )}

          {activePage === 'live-scan' && (
            <>
              <section className="hero-card glass-panel">
                <h2 className="hero-card__title">Live Website Scan</h2>
                <p className="hero-card__subtitle">
                  Analyze the real-time content of a website. We fetch the page to detect 
                  deceptive forms, malicious redirects, and hidden phishing signals.
                </p>
                <form onSubmit={handleLiveScan} className="search-form">
                  <Globe className="search-form__icon" />
                  <input type="text" value={liveUrl} onChange={e => setLiveUrl(e.target.value)}
                    placeholder="https://example.com" className="search-form__input" id="live-url-input" />
                  <button type="submit" disabled={liveLoading || !liveUrl} className="search-form__btn" id="live-analyze-btn">
                    {liveLoading ? <Activity className="spinner" style={{ width: 20, height: 20 }} /> : <span>Live Scan</span>}
                  </button>
                </form>
              </section>
              {liveResult && (
                <div style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
                  {liveResult.live_data?.has_sensitive_form && (
                    <div className="glass-panel" style={{ 
                      marginBottom: '1.5rem', 
                      padding: '1.25rem', 
                      borderRadius: 'var(--radius-lg)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      color: 'var(--color-danger)'
                    }}>
                      <AlertTriangle size={24} />
                      <strong style={{ fontSize: '1.1rem' }}>⚠️ This page is trying to collect sensitive info</strong>
                    </div>
                  )}
                  <ResultCard result={liveResult} />
                </div>
              )}
            </>
          )}

          {activePage === 'email-scan' && (
            <>
              <section className="hero-card glass-panel">
                <h2 className="hero-card__title">Scan Phishing Emails</h2>
                <p className="hero-card__subtitle">
                  Paste the content of a suspicious email below. We'll analyze the text for 
                  urgency, deceptive links, and common phishing tactics.
                </p>
                <form onSubmit={handleEmailScan} style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <FileText size={20} style={{ position: 'absolute', left: '20px', top: '20px', color: 'var(--text-muted)' }} />
                    <textarea 
                      value={emailContent} 
                      onChange={e => setEmailContent(e.target.value)}
                      placeholder="Paste email content here..." 
                      id="email-input"
                      style={{ 
                        width: '100%', 
                        minHeight: '240px', 
                        padding: '20px 20px 20px 52px', 
                        borderRadius: 'var(--radius-lg)', 
                        background: 'var(--bg-input)', 
                        border: '1px solid var(--border-subtle)', 
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        outline: 'none',
                        resize: 'vertical',
                        transition: 'all var(--transition-normal)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.4)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1), 0 0 0 3px rgba(59,130,246,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)'; }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={emailLoading || !emailContent} 
                    className="search-form__btn" 
                    id="analyze-email-btn" 
                    style={{ 
                      position: 'relative', 
                      right: 'auto', 
                      top: 'auto', 
                      bottom: 'auto', 
                      height: '54px', 
                      width: 'fit-content', 
                      minWidth: '240px',
                      alignSelf: 'center',
                      justifyContent: 'center', 
                      margin: '0 auto',
                      borderRadius: 'var(--radius-full)',
                      padding: '0 32px'
                    }}
                  >
                    {emailLoading ? <Activity className="spinner" style={{ width: 20, height: 20 }} /> : (
                      <>
                        <Shield size={20} />
                        <span>Analyze Email Content</span>
                      </>
                    )}
                  </button>
                </form>
              </section>
              {emailResult && <ResultCard result={emailResult} />}
            </>
          )}

          {activePage === 'report' && <ReportTab />}
          {activePage === 'history' && <HistoryTab history={history} localScans={allScans} />}
          {activePage === 'analytics' && <AnalyticsTab stats={stats} scans={allScans} />}
          {activePage === 'admin' && (user?.role === 'admin' ? <AdminTab stats={stats} scans={allScans} /> : <div className="error-card glass-panel" style={{maxWidth: '500px', margin: '2rem auto'}}><ShieldAlert size={48} style={{color: 'var(--color-danger)', marginBottom: '1rem'}}/><h3>Access Denied</h3><p style={{marginTop: '0.5rem', color: 'var(--text-muted)'}}>You must be an administrator to view this page. Please log in with admin credentials.</p></div>)}
          {activePage === 'settings' && <SettingsTab />}
          {activePage === 'auth' && <AuthTab onLogin={handleLogin} />}
        </main>

        <ChatAssistant />
        <Footer onNavigate={navigate} />
      </div>
    </div>
  );
}

/* ---- Sidebar Component ---- */
function Sidebar({ isOpen, activePage, onNavigate, onClose, user, onLogout }) {
  const items = [
    { id: 'scan', label: 'URL Scanner', icon: <ScanLine /> },
    { id: 'email-scan', label: 'Email Scanner', icon: <Mail /> },
    { id: 'live-scan', label: 'Live Scanner', icon: <Globe /> },
    { id: 'report', label: 'Report Phishing', icon: <AlertTriangle /> },
    { id: 'history', label: 'History', icon: <HistoryIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 /> },
  ];

  if (user?.role === 'admin') {
    items.push({ id: 'admin', label: 'Admin', icon: <Server /> });
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <img src="/logo.png" alt="PhishGuard" className="sidebar__logo-img" />
        <span className="sidebar__logo-text">PhishGuard</span>
        <button className="sidebar__close" onClick={onClose}><X /></button>
      </div>

      <nav className="sidebar__nav">
        {items.map(item => (
          <button key={item.id}
            className={`sidebar__item ${activePage === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onNavigate(item.id)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <div className="sidebar__divider" />
        <button
          className={`sidebar__item ${activePage === 'settings' ? 'sidebar__item--active' : ''}`}
          onClick={() => onNavigate('settings')}>
          <Settings />
          <span>Settings</span>
        </button>
        {user ? (
          <button className="sidebar__item text-danger" onClick={onLogout} style={{ color: 'var(--color-danger)' }}>
            <LogOut />
            <span>Logout ({user.username})</span>
          </button>
        ) : (
          <button
            className={`sidebar__item ${activePage === 'auth' ? 'sidebar__item--active' : ''}`}
            onClick={() => onNavigate('auth')}>
            <LogIn />
            <span>Login / Register</span>
          </button>
        )}
      </nav>
    </aside>
  );
}

/* ---- Result Card ---- */
function ResultCard({ result }) {
  if (result.error) {
    return (
      <div className="error-card glass-panel">
        <ShieldAlert />
        <h3 className="error-card__title">Error</h3>
        <p className="error-card__message">{result.error}</p>
      </div>
    );
  }

  const isPhishing = result.status === "Phishing";
  const isSuspicious = result.status === "Suspicious";
  const variant = isPhishing ? 'danger' : isSuspicious ? 'warn' : 'safe';

  return (
    <div className={`result-card glass-panel result-card--${variant}`}>
      <div className="result-card__header">
        <div className="result-card__info">
          <div className={`result-card__icon-wrap result-card__icon-wrap--${variant}`}>
            {isPhishing ? <ShieldAlert style={{ color: 'var(--color-danger)' }} />
              : isSuspicious ? <ShieldAlert style={{ color: 'var(--color-warn)' }} />
              : <ShieldCheck style={{ color: 'var(--color-safe)' }} />}
          </div>
          <div>
            <div className="result-card__label">Analysis Result</div>
            <div className={`result-card__status result-card__status--${variant}`}>{result.status}</div>
          </div>
        </div>
        <div className="risk-score">
          <span className="risk-score__label">Risk Score</span>
          <div className="risk-score__ring">
            <svg viewBox="0 0 96 96">
              <circle className="ring-bg" cx="48" cy="48" r="40" />
              <circle className={`ring-value ring-value--${variant}`} cx="48" cy="48" r="40"
                strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * result.risk_score) / 100} />
            </svg>
            <span className="risk-score__value">{result.risk_score}</span>
          </div>
        </div>
      </div>
      <div className="divider" />
      <div>
        <h4 className="explanation__title">Why did we flag this?</h4>
        <ul className="explanation__list">
          {result.explanation?.map((exp, idx) => (
            <li key={idx} className="explanation__item">
              <div className="explanation__dot" />
              <span className="explanation__text">{exp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---- History Tab ---- */
function HistoryTab({ history, localScans }) {
  const data = (Array.isArray(history) && history.length > 0) ? history : localScans;

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="history-card__empty glass-panel">
        <HistoryIcon />
        <h3>No History Yet</h3>
        <p>Scan a URL to see it appear here.</p>
      </div>
    );
  }

  const getVariant = (s) => s === 'Phishing' ? 'danger' : s === 'Suspicious' ? 'warn' : 'safe';

  return (
    <div className="history-card glass-panel">
      <h2 className="history-card__title">Scan History</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="history-table">
          <thead><tr><th>Type</th><th>Content/URL</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>
                  {item.type === 'email' ? <Mail size={16} /> : 
                   item.type === 'live' ? <Globe size={16} /> : 
                   <ScanLine size={16} />}
                </td>
                <td title={item.url}>{item.url}</td>
                <td><span className={`status-badge status-badge--${getVariant(item.status)}`}>{item.status}</span></td>
                <td>{item.risk_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Analytics Tab ---- */
function AnalyticsTab({ stats, scans }) {
  const s = stats || { total_scans: 0, phishing_count: 0, suspicious_count: 0, safe_count: 0, phishing_percentage: 0 };
  const total = s.total_scans || 1;
  const recent = (scans || []).slice(0, 5);
  const getVariant = (st) => st === 'Phishing' ? 'danger' : st === 'Suspicious' ? 'warn' : 'safe';

  // Unique domains
  const domains = new Map();
  (scans || []).forEach(scan => {
    if (scan.type === 'email') return; // Skip email scans for domain analytics
    try {
      const d = new URL(scan.url.startsWith('http') ? scan.url : 'http://' + scan.url).hostname;
      if (!domains.has(d)) domains.set(d, []);
      domains.get(d).push(scan);
    } catch { /* skip */ }
  });

  return (
    <>
      <h2 className="page-title">Analytics Dashboard</h2>
      <p className="page-subtitle">Overview of all scanned URLs and threat detection metrics.</p>

      <div className="analytics-grid">
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Total Scans</span>
          <span className="stat-card__value stat-card__value--blue">{s.total_scans}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Safe</span>
          <span className="stat-card__value stat-card__value--safe">{s.safe_count}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Suspicious</span>
          <span className="stat-card__value stat-card__value--warn">{s.suspicious_count}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Phishing</span>
          <span className="stat-card__value stat-card__value--danger">{s.phishing_count}</span>
        </div>
      </div>

      <div className="analytics-breakdown glass-panel">
        <h3 className="analytics-breakdown__title">Threat Breakdown</h3>
        <div className="bar-row">
          <span className="bar-row__label">Safe</span>
          <div className="bar-row__track">
            <div className="bar-row__fill bar-row__fill--safe" style={{ width: `${(s.safe_count / total) * 100}%` }} />
          </div>
          <span className="bar-row__count">{s.safe_count}</span>
        </div>
        <div className="bar-row">
          <span className="bar-row__label">Suspicious</span>
          <div className="bar-row__track">
            <div className="bar-row__fill bar-row__fill--warn" style={{ width: `${(s.suspicious_count / total) * 100}%` }} />
          </div>
          <span className="bar-row__count">{s.suspicious_count}</span>
        </div>
        <div className="bar-row">
          <span className="bar-row__label">Phishing</span>
          <div className="bar-row__track">
            <div className="bar-row__fill bar-row__fill--danger" style={{ width: `${(s.phishing_count / total) * 100}%` }} />
          </div>
          <span className="bar-row__count">{s.phishing_count}</span>
        </div>
      </div>

      {/* Unique Domains Scanned */}
      {domains.size > 0 && (
        <div className="recent-scans glass-panel">
          <h3 className="recent-scans__title">Unique Domains Scanned ({domains.size})</h3>
          {[...domains.entries()].slice(0, 8).map(([domain, domainScans]) => {
            const worst = domainScans.find(s => s.status === 'Phishing') || domainScans.find(s => s.status === 'Suspicious') || domainScans[0];
            return (
              <div key={domain} className="recent-scan-item">
                <span className="recent-scan-item__url">{domain}</span>
                <div className="recent-scan-item__meta">
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{domainScans.length} scan{domainScans.length > 1 ? 's' : ''}</span>
                  <span className={`status-badge status-badge--${getVariant(worst.status)}`}>{worst.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="recent-scans glass-panel">
          <h3 className="recent-scans__title">Recent Scans</h3>
          {recent.map((scan, i) => (
            <div key={i} className="recent-scan-item">
              <span className="recent-scan-item__url">{scan.url}</span>
              <div className="recent-scan-item__meta">
                <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{scan.risk_score}</span>
                <span className={`status-badge status-badge--${getVariant(scan.status)}`}>{scan.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- Admin Tab ---- */
function AdminTab({ stats, scans }) {
  const s = stats || { total_scans: 0, phishing_count: 0, suspicious_count: 0, safe_count: 0 };
  const recentThreats = (scans || []).filter(scan => scan.status === 'Phishing' || scan.status === 'Suspicious').slice(0, 5);

  const accuracy = s.total_scans > 0 ? (((s.phishing_count + s.safe_count) / s.total_scans) * 100).toFixed(1) : "96.8";

  // Mock data for weekly graph
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyData = [12, 19, 15, 25, 22, 14, 28];
  const maxData = Math.max(...dailyData);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoadingReports(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/admin/reports?status=pending`);
        setReports(res.data);
      } catch (e) {
        console.error("Failed to fetch reports");
      } finally {
        setLoadingReports(false);
      }
    };
    fetchReports();
  }, []);

  const handleReportAction = async (reportId, action) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/reports/${reportId}/action`, { action });
      setReports(reports.filter(r => r._id !== reportId));
    } catch (e) {
      console.error(e);
      alert("Failed to process action");
    }
  };

  return (
    <>
      <h2 className="page-title">Admin Dashboard</h2>
      <p className="page-subtitle">Real-time system overview and threat detection analytics.</p>

      {/* Main Stats Row */}
      <div className="analytics-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Total URLs Scanned</span>
          <span className="stat-card__value stat-card__value--blue">{s.total_scans}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Total Phishing Detected</span>
          <span className="stat-card__value stat-card__value--danger">{s.phishing_count}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Detection Accuracy</span>
          <span className="stat-card__value" style={{ color: 'var(--color-safe)' }}>{accuracy}%</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-card__label">Active Users</span>
          <span className="stat-card__value" style={{ color: 'var(--color-warn)' }}>24</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Weekly Detection Graph */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
            <BarChart3 size={20} style={{ color: 'var(--accent-blue)' }} /> Weekly Threat Detections
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', gap: '1rem', padding: '0 1rem' }}>
            {dailyData.map((val, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${(val / maxData) * 150}px`, 
                  background: 'linear-gradient(to top, var(--color-danger-dim), var(--color-danger))',
                  borderRadius: '6px 6px 0 0',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 600 }}>{val}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{days[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Reports */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-warn)' }} /> Pending User Reports
          </h3>
          {loadingReports ? (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}><Activity className="spinner" size={24} style={{margin: '0 auto'}}/></div>
          ) : reports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reports.map((report) => (
                <div key={report._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid var(--color-warn)` }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, wordBreak: 'break-all' }}>{report.url}</div>
                    {report.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>"{report.description}"</div>}
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ML Status: <strong style={{ color: report.ml_status === 'Phishing' ? 'var(--color-danger)' : 'inherit' }}>{report.ml_status}</strong> (Score: {report.ml_risk_score})</span>
                      <span style={{ color: 'var(--text-muted)' }}>Reported: {new Date(report.reported_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleReportAction(report._id, 'approve')} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-safe)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>Approve (Retrain)</button>
                    <button onClick={() => handleReportAction(report._id, 'reject')} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No pending user reports.</div>
          )}
        </div>

        {/* Live Feed: Recent Threats */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>
            <Activity size={20} style={{ color: 'var(--color-danger)' }} /> Recent Threats (Live Feed)
          </h3>
          {recentThreats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentThreats.map((threat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid var(--color-${threat.status === 'Phishing' ? 'danger' : 'warn'})` }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '1rem', flex: 1 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{threat.url}</span>
                  </div>
                  <span className={`status-badge status-badge--${threat.status === 'Phishing' ? 'danger' : 'warn'}`}>{threat.status}</span>
                </div>
              ))}
            </div>
          ) : (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent threats detected.</div>
          )}
        </div>

        {/* Existing System Status/Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>
              <Server size={20} style={{ color: 'var(--color-primary)' }} /> System Health
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>API Server</span>
              <span style={{ color: 'var(--color-safe)', fontWeight: 600 }}>Online</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Database</span>
              <span style={{ color: 'var(--color-safe)', fontWeight: 600 }}>Connected</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>ML Engine</span>
              <span style={{ color: 'var(--color-safe)', fontWeight: 600 }}>Active</span>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>
              <Database size={20} style={{ color: 'var(--color-warn)' }} /> Data Management
            </h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button style={{ padding: '0.5rem 1rem', flex: 1, backgroundColor: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('Clear logs functionality not implemented yet.')}>Clear Logs</button>
              <button style={{ padding: '0.5rem 1rem', flex: 1, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('Export functionality not implemented yet.')}>Export Data</button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ---- Report Tab ---- */
function ReportTab() {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post(`${API_BASE_URL}/report`, { url, description });
      setSuccess(true);
      setUrl('');
      setDescription('');
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="page-title">Report Phishing</h2>
      <p className="page-subtitle">Help us improve by reporting malicious links.</p>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-safe)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} />
            <span>Report submitted successfully! The admin will review it.</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Suspicious URL</label>
            <div className="search-form" style={{ padding: '0 1rem', background: 'var(--bg-elevated)', marginTop: 0 }}>
              <AlertTriangle size={18} className="search-form__icon" />
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} required className="search-form__input" style={{ paddingRight: '1rem' }} placeholder="https://suspicious-link.com" />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Why is this suspicious?" 
              style={{ 
                width: '100%', 
                minHeight: '100px', 
                padding: '1rem', 
                borderRadius: '1rem', 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color var(--transition-normal)'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          <button type="submit" disabled={loading || !url} style={{ marginTop: '0.5rem', width: '100%', height: '54px', background: 'linear-gradient(135deg, var(--color-danger), #b91c1c)', color: '#fff', border: 'none', borderRadius: '999px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-normal)' }}>
            {loading ? <Activity className="spinner" size={20} /> : <span>Submit Report</span>}
          </button>
        </form>
      </div>
    </>
  );
}

/* ---- Settings Tab ---- */
function SettingsTab() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-subtitle">Customize your PhishGuard experience.</p>

      <div className="settings-card glass-panel">
        <h3 className="settings-card__title">Appearance</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__label">
              {theme === 'dark' ? <Moon style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> : <Sun style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />}
              Theme
            </span>
            <span className="settings-row__desc">
              Switch between dark and light mode. Currently: <strong>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
            </span>
          </div>
          <label className="theme-switch" id="theme-toggle">
            <input type="checkbox" checked={theme === 'light'} onChange={toggleTheme} />
            <span className="theme-switch__slider" />
          </label>
        </div>
      </div>

      <div className="settings-card glass-panel">
        <h3 className="settings-card__title">About</h3>
        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__label">PhishGuard v1.0</span>
            <span className="settings-row__desc">
              AI-powered phishing URL detection system. Built with FastAPI, scikit-learn, and React.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- Footer ---- */
function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__brand-row">
            <img src="/logo.png" alt="PhishGuard" className="footer__logo-img" />
            <span className="footer__brand-name">PhishGuard</span>
          </div>
          <p className="footer__brand-desc">
            AI-powered phishing detection platform. Protecting users from malicious URLs with machine learning and real-time threat analysis.
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <span className="footer__col-title">Product</span>
            <button className="footer__link" onClick={() => onNavigate('scan')}>URL Scanner</button>
            <button className="footer__link" onClick={() => onNavigate('email-scan')}>Email Scanner</button>
            <button className="footer__link" onClick={() => onNavigate('live-scan')}>Live Website Scan</button>
            <button className="footer__link" onClick={() => onNavigate('analytics')}>Analytics</button>
            <button className="footer__link" onClick={() => onNavigate('history')}>Scan History</button>
            <button className="footer__link" onClick={() => onNavigate('settings')}>Settings</button>
          </div>
          <div className="footer__col">
            <span className="footer__col-title">Resources</span>
            <a className="footer__link" href="https://fastapi.tiangolo.com" target="_blank" rel="noreferrer">FastAPI Docs</a>
            <a className="footer__link" href="https://scikit-learn.org" target="_blank" rel="noreferrer">scikit-learn</a>
            <a className="footer__link" href="https://react.dev" target="_blank" rel="noreferrer">React Docs</a>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copy">&copy; {new Date().getFullYear()} PhishGuard. All rights reserved.</span>
        <div className="footer__badges">
          <span className="footer__badge">FastAPI</span>
          <span className="footer__badge">scikit-learn</span>
          <span className="footer__badge">React</span>
          <span className="footer__badge">Vite</span>
        </div>
      </div>
    </footer>
  );
}

/* ---- Auth Tab ---- */
function AuthTab({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { username, password } : { username, password, role, admin_secret: adminSecret };
      
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      
      if (isLogin) {
        onLogin(res.data);
      } else {
        // Auto login after register
        const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
        onLogin(loginRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="page-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      <p className="page-subtitle">
        {isLogin ? 'Sign in to access your history and dashboard.' : 'Register to save your scans and view analytics.'}
      </p>

      <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Username</label>
            <div className="search-form" style={{ padding: '0 1rem', background: 'var(--bg-elevated)', marginTop: 0 }}>
              <Users size={18} className="search-form__icon" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="search-form__input" style={{ paddingRight: '1rem' }} placeholder="Enter username" />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
            <div className="search-form" style={{ padding: '0 1rem', background: 'var(--bg-elevated)', marginTop: 0 }}>
              <Lock size={18} className="search-form__icon" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="search-form__input" style={{ paddingRight: '1rem' }} placeholder="Enter password" />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Account Type</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="search-form__input" style={{ width: '100%', padding: '0 1rem', borderRadius: '999px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}>
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          {!isLogin && role === 'admin' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Admin Secret Code</label>
              <div className="search-form" style={{ padding: '0 1rem', background: 'var(--bg-elevated)', marginTop: 0 }}>
                <Shield size={18} className="search-form__icon" />
                <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required className="search-form__input" style={{ paddingRight: '1rem' }} placeholder="Enter admin secret" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !username || !password} style={{ marginTop: '0.5rem', width: '100%', height: '54px', background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)', color: '#fff', border: 'none', borderRadius: '999px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-normal)' }}>
            {loading ? <Activity className="spinner" size={20} /> : <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---- Chat Assistant Component ---- */
function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: "Hello! I'm PhishGuard AI. How can I help you with your cybersecurity today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/chat`, { 
        message: message,
        history: chatHistory 
      });
      setChatHistory(prev => [...prev, { role: 'assistant', text: res.data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chat-assistant ${isOpen ? 'chat-assistant--open' : ''}`}>
      {isOpen ? (
        <div className="chat-window glass-panel">
          <div className="chat-window__header">
            <div className="chat-window__title">
              <div className="chat-window__status-dot" />
              <span>PhishGuard AI</span>
            </div>
            <button className="chat-window__close" onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="chat-window__messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble chat-bubble--assistant">
                <Activity className="spinner" size={14} /> thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-window__input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              value={message} 
              onChange={e => setMessage(e.target.value)}
              placeholder="Ask anything..." 
              className="chat-window__input"
            />
            <button type="submit" disabled={loading || !message.trim()} className="chat-window__send">
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
          <span className="chat-toggle-btn__badge">AI</span>
        </button>
      )}
    </div>
  );
}

export default App;
