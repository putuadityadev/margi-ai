import { setCatalog } from '@margi-ai/shared/engine';
import { MOCK_CORRIDORS } from './data/corridors';
import { EXPLORE_PLACES } from './data/places';
import { MOCK_REGENCIES } from './data/regencies';

// The explore and trip engine lives in @margi-ai/shared/engine and reads its reference data
// from a registry; importing this module registers the mock dataset.
setCatalog({ places: EXPLORE_PLACES, corridors: MOCK_CORRIDORS, regencies: MOCK_REGENCIES });
