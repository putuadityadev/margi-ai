import { setCatalog, setEmbeddings } from '@margi-ai/shared/engine';
import embeddingFile from '../../../../packages/shared/data/embeddings.json';
import { MOCK_CORRIDORS } from './data/corridors';
import { EXPLORE_PLACES } from './data/places';
import { MOCK_REGENCIES } from './data/regencies';

// The explore and trip engine lives in @margi-ai/shared/engine and reads its reference data
// from a registry; importing this module registers the mock dataset.
setCatalog({ places: EXPLORE_PLACES, corridors: MOCK_CORRIDORS, regencies: MOCK_REGENCIES });
// Same embeddings the API uses, so mock "same vibe" alternatives rank like the real ones.
setEmbeddings(embeddingFile.vectors);
