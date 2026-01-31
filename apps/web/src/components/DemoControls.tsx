import { useState } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

// Popular stock presets
const STOCK_PRESETS = [
  { ticker: 'NVDA', company: 'NVIDIA' },
  { ticker: 'AAPL', company: 'Apple' },
  { ticker: 'TSLA', company: 'Tesla' },
  { ticker: 'GOOGL', company: 'Google' },
  { ticker: 'MSFT', company: 'Microsoft' },
];

export function DemoControls() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { setIsExecuting, ticker, company, setTicker, setCompany } = useWorkflowStore();

  const simulatePayment = async (amount: number, label: string) => {
    setIsLoading(label);
    setIsExecuting(true);

    try {
      const response = await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, ticker, company }),
      });
      if (!response.ok) {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to simulate payment:', error);
      setIsExecuting(false);
    } finally {
      setIsLoading(null);
    }
  };

  const selectPreset = (preset: { ticker: string; company: string }) => {
    setTicker(preset.ticker.toUpperCase());
    setCompany(preset.company);
  };

  const simulateRevenueDrop = async () => {
    setIsLoading('revenue-drop');
    setIsExecuting(true);

    try {
      const response = await fetch('/api/simulate-revenue-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to simulate revenue drop:', error);
      setIsExecuting(false);
    } finally {
      setIsLoading(null);
    }
  };

  const triggerAdaptation = async () => {
    setIsLoading('adapt');
    setIsExecuting(true);

    try {
      const response = await fetch('/api/trigger-adaptation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to trigger adaptation:', error);
      setIsExecuting(false);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="
        glass-panel rounded-2xl
        shadow-2xl shadow-black/50
        p-4 w-72
      ">
        {/* Stock Input Section */}
        <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Stock Input
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="TICKER"
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono
              bg-glass-bg border border-glass-border text-text-primary
              placeholder-text-tertiary focus:outline-none focus:border-accent-purple/50
              uppercase"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="flex-1 px-3 py-2 rounded-lg text-sm
              bg-glass-bg border border-glass-border text-text-primary
              placeholder-text-tertiary focus:outline-none focus:border-accent-purple/50"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STOCK_PRESETS.map((preset) => (
            <button
              key={preset.ticker}
              onClick={() => selectPreset(preset)}
              className={`
                px-2 py-1 rounded-md text-xs font-medium transition-all
                ${ticker === preset.ticker
                  ? 'bg-accent-purple/30 text-accent-purple border border-accent-purple/30'
                  : 'bg-glass-bg border border-glass-border text-text-secondary hover:text-text-primary hover:border-accent-purple/30'}
              `}
            >
              {preset.ticker}
            </button>
          ))}
        </div>

        <div className="border-t border-glass-border my-3" />

        <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Run Workflow
        </div>

        <div className="flex gap-2 mb-2">
          <button
            onClick={() => simulatePayment(50, 'small')}
            disabled={isLoading !== null}
            className={`
              px-3 py-2 rounded-xl text-sm font-medium
              transition-all flex items-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading === 'small'
                ? 'bg-accent-green/30 text-accent-green'
                : 'bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20'}
            `}
          >
            {isLoading === 'small' ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            $50
          </button>

          <button
            onClick={() => simulatePayment(500, 'medium')}
            disabled={isLoading !== null}
            className={`
              px-3 py-2 rounded-xl text-sm font-medium
              transition-all flex items-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading === 'medium'
                ? 'bg-accent-amber/30 text-accent-amber'
                : 'bg-accent-amber/10 border border-accent-amber/20 text-accent-amber hover:bg-accent-amber/20'}
            `}
          >
            {isLoading === 'medium' ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            $500
          </button>

          <button
            onClick={() => simulatePayment(5000, 'large')}
            disabled={isLoading !== null}
            className={`
              px-3 py-2 rounded-xl text-sm font-medium
              transition-all flex items-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading === 'large'
                ? 'bg-accent-blue/30 text-accent-blue'
                : 'bg-accent-blue/10 border border-accent-blue/20 text-accent-blue hover:bg-accent-blue/20'}
            `}
          >
            {isLoading === 'large' ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            $5000
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={simulateRevenueDrop}
            disabled={isLoading !== null}
            className={`
              flex-1 px-3 py-2 rounded-xl text-sm font-medium
              transition-all flex items-center justify-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading === 'revenue-drop'
                ? 'bg-accent-red/30 text-accent-red'
                : 'bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red/20'}
            `}
          >
            {isLoading === 'revenue-drop' ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 18l-9.5-9.5-5 5L1 6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 18h6v-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Drop
          </button>

          <button
            onClick={triggerAdaptation}
            disabled={isLoading !== null}
            className={`
              flex-1 px-3 py-2 rounded-xl text-sm font-medium
              transition-all flex items-center justify-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading === 'adapt'
                ? 'bg-accent-purple/30 text-accent-purple'
                : 'bg-accent-purple/10 border border-accent-purple/20 text-accent-purple hover:bg-accent-purple/20'}
            `}
          >
            {isLoading === 'adapt' ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Adapt
          </button>
        </div>
      </div>
    </div>
  );
}
