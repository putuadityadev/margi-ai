import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';

interface Cookie {
  readonly name: string;
  readonly purpose: string;
}

interface Block {
  readonly title: string;
  readonly body: string;
}

interface Copy {
  readonly title: string;
  readonly intro: string;
  readonly storeTitle: string;
  readonly store: readonly Block[];
  readonly cookiesTitle: string;
  readonly cookies: readonly Cookie[];
  readonly locationTitle: string;
  readonly location: readonly string[];
  readonly sharedTitle: string;
  readonly shared: readonly Block[];
  readonly controlTitle: string;
  readonly control: readonly string[];
}

const COPY: Record<'en' | 'id', Copy> = {
  en: {
    title: 'Privacy & Data Protection Policy',
    intro:
      'MARGI AI collects as little as it can. There are no advertising or analytics trackers. Planning and searching work without an account.',
    storeTitle: '1. What we store',
    store: [
      {
        title: 'Account',
        body: 'Only if you sign up: your email, your name and a salted scrypt hash of your password. If you use Google sign-in we receive your Google name, email and picture, and store the same fields. We never see your Google password.',
      },
      {
        title: 'Saved plans',
        body: 'The stops, departure time and a start point rounded to about 1 km, tied to your account so you can reopen them. You can delete any plan at any time.',
      },
      {
        title: 'Chat',
        body: 'Your messages are sent to our server and passed to the AI provider to produce an answer. The server does not keep them. The conversation is kept in your own browser until you start a new chat.',
      },
    ],
    cookiesTitle: '2. Cookies and browser storage',
    cookies: [
      {
        name: 'margi_sid',
        purpose:
          'Anonymous visitor id (90 days). Used only to limit request rates. No personal data.',
      },
      {
        name: 'margi_auth',
        purpose: 'Signed-in session, httpOnly (7 days). Revocable by signing out.',
      },
      {
        name: 'margi_oauth',
        purpose: 'Short-lived (10 minutes) security token while signing in with Google.',
      },
    ],
    locationTitle: '3. Location',
    location: [
      'Your device location is read once in the browser to pick a start point. It is never stored on our servers or in logs.',
      'If you pick a town instead, that choice is remembered only in your browser. A saved plan keeps a start point rounded to about 1 km.',
    ],
    sharedTitle: '4. Who else receives data',
    shared: [
      {
        title: 'AI provider',
        body: 'OpenRouter and the model it routes to receive your chat text and the trip context needed to answer. No account details are sent.',
      },
      {
        title: 'Routing and traffic',
        body: 'TomTom receives route and place coordinates to compute travel time and traffic.',
      },
      {
        title: 'Map tiles',
        body: 'The map is drawn from OpenStreetMap tile servers, which see your IP address like any website you visit.',
      },
      {
        title: 'Google',
        body: 'Only if you choose "Continue with Google".',
      },
    ],
    controlTitle: '5. Your control',
    control: [
      'Delete saved plans from the Plans screen. Sign out to end a session.',
      'Clear your browser data to remove the chat history, remembered town and cookies.',
      'To delete your account, contact the team listed in the project repository.',
    ],
  },
  id: {
    title: 'Kebijakan Privasi & Perlindungan Data',
    intro:
      'MARGI AI mengumpulkan sesedikit mungkin. Tidak ada pelacak iklan atau analitik. Mencari dan menyusun rencana berjalan tanpa akun.',
    storeTitle: '1. Apa yang kami simpan',
    store: [
      {
        title: 'Akun',
        body: 'Hanya jika kamu mendaftar: emailmu, namamu, dan hash scrypt berbumbu dari kata sandimu. Kalau memakai masuk dengan Google, kami menerima nama, email, dan foto Google-mu, lalu menyimpan kolom yang sama. Kami tidak pernah melihat kata sandi Google-mu.',
      },
      {
        title: 'Rencana tersimpan',
        body: 'Tujuan, jam berangkat, dan titik awal yang dibulatkan sekitar 1 km, terikat ke akunmu supaya bisa dibuka lagi. Kamu bisa menghapus rencana kapan saja.',
      },
      {
        title: 'Chat',
        body: 'Pesanmu dikirim ke server kami dan diteruskan ke penyedia AI untuk menghasilkan jawaban. Server tidak menyimpannya. Percakapan disimpan di browsermu sendiri sampai kamu memulai chat baru.',
      },
    ],
    cookiesTitle: '2. Kuki dan penyimpanan browser',
    cookies: [
      {
        name: 'margi_sid',
        purpose:
          'Id pengunjung anonim (90 hari). Hanya untuk membatasi laju permintaan. Tanpa data pribadi.',
      },
      {
        name: 'margi_auth',
        purpose: 'Sesi masuk, httpOnly (7 hari). Bisa dicabut dengan keluar.',
      },
      {
        name: 'margi_oauth',
        purpose: 'Token keamanan singkat (10 menit) saat masuk dengan Google.',
      },
    ],
    locationTitle: '3. Lokasi',
    location: [
      'Lokasi perangkatmu dibaca sekali di browser untuk memilih titik awal. Lokasi itu tidak pernah disimpan di server atau log kami.',
      'Kalau kamu memilih kota, pilihan itu hanya diingat di browsermu. Rencana tersimpan menyimpan titik awal yang dibulatkan sekitar 1 km.',
    ],
    sharedTitle: '4. Siapa lagi yang menerima data',
    shared: [
      {
        title: 'Penyedia AI',
        body: 'OpenRouter dan model tujuannya menerima teks chatmu dan konteks perjalanan yang dibutuhkan untuk menjawab. Detail akun tidak dikirim.',
      },
      {
        title: 'Rute dan lalu lintas',
        body: 'TomTom menerima koordinat rute dan tempat untuk menghitung waktu tempuh dan lalu lintas.',
      },
      {
        title: 'Ubin peta',
        body: 'Peta digambar dari server ubin OpenStreetMap, yang melihat alamat IP-mu seperti situs web lain yang kamu kunjungi.',
      },
      {
        title: 'Google',
        body: 'Hanya jika kamu memilih "Lanjutkan dengan Google".',
      },
    ],
    controlTitle: '5. Kendali di tanganmu',
    control: [
      'Hapus rencana tersimpan dari layar Rencana. Keluar untuk mengakhiri sesi.',
      'Hapus data browser untuk menghilangkan riwayat chat, kota yang diingat, dan kuki.',
      'Untuk menghapus akun, hubungi tim yang tercantum di repositori proyek.',
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
    <ul className="list-inside list-disc space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** What MARGI stores, which cookies it sets, and who else receives data. */
export function PrivacyPage(): ReactNode {
  const { i18n } = useTranslation();
  const copy = i18n?.language?.startsWith('id') ? COPY.id : COPY.en;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 text-ink sm:px-6 md:py-16 lg:px-8">
      <div className="space-y-3">
        <Pill tone="dark">Privacy</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink md:text-heading-lg">
          {copy.title}
        </h1>
        <p className="max-w-2xl text-body leading-relaxed text-graphite">{copy.intro}</p>
      </div>

      <Section title={copy.storeTitle}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {copy.store.map((item) => (
            <Card key={item.title} tone="parchment" className="space-y-2 p-5">
              <h3 className="text-base font-medium text-ink">{item.title}</h3>
              <p className="text-xs leading-relaxed text-graphite">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={copy.cookiesTitle}>
        <Card tone="white" className="border border-ash p-6">
          <ul className="space-y-3 text-xs leading-relaxed text-graphite">
            {copy.cookies.map((cookie) => (
              <li key={cookie.name} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                <code className="w-32 flex-none font-mono text-ink">{cookie.name}</code>
                <span>{cookie.purpose}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title={copy.locationTitle}>
        <Card tone="parchment" className="p-6 text-xs leading-relaxed text-graphite">
          <List items={copy.location} />
        </Card>
      </Section>

      <Section title={copy.sharedTitle}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {copy.shared.map((item) => (
            <Card key={item.title} tone="white" className="space-y-2 border border-ash p-5">
              <h3 className="text-base font-medium text-ink">{item.title}</h3>
              <p className="text-xs leading-relaxed text-graphite">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={copy.controlTitle}>
        <Card tone="parchment" className="p-6 text-xs leading-relaxed text-graphite">
          <List items={copy.control} />
        </Card>
      </Section>
    </div>
  );
}
