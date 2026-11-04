import type { LearnedPlacesService } from './learned-places.service';
import type { PlaceCandidate, PlaceResolverService } from './place-resolver.service';
import { PlacesService } from './places.service';

const NEAR = { lat: -8.5389, lng: 115.3293 };

function candidate(overrides: Partial<PlaceCandidate>): PlaceCandidate {
  return {
    name: 'SMA Negeri Bali Mandara',
    address: 'Jalan Kubu Tambahan Airsanih, Kecamatan Buleleng, Bali',
    lat: -8.0815,
    lng: 115.207,
    source: 'tomtom',
    externalRef: 'tomtom:a',
    regencyName: 'Buleleng',
    isPoi: true,
    sourceUrl: null,
    ...overrides,
  };
}

function service(
  found: readonly PlaceCandidate[],
  options: { unavailable?: boolean; blocked?: readonly string[] } = {},
): { places: PlacesService; learned: jest.Mock } {
  const learn = jest.fn((item: PlaceCandidate) =>
    Promise.resolve({ id: `venue-${item.externalRef}`, createdAt: new Date() }),
  );
  const resolver = {
    resolve: () =>
      Promise.resolve({ candidates: found, unavailable: options.unavailable ?? false }),
  } as unknown as PlaceResolverService;
  const learned = {
    isBlocked: (ref: string) => Promise.resolve(options.blocked?.includes(ref) ?? false),
    learn,
  } as unknown as LearnedPlacesService;
  return { places: new PlacesService(resolver, learned), learned: learn };
}

describe('PlacesService.find', () => {
  it('saves a single clear match under the abbreviation the traveller typed', async () => {
    const { places, learned } = service([candidate({})]);
    const result = await places.find('sma n bali mandara', NEAR);
    expect(result).toMatchObject({ status: 'found', venueId: 'venue-tomtom:a' });
    expect(learned).toHaveBeenCalledTimes(1);
  });

  it('asks which one when several different places match equally', async () => {
    const { places, learned } = service([
      candidate({
        name: 'SMA Negeri 1 Ubud',
        address: 'Ubud, Gianyar',
        lat: -8.5,
        lng: 115.26,
        externalRef: 'osm:1',
      }),
      candidate({
        name: 'SMA Negeri 1 Denpasar',
        address: 'Denpasar',
        lat: -8.65,
        lng: 115.22,
        externalRef: 'osm:2',
      }),
    ]);
    const result = await places.find('sma negeri 1', NEAR);
    expect(result.status).toBe('ambiguous');
    expect(learned).not.toHaveBeenCalled();
  });

  it('treats the same place from two providers as one', async () => {
    const { places } = service([
      candidate({ externalRef: 'osm:9', source: 'osm' }),
      candidate({ externalRef: 'tomtom:9', lat: -8.0816, lng: 115.2071 }),
    ]);
    expect((await places.find('SMA Negeri Bali Mandara', NEAR)).status).toBe('found');
  });

  it('does not accept a weak name match', async () => {
    const { places, learned } = service([
      candidate({ name: 'Warung Makan Sederhana', address: 'Ubud' }),
    ]);
    expect((await places.find('SMA Negeri Bali Mandara', NEAR)).status).toBe('not_found');
    expect(learned).not.toHaveBeenCalled();
  });

  it('never saves streets or house addresses', async () => {
    const { places, learned } = service([candidate({ isPoi: false })]);
    expect((await places.find('SMA Negeri Bali Mandara', NEAR)).status).toBe('not_found');
    expect(learned).not.toHaveBeenCalled();
  });

  it('skips a place a curator removed', async () => {
    const { places } = service([candidate({})], { blocked: ['tomtom:a'] });
    expect((await places.find('SMA Negeri Bali Mandara', NEAR)).status).toBe('not_found');
  });

  it('reports a lookup outage instead of "not found"', async () => {
    const { places } = service([], { unavailable: true });
    expect((await places.find('SMA Negeri Bali Mandara', NEAR)).status).toBe('unavailable');
  });

  it('does not search a kind of place as if it were a name', async () => {
    const { places, learned } = service([candidate({ name: 'Warung Makan Terdekat' })]);
    expect((await places.find('warung makan terdekat', NEAR)).status).toBe('generic');
    expect(learned).not.toHaveBeenCalled();
  });
});
