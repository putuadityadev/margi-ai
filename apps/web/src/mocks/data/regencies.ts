import { RegencySchema, type Regency } from '@margi-ai/shared';

const rawRegencies: Regency[] = [
  { id: 'badung', nameEn: 'Badung', nameId: 'Badung', phrStatus: 'DONOR' },
  { id: 'denpasar', nameEn: 'Denpasar', nameId: 'Denpasar', phrStatus: 'DONOR' },
  { id: 'gianyar', nameEn: 'Gianyar', nameId: 'Gianyar', phrStatus: 'DONOR' },
  { id: 'tabanan', nameEn: 'Tabanan', nameId: 'Tabanan', phrStatus: 'RECIPIENT' },
  { id: 'buleleng', nameEn: 'Buleleng', nameId: 'Buleleng', phrStatus: 'RECIPIENT' },
  { id: 'karangasem', nameEn: 'Karangasem', nameId: 'Karangasem', phrStatus: 'RECIPIENT' },
  { id: 'bangli', nameEn: 'Bangli', nameId: 'Bangli', phrStatus: 'RECIPIENT' },
  { id: 'klungkung', nameEn: 'Klungkung', nameId: 'Klungkung', phrStatus: 'RECIPIENT' },
  { id: 'jembrana', nameEn: 'Jembrana', nameId: 'Jembrana', phrStatus: 'RECIPIENT' },
];

export const MOCK_REGENCIES: readonly Regency[] = rawRegencies.map((r) => RegencySchema.parse(r));
