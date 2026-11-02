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
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-500/30">
          Prototype — Mock Data
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Mock Dev Panel"
          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white border border-slate-700 hover:bg-slate-800 transition"
        >
          {isOpen ? '✕ Close Dev' : '⚙️ Mock Dev'}
        </button>
      </div>

      {/* Floating collapsible drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mock Scenarios and Dev Panel"
          className="fixed bottom-14 right-3 z-50 w-80 rounded-xl border border-slate-300 bg-white p-4 text-slate-800 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="font-medium text-sm text-slate-900">MARGI AI Mock Scenarios</h3>
            <span className="text-[10px] uppercase font-mono text-slate-500">Dev Tool</span>
          </div>

          <div className="space-y-3">
            {/* Scenario selector */}
            <div>
              <label
                htmlFor="mock-scenario-select"
                className="block font-medium mb-1 text-slate-700"
              >
                Active Scenario:
              </label>
              <select
                id="mock-scenario-select"
                value={config.scenario}
                onChange={handleScenarioChange}
                className="w-full rounded-md border border-slate-300 p-1.5 text-xs bg-slate-50"
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
              <span className="block font-medium mb-1 text-slate-700">Simulated Latency:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLatencyChange(1)}
                  className={`py-1 rounded border text-xs font-medium ${
                    config.latencyMultiplier === 1
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Normal (1×)
                </button>
                <button
                  type="button"
                  onClick={() => handleLatencyChange(3)}
                  className={`py-1 rounded border text-xs font-medium ${
                    config.latencyMultiplier === 3
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                className="w-full rounded-md bg-rose-50 border border-rose-200 py-1.5 text-rose-700 font-medium hover:bg-rose-100 transition"
              >
                Reset Mock Storage
              </button>
            </div>

            {/* Sent Emails Drawer preview */}
            <div className="border-t border-slate-200 pt-2">
              <span className="block font-medium mb-1 text-slate-700">
                Captured Outbound Emails ({sentEmails.length}):
              </span>
              {sentEmails.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  No emails sent yet in this session.
                </p>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {sentEmails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-1 rounded bg-slate-50 border border-slate-200 text-[11px]"
                    >
                      <div className="font-medium text-slate-800">{mail.subject}</div>
                      <div className="text-slate-500">To: {mail.to}</div>
                      {mail.token && (
                        <div className="font-mono text-[10px] text-indigo-600">
                          Token: {mail.token}
                        </div>
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
