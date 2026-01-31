import { useEffect, useState, useRef } from 'react';

// Types for dashboard content - these map to API content keys
interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  high: number;
  low: number;
}

interface PortfolioStats {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  beta: number;
  alpha: number;
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relevance: number;
}

interface QuarterlyMetric {
  label: string;
  value: string;
  change: number;
  trend: number[];
}

interface DashboardContent {
  stockPrices: StockData[];
  portfolioStats: PortfolioStats;
  newsSummary: NewsItem[];
  quarterlyMetrics: QuarterlyMetric[];
  lastUpdated: string;
}

// Default data for initial render
const defaultContent: DashboardContent = {
  stockPrices: [
    { symbol: 'AAPL', price: 178.72, change: 2.34, changePercent: 1.33, volume: '52.3M', high: 179.89, low: 176.21 },
    { symbol: 'MSFT', price: 378.91, change: -1.23, changePercent: -0.32, volume: '18.7M', high: 381.20, low: 377.45 },
    { symbol: 'GOOGL', price: 141.80, change: 3.45, changePercent: 2.49, volume: '24.1M', high: 142.50, low: 138.90 },
    { symbol: 'NVDA', price: 875.28, change: 12.67, changePercent: 1.47, volume: '41.2M', high: 882.00, low: 860.15 },
    { symbol: 'AMZN', price: 178.25, change: -0.89, changePercent: -0.50, volume: '31.8M', high: 180.10, low: 177.30 },
    { symbol: 'META', price: 505.95, change: 8.23, changePercent: 1.65, volume: '12.4M', high: 508.70, low: 497.80 },
  ],
  portfolioStats: {
    totalValue: 2847293.45,
    dayChange: 34521.89,
    dayChangePercent: 1.23,
    totalReturn: 847293.45,
    totalReturnPercent: 42.36,
    sharpeRatio: 1.87,
    beta: 1.12,
    alpha: 3.24,
  },
  newsSummary: [
    {
      id: '1',
      headline: 'Fed Signals Potential Rate Cuts in Q2 2024',
      summary: 'Federal Reserve Chair indicates monetary policy shift as inflation shows signs of cooling. Markets respond positively to dovish commentary.',
      source: 'Reuters',
      timestamp: '2 min ago',
      sentiment: 'bullish',
      relevance: 98,
    },
    {
      id: '2',
      headline: 'NVIDIA Reports Record Data Center Revenue',
      summary: 'AI chip demand continues to surge as enterprise adoption accelerates. Revenue beats estimates by 12%.',
      source: 'Bloomberg',
      timestamp: '15 min ago',
      sentiment: 'bullish',
      relevance: 95,
    },
    {
      id: '3',
      headline: 'European Markets Face Headwinds Amid ECB Policy',
      summary: 'Uncertainty in eurozone monetary policy creates volatility. Analysts recommend defensive positioning.',
      source: 'FT',
      timestamp: '32 min ago',
      sentiment: 'bearish',
      relevance: 72,
    },
  ],
  quarterlyMetrics: [
    { label: 'Revenue', value: '$24.8B', change: 12.4, trend: [18, 20, 19, 22, 24, 24.8] },
    { label: 'EBITDA', value: '$8.2B', change: 8.7, trend: [6.5, 7.0, 7.2, 7.5, 7.8, 8.2] },
    { label: 'Net Income', value: '$5.1B', change: 15.2, trend: [3.8, 4.0, 4.2, 4.5, 4.8, 5.1] },
    { label: 'EPS', value: '$4.28', change: 18.9, trend: [3.2, 3.4, 3.5, 3.8, 4.0, 4.28] },
  ],
  lastUpdated: new Date().toISOString(),
};

// Mini sparkline chart component
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        fill={`url(#gradient-${color})`}
        points={`0,${height} ${points} 100,${height}`}
      />
    </svg>
  );
}

// Animated number component
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// Stock ticker row component
function StockRow({ stock, index }: { stock: StockData; index: number }) {
  const isPositive = stock.change >= 0;

  return (
    <div
      className="grid grid-cols-[80px_1fr_80px_100px_80px] gap-4 items-center py-3 px-4 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="font-mono font-semibold text-[#00ff88]">{stock.symbol}</div>
      <div className="flex items-center gap-3">
        <span className="text-white font-semibold tabular-nums">${stock.price.toFixed(2)}</span>
        <span className="text-xs text-white/40">H: {stock.high.toFixed(2)} L: {stock.low.toFixed(2)}</span>
      </div>
      <div className={`text-right font-mono text-sm ${isPositive ? 'text-[#00ff88]' : 'text-[#ff4757]'}`}>
        {isPositive ? '+' : ''}{stock.change.toFixed(2)}
      </div>
      <div className={`text-right font-mono text-sm px-2 py-1 rounded ${isPositive ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#ff4757]/10 text-[#ff4757]'}`}>
        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </div>
      <div className="text-right text-white/50 text-sm font-mono">{stock.volume}</div>
    </div>
  );
}

// News card component
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const sentimentColors = {
    bullish: { bg: 'bg-[#00ff88]/10', text: 'text-[#00ff88]', border: 'border-[#00ff88]/20' },
    bearish: { bg: 'bg-[#ff4757]/10', text: 'text-[#ff4757]', border: 'border-[#ff4757]/20' },
    neutral: { bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10' },
  };

  const colors = sentimentColors[item.sentiment];

  return (
    <div
      className={`p-4 rounded-lg border ${colors.border} bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
          {item.sentiment}
        </span>
        <span className="text-[10px] text-white/30 font-mono">{item.timestamp}</span>
      </div>
      <h4 className="text-sm font-semibold text-white mb-2 leading-snug group-hover:text-[#00d4ff] transition-colors">
        {item.headline}
      </h4>
      <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{item.summary}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
        <span className="text-[10px] text-white/30 font-medium">{item.source}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/30">Relevance</span>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full"
              style={{ width: `${item.relevance}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric card component
function MetricCard({ metric, index }: { metric: QuarterlyMetric; index: number }) {
  const isPositive = metric.change >= 0;

  return (
    <div
      className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">{metric.label}</span>
        <span className={`text-xs font-mono ${isPositive ? 'text-[#00ff88]' : 'text-[#ff4757]'}`}>
          {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-3 font-mono">{metric.value}</div>
      <Sparkline data={metric.trend} color={isPositive ? '#00ff88' : '#ff4757'} height={24} />
    </div>
  );
}

// Toast notification component - Top right, simple "NEW UPDATE!"
function Toast({ message, isVisible, onClose }: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  updatedSections?: string[];
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 30000); // 30 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-4 duration-300">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[#00ff88] rounded-xl blur-xl opacity-40 animate-pulse" />

        {/* Toast card */}
        <div className="relative flex items-center gap-4 px-6 py-4 rounded-xl bg-[#0a1a0f] border-2 border-[#00ff88] shadow-[0_0_30px_rgba(0,255,136,0.4)]">
          {/* Pulsing dot */}
          <div className="relative">
            <div className="absolute inset-0 w-3 h-3 bg-[#00ff88] rounded-full animate-ping" />
            <div className="relative w-3 h-3 bg-[#00ff88] rounded-full" />
          </div>

          {/* Text */}
          <div className="text-lg font-bold text-[#00ff88] tracking-wide">
            🚀 NEW UPDATE!
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-2 text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export function Dashboard() {
  const [content, setContent] = useState<DashboardContent>(defaultContent);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [updatedSections, setUpdatedSections] = useState<string[]>([]);
  const isFirstLoad = useRef(true);
  const prevContentRef = useRef(content);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Dashboard connected to WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'DASHBOARD_UPDATE' && message.payload) {
          const payload = message.payload;
          const prev = prevContentRef.current;

          // Detect what sections changed
          const sections: string[] = [];
          if (payload.newsSummary && JSON.stringify(payload.newsSummary) !== JSON.stringify(prev.newsSummary)) {
            sections.push('News');
          }
          if (payload.quarterlyMetrics && JSON.stringify(payload.quarterlyMetrics) !== JSON.stringify(prev.quarterlyMetrics)) {
            sections.push('Metrics');
          }
          if (payload.stockPrices && JSON.stringify(payload.stockPrices) !== JSON.stringify(prev.stockPrices)) {
            sections.push('Stocks');
          }
          if (payload.portfolioStats && JSON.stringify(payload.portfolioStats) !== JSON.stringify(prev.portfolioStats)) {
            sections.push('Portfolio');
          }

          setContent(prevContent => {
            const newContent = { ...prevContent, ...payload };
            prevContentRef.current = newContent;
            return newContent;
          });
          setLastUpdate(new Date());

          // ALWAYS show toast on updates
          console.log('📢 DASHBOARD UPDATE RECEIVED - showing toast!');
          setUpdatedSections(sections.length > 0 ? sections : ['Data']);
          setToastMessage('NEW DATA AVAILABLE');
          setShowToast(true);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => ws.close();
  }, []);

  const { stockPrices, portfolioStats, newsSummary, quarterlyMetrics } = content;

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white overflow-x-hidden">
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        updatedSections={updatedSections}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00d4ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#00ff88]/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#0a0b0e]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo & Title */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#00ff88] flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 9l-5-6-4 8-3-3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight">MERIDIAN</h1>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Analytics Terminal</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-white/10" />

                <nav className="flex items-center gap-1">
                  {['Overview', 'Portfolio', 'Research', 'Alerts'].map((item, i) => (
                    <button
                      key={item}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${i === 0 ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right side - Status & Time */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff88] animate-pulse' : 'bg-[#ff4757]'}`} />
                    <span className="text-white/50 font-mono">{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
                  </div>
                  <div className="text-white/30">|</div>
                  <span className="text-white/50 font-mono">
                    {lastUpdate.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>

                <button className="px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-black text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1800px] mx-auto px-6 py-6">
          {/* Portfolio Stats Banner */}
          <section id="portfolioStats" className="mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {/* Total Value - Larger */}
              <div className="col-span-2 p-5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">Total Portfolio Value</div>
                <div className="text-3xl font-bold text-white font-mono">
                  <AnimatedNumber value={portfolioStats.totalValue} prefix="$" decimals={2} />
                </div>
                <div className={`text-sm mt-2 font-mono ${portfolioStats.dayChangePercent >= 0 ? 'text-[#00ff88]' : 'text-[#ff4757]'}`}>
                  {portfolioStats.dayChangePercent >= 0 ? '+' : ''}${portfolioStats.dayChange.toLocaleString()} ({portfolioStats.dayChangePercent >= 0 ? '+' : ''}{portfolioStats.dayChangePercent.toFixed(2)}%) today
                </div>
              </div>

              {/* Other Stats */}
              {[
                { label: 'Total Return', value: portfolioStats.totalReturn, percent: portfolioStats.totalReturnPercent, prefix: '$' },
                { label: 'Sharpe Ratio', value: portfolioStats.sharpeRatio, suffix: '', decimals: 2 },
                { label: 'Beta', value: portfolioStats.beta, suffix: '', decimals: 2 },
                { label: 'Alpha', value: portfolioStats.alpha, suffix: '%', decimals: 2 },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{stat.label}</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {stat.prefix && stat.prefix}
                    <AnimatedNumber value={stat.value} decimals={stat.decimals ?? 2} />
                    {stat.suffix}
                  </div>
                  {stat.percent !== undefined && (
                    <div className={`text-xs mt-1 ${stat.percent >= 0 ? 'text-[#00ff88]' : 'text-[#ff4757]'}`}>
                      {stat.percent >= 0 ? '+' : ''}{stat.percent.toFixed(2)}%
                    </div>
                  )}
                </div>
              ))}

              {/* Mini Chart */}
              <div className="col-span-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">30-Day Performance</div>
                <Sparkline
                  data={[2.1, 2.3, 2.2, 2.5, 2.4, 2.6, 2.8, 2.7, 2.9, 2.8, 3.0, 3.1]}
                  color="#00ff88"
                  height={48}
                />
              </div>
            </div>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Stock Prices - Left Column */}
            <section id="stockPrices" className="col-span-12 lg:col-span-7">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Market Watch</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10 transition-colors">Watchlist</button>
                    <button className="px-3 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10 transition-colors">All Positions</button>
                  </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[80px_1fr_80px_100px_80px] gap-4 px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                  <div>Symbol</div>
                  <div>Price</div>
                  <div className="text-right">Change</div>
                  <div className="text-right">% Change</div>
                  <div className="text-right">Volume</div>
                </div>

                {/* Stock Rows */}
                <div className="max-h-[400px] overflow-y-auto">
                  {stockPrices.map((stock, index) => (
                    <StockRow key={stock.symbol} stock={stock} index={index} />
                  ))}
                </div>
              </div>
            </section>

            {/* Quarterly Metrics - Right Column */}
            <section id="quarterlyMetrics" className="col-span-12 lg:col-span-5">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Quarterly Metrics</h2>
                    <span className="px-2 py-0.5 text-[10px] bg-[#00d4ff]/10 text-[#00d4ff] rounded">Q4 2024</span>
                  </div>
                  <button className="text-xs text-white/40 hover:text-white transition-colors">View Full Report</button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  {quarterlyMetrics.map((metric, index) => (
                    <MetricCard key={metric.label} metric={metric} index={index} />
                  ))}
                </div>
              </div>
            </section>

            {/* News & Research - Full Width */}
            <section id="newsSummary" className="col-span-12">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Market Intelligence</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {['All', 'Bullish', 'Bearish'].map((filter, i) => (
                        <button
                          key={filter}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${i === 0 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <button className="text-xs text-white/40 hover:text-white transition-colors">See All News</button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsSummary.map((item, index) => (
                    <NewsCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              </div>
            </section>

            {/* Chart Area */}
            <section id="chartArea" className="col-span-12">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Performance Chart</h2>
                    <div className="flex items-center gap-1">
                      {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((period, i) => (
                        <button
                          key={period}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${i === 2 ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-1 bg-[#00d4ff] rounded" />
                      <span className="text-white/50">Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-1 bg-white/30 rounded" />
                      <span className="text-white/50">S&P 500</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 h-[300px] flex items-center justify-center">
                  {/* Placeholder for actual chart - would use recharts or similar */}
                  <div className="w-full h-full relative">
                    <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <line key={i} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="rgba(255,255,255,0.04)" />
                      ))}

                      {/* S&P 500 line */}
                      <path
                        d="M0,150 Q100,140 200,135 T400,120 T600,100 T800,90"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                      />

                      {/* Portfolio line with gradient */}
                      <defs>
                        <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,160 Q50,155 100,150 T200,130 T300,125 T400,100 T500,85 T600,70 T700,60 T800,40"
                        fill="url(#portfolioGradient)"
                        stroke="#00d4ff"
                        strokeWidth="2"
                      />

                      {/* Current value indicator */}
                      <circle cx="800" cy="40" r="4" fill="#00d4ff" />
                      <circle cx="800" cy="40" r="8" fill="#00d4ff" opacity="0.3">
                        <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </svg>

                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-white/30 font-mono -translate-x-8">
                      <span>+50%</span>
                      <span>+25%</span>
                      <span>0%</span>
                      <span>-25%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] mt-8">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between text-xs text-white/30">
              <div className="flex items-center gap-6">
                <span>Powered by FlowForge AI</span>
                <span>|</span>
                <span>Data refreshed automatically via workflow</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Market data delayed 15 min</span>
                <span>|</span>
                <span>Last workflow run: {new Date(content.lastUpdated).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
