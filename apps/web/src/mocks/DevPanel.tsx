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
  const currentUser = mockDb.getCurrentUser();

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

  const handleUserSwitch = (userId: string | null): void => {
    mockDb.currentUserId = userId;
    window.location.reload();
  };

  const handleSimulateGoogleSignIn = (): void => {
    const demo = mockDb.getUserByEmail('demo@margi.test');
    if (demo) {
      mockDb.currentUserId = demo.id;
      window.location.href = '/auth/callback?next=/app';
    }
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
          className="rounded-pill bg-ink px-3 py-1 text-xs font-medium text-white border border-charcoal hover:bg-charcoal transition cursor-pointer"
        >
          {isOpen ? '✕ Close Dev' : '⚙️ Mock Dev'}
        </button>
      </div>

      {/* Floating collapsible drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mock Scenarios and Dev Panel"
          className="fixed bottom-14 right-3 z-50 w-88 max-h-[85vh] overflow-y-auto rounded-card border border-ash bg-white p-4 text-ink text-xs space-y-3"
        >
          <div className="flex items-center justify-between border-b border-ash pb-2">
            <div>
              <h3 className="font-medium text-sm text-ink">MARGI AI Mock Scenarios</h3>
              <div className="text-[11px] text-graphite">
                Current:{' '}
                <strong className="text-ink">
                  {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Guest / Signed Out'}
                </strong>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono text-graphite">Dev Tool</span>
          </div>

          {/* User switcher */}
          <div>
            <label htmlFor="mock-user-select" className="block font-medium mb-1 text-graphite">
              Switch Mock Account:
            </label>
            <select
              id="mock-user-select"
              value={mockDb.currentUserId ?? ''}
              onChange={(e) => handleUserSwitch(e.target.value || null)}
              className="w-full rounded-input border border-ash p-1.5 text-xs bg-parchment text-ink"
            >
              <option value="">Guest (Signed Out)</option>
              <option value="0192e2b0-user-7000-8000-000000000001">demo@margi.test (Verified User)</option>
              <option value="0192e2b0-user-7000-8000-000000000002">unverified@margi.test (Unverified User)</option>
              <option value="0192e2b0-user-7000-8000-000000000003">admin@margi.test (Admin)</option>
            </select>
          </div>

          {/* Simulate Google sign-in */}
          <div>
            <button
              type="button"
              onClick={handleSimulateGoogleSignIn}
              className="w-full rounded-input bg-white border border-ash py-1.5 text-ink font-medium hover:bg-parchment transition text-center cursor-pointer"
            >
              Simulate Google Sign-in
            </button>
          </div>

          {/* Scenario selector */}
          <div>
            <label htmlFor="mock-scenario-select" className="block font-medium mb-1 text-graphite">
              Active Scenario:
            </label>
            <select
              id="mock-scenario-select"
              value={config.scenario}
              onChange={handleScenarioChange}
              className="w-full rounded-input border border-ash p-1.5 text-xs bg-parchment text-ink"
            >
              <option value="default">Default / Normal</option>
              <option value="simulate">Simulate (Judge Test Mode - 115% surge)</option>
              <option value="calm-origin">Calm Origin (Non-red origin)</option>
              <option value="relaxed">Relaxed Criteria (Expanded calm threshold)</option>
              <option value="not-a-scene">Not a Travel Scene (Friendly rejection)</option>
              <option value="vision-busy">AI Vision Busy (Recoverable error)</option>
              <option value="replay">LKG Replay (Cached fallback)</option>
              <option value="template-narrative">Template Narrative (Synthesis fallback)</option>
              <option value="stream-drop">Stream Drop (Connection drop test)</option>
              <option value="rate-limited">Rate Limited (429)</option>
              <option value="expired-session">Expired Session (401 refresh test)</option>
            </select>
          </div>

          {/* Latency toggle */}
          <div>
            <span className="block font-medium mb-1 text-graphite">Simulated Latency:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLatencyChange(1)}
                className={`py-1 rounded-input border text-xs font-medium transition cursor-pointer ${
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
                className={`py-1 rounded-input border text-xs font-medium transition cursor-pointer ${
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
          <div>
            <button
              type="button"
              onClick={handleResetDb}
              className="w-full rounded-input bg-parchment border border-ash py-1.5 text-ink font-medium hover:bg-ash transition cursor-pointer"
            >
              Reset Mock Storage
            </button>
          </div>

          {/* Mock Mailbox Drawer preview */}
          <div className="border-t border-ash pt-2">
            <span className="block font-medium mb-1 text-graphite">
              Mock Mailbox ({sentEmails.length}):
            </span>
            {sentEmails.length === 0 ? (
              <p className="text-[11px] text-graphite italic">No emails sent yet in this session.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {sentEmails.map((mail) => {
                  const targetUrl =
                    mail.template === 'verify-email'
                      ? `/verify-email?token=${mail.token ?? ''}`
                      : `/reset-password?token=${mail.token ?? ''}`;

                  return (
                    <div
                      key={mail.id}
                      className="p-1.5 rounded-input bg-parchment border border-ash text-[11px] space-y-1"
                    >
                      <div className="font-medium text-ink">{mail.subject}</div>
                      <div className="text-graphite">To: {mail.to}</div>
                      {mail.token && (
                        <a
                          href={targetUrl}
                          className="inline-block text-[10px] text-ink underline font-medium hover:text-stone"
                        >
                          👉 Open {mail.template === 'verify-email' ? 'Verify Link' : 'Reset Link'}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
