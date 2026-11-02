import { useState, type ReactNode } from 'react';
import { mockDb } from './db';
import {
  getScenarioConfig,
  setLatencyMultiplier,
  setMockScenario,
  type MockScenario,
} from './scenario';

export function DevPanel(): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(getScenarioConfig());
  const sentEmails = mockDb.sentEmails;

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const sc = e.target.value as MockScenario;
    setMockScenario(sc);
    setConfig((prev) => ({ ...prev, scenario: sc }));
    window.location.reload();
  };

  const handleLatencyChange = (multiplier: number): void => {
    setLatencyMultiplier(multiplier);
    setConfig((prev) => ({ ...prev, latencyMultiplier: multiplier }));
  };

  const handleResetDb = (): void => {
    mockDb.reset();
    window.location.reload();
  };

  return (
    <>
      {/* Floating trigger button & honest labeling indicator */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2">
        <span className="rounded-pill bg-sim-banner px-2.5 py-1 text-xs font-medium text-ink border border-ash">
          Prototype — Mock Data
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Mock Dev Panel"
          className="rounded-pill bg-ink px-3 py-1 text-xs font-medium text-white border border-charcoal hover:bg-charcoal transition"
        >
          {isOpen ? '✕ Close Dev' : '⚙️ Mock Dev'}
        </button>
      </div>

      {/* Floating collapsible drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mock Scenarios and Dev Panel"
          className="fixed bottom-14 right-3 z-50 w-80 rounded-card border border-ash bg-white p-4 text-ink text-xs"
        >
          <div className="flex items-center justify-between border-b border-ash pb-2 mb-3">
            <h3 className="font-medium text-sm text-ink">MARGI AI Mock Scenarios</h3>
            <span className="text-[10px] uppercase font-mono text-graphite">Dev Tool</span>
          </div>

          <div className="space-y-3">
            {/* Scenario selector */}
            <div>
              <label
                htmlFor="mock-scenario-select"
                className="block font-medium mb-1 text-graphite"
              >
                Active Scenario:
              </label>
              <select
                id="mock-scenario-select"
                value={config.scenario}
                onChange={handleScenarioChange}
                className="w-full rounded-input border border-ash p-1.5 text-xs bg-parchment text-ink"
              >
                <option value="default">Default (Normal calm/surge)</option>
                <option value="surge">Forced Red-Zone Surge (115%)</option>
                <option value="error_not_scene">Error: Not a Scene</option>
                <option value="error_timeout">Error: Timeout (20s)</option>
                <option value="error_500">Error: Server 500</option>
              </select>
            </div>

            {/* Latency toggle */}
            <div>
              <span className="block font-medium mb-1 text-graphite">Simulated Latency:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLatencyChange(1)}
                  className={`py-1 rounded-input border text-xs font-medium transition ${
                    config.latencyMultiplier === 1
                      ? 'bg-lime text-ink border-ink'
                      : 'border-ash text-graphite bg-parchment hover:bg-white'
                  }`}
                >
                  Normal (1×)
                </button>
                <button
                  type="button"
                  onClick={() => handleLatencyChange(3)}
                  className={`py-1 rounded-input border text-xs font-medium transition ${
                    config.latencyMultiplier === 3
                      ? 'bg-sim-banner text-ink border-stone'
                      : 'border-ash text-graphite bg-parchment hover:bg-white'
                  }`}
                >
                  Slow Network (3×)
                </button>
              </div>
            </div>

            {/* Reset DB */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleResetDb}
                className="w-full rounded-input bg-parchment border border-ash py-1.5 text-ink font-medium hover:bg-ash transition"
              >
                Reset Mock Storage
              </button>
            </div>

            {/* Sent Emails Drawer preview */}
            <div className="border-t border-ash pt-2">
              <span className="block font-medium mb-1 text-graphite">
                Captured Outbound Emails ({sentEmails.length}):
              </span>
              {sentEmails.length === 0 ? (
                <p className="text-[11px] text-graphite italic">
                  No emails sent yet in this session.
                </p>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {sentEmails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-1 rounded-input bg-parchment border border-ash text-[11px]"
                    >
                      <div className="font-medium text-ink">{mail.subject}</div>
                      <div className="text-graphite">To: {mail.to}</div>
                      {mail.token && (
                        <div className="font-mono text-[10px] text-ink">Token: {mail.token}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
