import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';

interface Block {
  readonly title: string;
  readonly body: string;
}

interface Copy {
  readonly title: string;
  readonly intro: string;
  readonly useTitle: string;
  readonly uses: readonly Block[];
  readonly stackTitle: string;
  readonly models: { readonly heading: string; readonly items: readonly string[] };
  readonly data: { readonly heading: string; readonly items: readonly string[] };
  readonly honestyTitle: string;
  readonly honesty: readonly Block[];
  readonly equityTitle: string;
  readonly equity: readonly string[];
  readonly builtTitle: string;
  readonly built: string;
  readonly limitsTitle: string;
  readonly limits: readonly string[];
}

const COPY: Record<'en' | 'id', Copy> = {
  en: {
    title: 'AI & Technology Disclosure',
    intro:
      'What MARGI AI does with AI, which models and data it uses, and where the AI stops and plain code takes over.',
    useTitle: '1. Where AI is used',
    uses: [
      {
        title: 'Copilot and Chat',
        body: 'A language model reads your question, chooses tools (search places, nearby places, place details, check a departure time, change the trip) and writes the answer. It never calculates: every crowd figure, travel time and ranking comes from the engine. A check rejects any number in the answer that no tool returned. If no model is available, you get an error, never a canned reply.',
      },
      {
        title: 'Same-mood matching',
        body: 'Place descriptions are turned into text embeddings. The cosine similarity between two places decides which calmer place feels like a busy one. It is combined with the crowd forecast to rank alternatives.',
      },
      {
        title: 'Not generative AI',
        body: 'The crowd forecast (hourly curves, holidays, ceremonies, season, live traffic beside a place) and routing are computed by code and external routing services. They are labelled as forecasts, not head counts.',
      },
    ],
    stackTitle: '2. Models, services and data',
    models: {
      heading: 'AI models',
      items: [
        'Language model: DeepSeek V4.1 Flash through OpenRouter, with NVIDIA Nemotron (free tier) as fallback. Model names are configuration and can change.',
        'Text embeddings: Google Gemini Embedding 001 (768 dimensions) through OpenRouter.',
        'Vector similarity: computed in the application from stored embeddings.',
      ],
    },
    data: {
      heading: 'Data and services',
      items: [
        'Routing and traffic: TomTom (OpenRouteService as fallback).',
        'Place lookup beyond the catalogue: OpenStreetMap Nominatim and TomTom Search. Coordinates come only from these services, never from the language model.',
        'Destinations: a curated list whose coordinates were checked against OpenStreetMap.',
        'Local businesses: OpenStreetMap contributors (ODbL), with attribution.',
        'Photos: Wikimedia Commons, each with author and licence shown.',
        'Holidays and ceremonies: API Hari Libur and the Balinese calendar.',
        'Context statistics: BPS Bali, Bali Tourism Office, DJPK.',
      ],
    },
    honestyTitle: '3. Honest about data',
    honesty: [
      {
        title: 'Forecast, not a head count',
        body: 'Crowd levels are model forecasts. When live road traffic beside a place raises an estimate, the label says so ("Forecast + live traffic").',
      },
      {
        title: 'No invented fallback',
        body: 'If routing or the AI model is unavailable the app shows an error and a retry button. It does not fill gaps with made-up numbers or text.',
      },
      {
        title: 'Checked numbers',
        body: 'Numbers in AI answers must appear in the data the tools returned. Anything else is rejected before you see it.',
      },
    ],
    equityTitle: '4. Fiscal equity boost',
    equity: [
      'Official fiscal data (DJPK) shows a sharp imbalance in hotel and restaurant tax: Badung Regency receives 60.5% of the island total, Bangli Regency 1.7%.',
      'To spread visits, ranking gives a documented +15% weight to places and local businesses in the six recipient regencies (Bangli, Klungkung, Karangasem, Buleleng, Tabanan, Jembrana). Calmness and mood match still carry most of the score.',
    ],
    builtTitle: '5. How this project was built',
    built:
      'MARGI AI was developed from scratch for this competition, with no earlier product behind it. An AI coding assistant (Claude by Anthropic, through Claude Code) helped with scaffolding, debugging, tests and documentation. Architecture, algorithms and code were reviewed and tested by the builder.',
    limitsTitle: '6. Known limitations',
    limits: [
      'Recommendations are not navigation or emergency guidance. Follow road signs and local officers.',
      'Ceremonies can close roads without notice and may not be in any data feed.',
      'Crowd curves are curated models; accuracy varies by place and day.',
      'Always wear a sarong and sash in temple grounds.',
    ],
  },
  id: {
    title: 'Pengungkapan Teknologi & AI',
    intro:
      'Apa yang dilakukan MARGI AI dengan AI, model dan data yang dipakai, dan di mana AI berhenti lalu kode biasa mengambil alih.',
    useTitle: '1. Di mana AI dipakai',
    uses: [
      {
        title: 'Copilot dan Chat',
        body: 'Model bahasa membaca pertanyaanmu, memilih alat (cari tempat, tempat terdekat, detail tempat, cek jam berangkat, ubah perjalanan) dan menulis jawaban. Ia tidak pernah menghitung: semua angka keramaian, waktu tempuh, dan peringkat berasal dari mesin. Sebuah pemeriksa menolak angka di jawaban yang tidak dikembalikan alat. Kalau tidak ada model tersedia, kamu mendapat pesan error, bukan jawaban kaleng.',
      },
      {
        title: 'Pencocokan suasana',
        body: 'Deskripsi tempat diubah menjadi embedding teks. Kemiripan kosinus antar tempat menentukan tempat tenang mana yang terasa seperti tempat yang padat. Nilainya digabung dengan prakiraan keramaian untuk meranking alternatif.',
      },
      {
        title: 'Bukan AI generatif',
        body: 'Prakiraan keramaian (kurva per jam, hari libur, upacara, musim, lalu lintas di sekitar tempat) dan rute dihitung oleh kode dan layanan rute eksternal. Semuanya berlabel prakiraan, bukan hitungan orang.',
      },
    ],
    stackTitle: '2. Model, layanan, dan data',
    models: {
      heading: 'Model AI',
      items: [
        'Model bahasa: DeepSeek V4.1 Flash lewat OpenRouter, dengan NVIDIA Nemotron (gratis) sebagai cadangan. Nama model adalah konfigurasi dan bisa berubah.',
        'Embedding teks: Google Gemini Embedding 001 (768 dimensi) lewat OpenRouter.',
        'Kemiripan vektor: dihitung di aplikasi dari embedding yang tersimpan.',
      ],
    },
    data: {
      heading: 'Data dan layanan',
      items: [
        'Rute dan lalu lintas: TomTom (OpenRouteService sebagai cadangan).',
        'Pencarian tempat di luar katalog: OpenStreetMap Nominatim dan TomTom Search. Koordinat hanya berasal dari layanan ini, tidak pernah dari model bahasa.',
        'Destinasi: daftar kurasi dengan koordinat yang dicek terhadap OpenStreetMap.',
        'Usaha lokal: kontributor OpenStreetMap (ODbL), dengan atribusi.',
        'Foto: Wikimedia Commons, masing-masing menampilkan penulis dan lisensi.',
        'Hari libur dan upacara: API Hari Libur dan kalender Bali.',
        'Statistik konteks: BPS Bali, Dinas Pariwisata Bali, DJPK.',
      ],
    },
    honestyTitle: '3. Jujur soal data',
    honesty: [
      {
        title: 'Prakiraan, bukan hitungan orang',
        body: 'Tingkat keramaian adalah prakiraan model. Saat lalu lintas langsung di sekitar tempat menaikkan perkiraan, labelnya menyebutkan ("Prakiraan + lalu lintas langsung").',
      },
      {
        title: 'Tanpa cadangan karangan',
        body: 'Kalau rute atau model AI tidak tersedia, aplikasi menampilkan error dan tombol coba lagi. Ia tidak menutup celah dengan angka atau teks buatan.',
      },
      {
        title: 'Angka yang diperiksa',
        body: 'Angka di jawaban AI harus ada di data yang dikembalikan alat. Selain itu ditolak sebelum sampai kepadamu.',
      },
    ],
    equityTitle: '4. Dorongan pemerataan fiskal',
    equity: [
      'Data fiskal resmi (DJPK) menunjukkan ketimpangan tajam pajak hotel dan restoran: Kabupaten Badung menerima 60,5% dari total pulau, Kabupaten Bangli 1,7%.',
      'Untuk menyebar kunjungan, peringkat memberi bobot +15% yang terdokumentasi kepada tempat dan usaha lokal di enam kabupaten penerima (Bangli, Klungkung, Karangasem, Buleleng, Tabanan, Jembrana). Ketenangan dan kecocokan suasana tetap memegang sebagian besar skor.',
    ],
    builtTitle: '5. Bagaimana proyek ini dibuat',
    built:
      'MARGI AI dikembangkan dari nol untuk kompetisi ini, tanpa produk sebelumnya. Asisten koding AI (Claude dari Anthropic, lewat Claude Code) membantu penyusunan kerangka, debugging, tes, dan dokumentasi. Arsitektur, algoritma, dan kode ditinjau serta diuji oleh pembuatnya.',
    limitsTitle: '6. Batasan',
    limits: [
      'Rekomendasi bukan panduan navigasi atau darurat. Patuhi rambu dan petugas setempat.',
      'Upacara bisa menutup jalan tanpa pemberitahuan dan mungkin tidak ada di sumber data mana pun.',
      'Kurva keramaian adalah model kurasi; akurasinya beragam menurut tempat dan hari.',
      'Selalu kenakan kamen dan selendang saat memasuki area pura.',
    ],
  },
};

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 text-graphite">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Plain-language disclosure of what AI does in MARGI, which services it uses, and its limits. */
export function AiDisclosurePage(): ReactNode {
  const { i18n } = useTranslation();
  const copy = i18n.language.startsWith('id') ? COPY.id : COPY.en;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 text-ink sm:px-6 md:py-16 lg:px-8">
      <div className="space-y-3">
        <Pill tone="dark">Responsible AI</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink md:text-heading-lg">
          {copy.title}
        </h1>
        <p className="max-w-2xl text-body leading-relaxed text-graphite">{copy.intro}</p>
      </div>

      <Section title={copy.useTitle}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {copy.uses.map((use) => (
            <Card key={use.title} tone="parchment" className="space-y-2 p-5">
              <h3 className="text-base font-medium text-ink">{use.title}</h3>
              <p className="text-xs leading-relaxed text-graphite">{use.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={copy.stackTitle}>
        <Card tone="white" className="border border-ash p-6">
          <div className="grid grid-cols-1 gap-6 text-xs sm:grid-cols-2">
            <div className="space-y-2">
              <strong className="block text-sm font-medium text-ink">{copy.models.heading}</strong>
              <List items={copy.models.items} />
            </div>
            <div className="space-y-2">
              <strong className="block text-sm font-medium text-ink">{copy.data.heading}</strong>
              <List items={copy.data.items} />
            </div>
          </div>
        </Card>
      </Section>

      <Section title={copy.honestyTitle}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {copy.honesty.map((item) => (
            <Card key={item.title} tone="parchment" className="space-y-2 p-5">
              <h3 className="text-base font-medium text-ink">{item.title}</h3>
              <p className="text-xs leading-relaxed text-graphite">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={copy.equityTitle}>
        <Card
          tone="white"
          className="space-y-3 border border-ash p-6 text-xs leading-relaxed text-graphite"
        >
          {copy.equity.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </Card>
      </Section>

      <Section title={copy.builtTitle}>
        <Card tone="parchment" className="p-6 text-xs leading-relaxed text-graphite">
          <p>{copy.built}</p>
        </Card>
      </Section>

      <Section title={copy.limitsTitle}>
        <Card tone="white" className="border border-ash p-6 text-xs leading-relaxed text-graphite">
          <List items={copy.limits} />
        </Card>
      </Section>
    </div>
  );
}
