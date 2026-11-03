import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';

export function PrivacyPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n?.language?.startsWith('id') ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-ink">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill tone="dark">Data Protection</Pill>
          <span className="text-xs font-mono uppercase tracking-wider text-graphite">
            UU PDP &amp; Privacy By Design
          </span>
        </div>
        <h1 className="text-heading md:text-heading-lg font-medium tracking-tight text-ink">
          {isId ? 'Kebijakan Privasi & Perlindungan Data' : 'Privacy & Data Protection Policy'}
        </h1>
        <p className="text-body text-graphite max-w-2xl leading-relaxed">
          {isId
            ? 'MARGI AI berkomitmen melindungi privasi pengunjung secara menyeluruh. Kami menerapkan prinsip minimisasi data, pemrosesan memori sementara, dan transparansi kuki tanpa pelacak pihak ketiga.'
            : 'MARGI AI is committed to uncompromising privacy. We enforce strict data minimization, ephemeral in-memory processing, and zero third-party tracking.'}
        </p>
      </div>

      {/* 1. Image Processing & Retention */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '1. Pemrosesan Foto & Retensi' : '1. Photo Processing & Retention'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card tone="white" className="p-5 border border-ash space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone font-medium">Guest Mode</span>
              <Pill tone="parchment">{isId ? 'Memori Sementara' : 'In-Memory Only'}</Pill>
            </div>
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Pengguna Tamu (Guest)' : 'Guest Analyses'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Foto yang diunggah oleh pengguna tanpa akun (guest) diproses secara eksklusif di dalam memori RAM sementara dan langsung dimusnahkan seketika setelah analisis selesai. Foto tamu tidak pernah disimpan ke hard disk, database, maupun penyimpanan objek S3.'
                : 'Photos uploaded by guests are processed entirely in ephemeral server memory and discarded immediately upon analysis completion. Guest images are never saved to disk, databases, or S3 object storage.'}
            </p>
          </Card>

          <Card tone="white" className="p-5 border border-ash space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone font-medium">Account Mode</span>
              <Pill tone="parchment">{isId ? 'Terkontrol & Privat' : 'Private & Deletable'}</Pill>
            </div>
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Pengguna Terdaftar' : 'Authenticated Users'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Bagi pengguna yang masuk (login), foto disimpan terenkripsi hanya untuk menampilkan riwayat perjalanan pribadi Anda. Foto bersifat privat (tidak dapat diakses publik) dan dapat dihapus permanen kapan saja melalui menu riwayat akun.'
                : 'For logged-in users, uploaded photos are encrypted at rest solely to display your private trip history. Photos are strictly private and can be permanently deleted at any moment from your account dashboard.'}
            </p>
          </Card>
        </div>
      </section>

      {/* 2. Client-Side Geolocation */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '2. Lokasi Geografis (GPS)' : '2. Geolocation & GPS Data'}
        </h2>
        <Card tone="parchment" className="p-6 space-y-3 text-xs leading-relaxed text-graphite">
          <p>
            {isId
              ? 'Ketika Anda mengizinkan deteksi lokasi GPS saat memilih titik asal (origin), koordinat lintang dan bujur Anda diproses secara lokal di peramban web (client-side) semata-mata untuk mengukur jarak tempuh dan rute alternatif.'
              : 'When you grant browser geolocation permission to detect your starting point, coordinates are processed strictly client-side to calculate travel distances and routing alternatives.'}
          </p>
          <p>
            {isId
              ? 'Koordinat presisi GPS Anda tidak pernah dicatat atau disimpan secara permanen di server telemetri MARGI AI. Kami tidak pernah memprofilkan riwayat pergerakan fisik Anda di pulau Bali.'
              : 'Your raw GPS coordinates are never stored in server logs or telemetry databases. We do not track, profile, or retain your physical movements across Bali.'}
          </p>
        </Card>
      </section>

      {/* 3. Cookies Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '3. Penggunaan Kuki (Cookies)' : '3. Cookies & Session Storage'}
        </h2>
        <p className="text-xs text-graphite">
          {isId
            ? 'MARGI AI tidak menggunakan kuki pelacak pihak ketiga (no advertising or third-party tracking cookies). Semua kuki yang disetel oleh API berstatus aman dan esensial demi fungsi sistem:'
            : 'MARGI AI uses zero advertising or third-party marketing cookies. All cookies set by our API are strictly functional and security-hardened:'}
        </p>

        <Card tone="white" className="border border-ash overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-parchment border-b border-ash text-ink font-medium">
                <tr>
                  <th scope="col" className="px-4 py-3 font-mono">Cookie Name</th>
                  <th scope="col" className="px-4 py-3">{isId ? 'Tipe & Durasi' : 'Type & Lifespan'}</th>
                  <th scope="col" className="px-4 py-3">{isId ? 'Tujuan / Fungsi' : 'Purpose & Security'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash/60 text-graphite">
                <tr>
                  <td className="px-4 py-3 font-mono text-ink font-medium">margi_sid</td>
                  <td className="px-4 py-3">Session / 24 jam</td>
                  <td className="px-4 py-3">
                    {isId
                      ? 'ID sesi anonim untuk pencegahan serangan CSRF dan pembatasan laju kueri tamu (guest rate-limiting). Berbendera HttpOnly dan SameSite=Lax.'
                      : 'Anonymous session identifier for CSRF protection and guest rate-limiting. Hardened with HttpOnly and SameSite=Lax flags.'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-ink font-medium">margi_at</td>
                  <td className="px-4 py-3">JWT Access / 15 menit</td>
                  <td className="px-4 py-3">
                    {isId
                      ? 'Token otentikasi akun berumur pendek untuk mengakses fitur tersimpan dan riwayat pribadi. Berbendera HttpOnly, Secure, SameSite=Strict.'
                      : 'Short-lived cryptographic JWT access token for authenticated API requests. Hardened with HttpOnly, Secure, SameSite=Strict.'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-ink font-medium">margi_rt</td>
                  <td className="px-4 py-3">Rolling Refresh / 7 hari</td>
                  <td className="px-4 py-3">
                    {isId
                      ? 'Token penyegaran bergulir untuk memperbarui sesi login tanpa mengharuskan pengguna masuk ulang. Berbendera HttpOnly, Secure, SameSite=Strict.'
                      : 'Rolling cryptographic refresh token allowing seamless session renewal without re-login. Hardened with HttpOnly, Secure, SameSite=Strict.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* 4. Rights and Contact */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '4. Hak Pengguna & Penghapusan Data' : '4. User Rights & Data Deletion'}
        </h2>
        <Card tone="parchment" className="p-6 space-y-3 text-xs leading-relaxed text-graphite">
          <p>
            {isId
              ? 'Sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022), Anda memiliki hak penuh untuk meminta salinan data akun, mencabut persetujuan pemrosesan, atau mengajukan penghapusan akun beserta seluruh riwayat analisis secara permanen.'
              : 'Under Indonesian Personal Data Protection legislation (UU PDP No. 27/2022) and international standards, you have the right to inspect, export, or permanently erase your user data and trip history at any time.'}
          </p>
          <p>
            {isId
              ? 'Untuk permohonan penghapusan data atau pertanyaan terkait privasi, hubungi tim MARGI AI di privacy@margi.bali.id.'
              : 'For inquiries or data erasure requests, please contact the MARGI AI team at privacy@margi.bali.id.'}
          </p>
        </Card>
      </section>
    </div>
  );
}

