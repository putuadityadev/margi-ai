import { TrafficSignalService } from './traffic-signal.service';
import type { AppConfig } from '../config/app-config.service';

function service(key: string | undefined): TrafficSignalService {
  const config = { providers: { tomTomKey: key, userAgent: 'test' } } as unknown as AppConfig;
  return new TrafficSignalService(config);
}

function flow(currentSpeed: number, freeFlowSpeed: number, confidence = 1) {
  return new Response(
    JSON.stringify({ flowSegmentData: { currentSpeed, freeFlowSpeed, confidence } }),
    { status: 200 },
  );
}

const VENUE = { id: 'v1', lat: -8.5, lng: 115.2 };

describe('TrafficSignalService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns no signal at all without a TomTom key', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    expect((await service(undefined).congestion([VENUE])).size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('turns slower-than-free-flow traffic into a congestion value and caches it', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(flow(20, 40));
    const svc = service('k');
    expect((await svc.congestion([VENUE])).get('v1')).toBeCloseTo(0.5);
    await svc.congestion([VENUE]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores low-confidence readings and provider errors instead of guessing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(flow(10, 40, 0.2));
    expect((await service('k').congestion([VENUE])).size).toBe(0);
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('x', { status: 500 }));
    expect((await service('k').congestion([{ ...VENUE, id: 'v2' }])).size).toBe(0);
  });
});
