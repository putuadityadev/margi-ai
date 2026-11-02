export type MockScenario =
  | 'default'
  | 'normal'
  | 'simulate'
  | 'calm-origin'
  | 'relaxed'
  | 'not-a-scene'
  | 'vision-busy'
  | 'replay'
  | 'template-narrative'
  | 'stream-drop'
  | 'rate-limited'
  | 'expired-session'
  | 'surge'
  | 'error_not_scene'
  | 'error_timeout'
  | 'error_500';

export interface ScenarioConfig {
  scenario: MockScenario;
  latencyMultiplier: number;
}

const STORAGE_KEY = 'margi_mock_scenario';
const LATENCY_KEY = 'margi_mock_latency';

export function getScenarioConfig(): ScenarioConfig {
  if (typeof window === 'undefined') {
    return { scenario: 'default', latencyMultiplier: 1 };
  }

  // URL query override takes highest priority for automated testing (e.g. ?mockScenario=surge)
  const params = new URLSearchParams(window.location.search);
  const qScenario = params.get('mockScenario') as MockScenario | null;
  const qLatency = params.get('mockLatency');

  const scenario: MockScenario =
    qScenario || (window.localStorage.getItem(STORAGE_KEY) as MockScenario) || 'default';
  const latency = qLatency
    ? Number(qLatency)
    : Number(window.localStorage.getItem(LATENCY_KEY) || '1');

  return {
    scenario,
    latencyMultiplier: Number.isFinite(latency) && latency >= 0 ? latency : 1,
  };
}

export function setMockScenario(scenario: MockScenario): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, scenario);
  }
}

export function setLatencyMultiplier(multiplier: number): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LATENCY_KEY, String(multiplier));
  }
}
