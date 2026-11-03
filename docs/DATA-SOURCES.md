# MARGI AI — Data Sources & External APIs

> **Status:** riset 2026-11-03 (DECISIONS D-027). Harga, kuota, dan ketentuan berubah cepat: setiap
> angka di sini dikutip dari halaman vendor pada tanggal tersebut. Yang ditandai *unverified* belum
> bisa dipastikan dari sumber resmi dan wajib dicek ulang sebelum dipakai. Prinsip pemilihan:
> **gratis dulu**, berbayar hanya bila tidak ada opsi gratis yang layak; setiap panggilan eksternal
> punya *cache*, *timeout*, *fallback*, dan label jujur di UI (BRD BR-05, BR-14).

## 0. Ringkasan keputusan

| Kebutuhan (layar prototipe) | Pilihan utama | Fallback | Biaya demo |
| :--- | :--- | :--- | :--- |
| Keramaian per jam (peta, detail, rencana) | **Model MARGI** (kurva per kategori × hari × jam + pengali libur/upacara/cuaca/musim) untuk 123 tempat | Kalibrasi 10–20 hotspot dengan **BestTime** forecast | $0 (akun uji) atau $29 sekali |
| Keramaian *live* | BestTime `/forecasts/live` hanya untuk tempat ramai yang dibuka user | Tidak ada → label "Prakiraan" | termasuk di atas |
| Rute, waktu tempuh, macet | **TomTom Routing** (`traffic=true`, `trafficDelayInSeconds`) + **TomTom Traffic Flow** untuk koridor | OpenRouteService → OSRM *self-host* (tanpa lalu lintas) → estimasi jarak × faktor jalan | $0 (20K/bln, tanpa kartu) |
| Geometri rute di peta | Polyline dari panggilan TomTom yang sama | ORS GeoJSON → OSRM | $0 |
| Tempat & UMKM | **Postgres sendiri** (123 tempat kurasi + impor Overpass/OSM + dump FSQ OS Places) | Geoapify Places (3.000 kredit/hari) | $0 |
| Cari & *reverse geocode* | DB sendiri (area + tempat); Nominatim `/reverse` (di-cache selamanya) | Geoapify reverse | $0 |
| Foto tempat | **Wikimedia Commons** (CC, disimpan + atribusi) + foto milik tim | Mapillary (CC BY-SA) → plat kartografi | $0 |
| Tile peta produksi | **OpenFreeMap** (vektor, tanpa key, komersial boleh) via `maplibre-gl-leaflet` | PMTiles Bali *self-host* di VPS | $0 |
| AI: vision, Copilot, embedding | **OpenRouter** + Gemini 3.1 Flash-Lite (berbayar, privasi) | Gemma 4 `:free` (Copilot), DeepSeek v4.1 Flash, Qwen3 embedding | ±$10 kredit awal, lalu $1–15/bln |
| Cuaca | **BMKG** prakiraan (wajib atribusi) | Open-Meteo (non-komersial, CC BY 4.0) | $0 |
| Libur & upacara | **API Hari Libur** + `balinese-date-js` (Galungan, Kuningan, Purnama, Tilem, Nyepi) | Tabel odalan kurasi per pura | $0 |
| Musim (pengali) | **BPS WebAPI** kunjungan wisman Bali bulanan | Konstanta bulanan dari BRD §1 | $0 |

## 1. Rute, waktu tempuh, dan lalu lintas

| Opsi | Gratis | Setelah gratis | Key / kartu | Lalu lintas | Catatan ToS | Sumber |
| :--- | :--- | :--- | :--- | :-: | :--- | :--- |
| **TomTom Routing + Traffic Flow Segment** | Routing 20K/bln; Flow Segment 20K/bln; tile flow/incident 200K/bln | *unverified* | Key; **tanpa kartu** | ✓ `trafficDelayInSeconds`, waktu live & historis | Lisensi di balik login: hak *cache* & tampil di peta non-TomTom **unverified** | [pricing](https://docs.tomtom.com/pricing) · [calculate route](https://docs.tomtom.com/routing-api/documentation/routing/calculate-route) |
| Google Routes API | Essentials 10K, **Pro 5K** (TRAFFIC_AWARE = Pro), Enterprise 1K | Pro $10/1K | Key + **akun billing** | ✓ | **§19.2: tidak boleh dipakai bersama peta non-Google** (kita pakai Leaflet/OSM) | [pricing](https://developers.google.com/maps/billing-and-pricing/pricing) · [service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) |
| Mapbox Directions `driving-traffic` | 100K req/bln | $2/1K | Key | ✓ (fallback diam-diam ke `driving` bila tak ada cakupan; Indonesia *unverified*) | Aturan peta non-Mapbox *unverified* | [pricing](https://www.mapbox.com/pricing) |
| HERE Routing v8 / Traffic v7 | Paket "Limited" 1.000/hari tanpa kartu (sumber sekunder) | *unverified* | Base plan butuh kartu | ✓ | — | [pricing](https://www.here.com/get-started/pricing) |
| OpenRouteService | 2.000 rute/hari, 40/menit | — | Key | ✗ | Hanya baseline tanpa lalu lintas | [plans](https://openrouteservice.org/plans/) |
| GraphHopper Free | 500 kredit/hari | €69/bln | Key | ✗ | **Non-komersial** | [pricing](https://www.graphhopper.com/pricing/) |
| OSRM / Valhalla *self-host* (ekstrak Bali) | Tanpa batas | — | — | ✗ | Jalan di VPS sendiri | — |

**Keputusan:** TomTom adalah sumber utama. Satu panggilan sudah memberi durasi live, durasi tanpa lalu lintas, delay macet, dan polyline per leg.
- `GET https://api.tomtom.com/routing/1/calculateRoute/{lat,lon:lat,lon:…}/json?key=…&traffic=true&departAt=…&computeTravelTimeFor=all&routeRepresentation=encodedPolyline`
  - Field yang dipakai: `routes[0].summary.{travelTimeInSeconds, trafficDelayInSeconds, noTrafficTravelTimeInSeconds, historicTrafficTravelTimeInSeconds, lengthInMeters}` dan `legs[i].summary`.
  - **Delay koridor = `trafficDelayInSeconds`**, menggantikan konstanta `typicalDelayMinutes` saat data tersedia.
- **Polling koridor** (cron 30 menit; 10 titik = ±14.400/bln, masih dalam 20K): `GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=lat,lon&unit=kmph&key=…`.
  - `currentSpeed / freeFlowSpeed` menentukan apakah koridor sedang aktif.
  - Hasil polling disimpan per jam-dalam-minggu. Dari sini kita membangun **pola macet historis sendiri** yang dipakai saat rencana dibuat untuk jam mendatang.
- **Rantai fallback:**
  1. Redis (bucket 15 menit).
  2. Pola historis hasil polling.
  3. OSRM/ORS free-flow × pengali jam.
  4. Jarak × 1,35 dengan jendela koridor kurasi.

  Tier aktif ditulis di trace Copilot ("Lalu lintas: langsung / historis / perkiraan").
- **Catatan Bali:** lalu lintas didominasi motor, sehingga ETA mobil bisa terlalu tinggi. Periksa `confidence` dan lakukan uji empiris 1 minggu di 3 koridor sebelum demo.

## 2. Tempat, UMKM, pencarian, *reverse geocode*

| Opsi | Gratis | Harga | Key / kartu | Catatan | Sumber |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Google Places (New) | Search Pro 5K; Details Essentials 10K / Pro 5K / **Enterprise 1K** (rating, jam buka, price level = Enterprise) | Details Enterprise $20/1K | Akun billing | **§14.2: tidak boleh dengan peta non-Google.** Hanya `place_id` yang boleh disimpan permanen; lat/lng maks. 30 hari. Places UI Kit (§15.1) boleh di peta non-Google | [details](https://developers.google.com/maps/documentation/places/web-service/place-details) · [policies](https://developers.google.com/maps/documentation/places/web-service/policies) |
| **Geoapify** (Places, Geocoding, Routing) | **3.000 kredit/hari, 5 req/s, komersial boleh** | $59/bln | Key, tanpa kartu | Wajib atribusi "Powered by Geoapify" | [pricing](https://www.geoapify.com/pricing) |
| Foursquare Places | **Bertentangan:** tabel menyebut 500 gratis, teks menyebut 10.000; field premium (foto, tips) tanpa free tier | Pro $15/1K | — | Cek ulang sebelum dipakai | [pricing](https://foursquare.com/pricing/) |
| FSQ OS Places (dataset terbuka) | Gratis, Apache 2.0, bulanan | — | — | Unduhan massal, bukan API | [blog](https://openplacesapi.com/blog/fsq-os-places-free-place-search) |
| **Overpass API (OSM)** | ±10K req/hari | — | Tanpa key | ODbL; kelengkapan POI Bali belum pernah diteliti (anekdot: tertinggal dari Google) | [commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) |
| **Nominatim** publik | **Maks 1 req/s**, hasil wajib di-cache, tanpa autocomplete | — | User-Agent jelas | Hanya untuk *reverse geocode* yang di-cache | [policy](https://operations.osmfoundation.org/policies/nominatim/) |
| LocationIQ | 5.000/hari, 2 req/s | — | Key | Cache maks. 48 jam | [pricing](https://locationiq.com/pricing) |

**Keputusan:** **Postgres milik kita adalah sumber kebenaran.** Tidak ada API tempat yang dipanggil per request pengguna.
- **Seed sekali** dari tiga sumber, masing-masing dengan kolom `source`:
  - 123 tempat kurasi;
  - Overpass, `POST https://overpass-api.de/api/interpreter` (tag `amenity=cafe|restaurant`, `tourism=attraction`, `craft=*`, `shop=craft|art`, `opening_hours`, `wikidata`, `wikimedia_commons`);
  - dump FSQ OS Places.
- **Geoapify** (`/v2/places`, `/v2/place-details`) hanya dipakai di skrip *enrichment* (T-092) dan untuk pencarian di luar dataset. Path endpoint wajib dicek ulang di dokumentasi.
- **Reverse geocode:** area kurasi terdekat dulu. Bila jarak > 3 km, pakai Nominatim `GET /reverse?lat=&lon=&format=jsonv2&zoom=14` (di-cache selamanya), dengan Geoapify reverse sebagai fallback.
- **Rating Google tidak dipakai** karena ToS-nya tidak cocok dengan peta OSM. MARGI tidak menampilkan rating; produk ini menonjolkan keramaian dan suasana.

## 3. Foto tempat dan lisensi

| Opsi | Gratis / batas | Lisensi & atribusi | Sumber |
| :--- | :--- | :--- | :--- |
| Google Place Photos | 1K/bln, lalu $7/1K | Nama foto **tidak boleh di-cache**; wajib `authorAttributions`; terikat §14.2 | [place photos](https://developers.google.com/maps/documentation/places/web-service/place-photos) |
| **Wikimedia Commons API** | ±500 req/jam anonim (2026, sumber sekunder), ≤ 3 paralel, User-Agent wajib | Lisensi per file (CC BY / BY-SA): cantumkan pembuat + lisensi; boleh di-*rehost* | [rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) |
| Mapillary | Gratis | CC BY-SA 4.0, atribusi "username at Mapillary" | [help](https://help.mapillary.com/hc/en-us/articles/115001770409) |
| Unsplash | Demo 50/jam, produksi 1.000/jam | **Wajib hotlink** + panggil `/download` + kredit | [docs](https://unsplash.com/documentation) |
| Pexels | 200/jam, 20K/bln | Tautan Pexels + kredit fotografer | [docs](https://www.pexels.com/api/documentation/) |

**Keputusan:**
- Untuk setiap venue, jalankan **Wikimedia Commons geosearch** sekali (`GET https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=lat|lon&ggsradius=300&ggsnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json`).
- Simpan ke MinIO bersama `Artist`, `LicenseShortName`, dan `LicenseUrl`. UI menampilkan kredit di foto.
- Foto milik tim atau UMKM (dengan izin) dipakai untuk tempat yang tidak punya foto Commons. Plat kartografi tetap jadi fallback.
- **Unsplash dan Pexels hanya untuk gambar suasana**, bukan foto tempat spesifik.
- **Google Place Photos dihindari** (ToS dan biaya).
- Perbaikan wajib: foto Tanah Lot saat ini salah (menampilkan Ulun Danu Beratan).

## 4. Tile peta

| Opsi | Gratis | Key | Komersial / catatan | Sumber |
| :--- | :--- | :--- | :--- | :--- |
| **OpenFreeMap** | **Tanpa batas**, tanpa registrasi | — | Komersial boleh; vektor (Leaflet butuh `maplibre-gl-leaflet`); tanpa SLA | [openfreemap.org](https://openfreemap.org/) |
| PMTiles *self-host* (ekstrak Bali) | Tanpa batas di VPS | — | `protomaps-leaflet` mode *maintenance*; API hosted gratis hanya non-komersial | [docs](https://docs.protomaps.com/basemaps/leaflet) |
| tile.openstreetmap.org | *Best effort*, tanpa SLA | — | **Bisa dicabut kapan saja**; tanpa prefetch; User-Agent default diblokir | [policy](https://operations.osmfoundation.org/policies/tiles/) |
| MapTiler | 5K sesi + 100K req/bln, **berhenti saat terlampaui** | ✓ | Untuk prototipe/non-komersial; logo wajib | [pricing](https://www.maptiler.com/cloud/pricing/) |
| Stadia Maps | 200K kredit/bln | ✓ | **Free tier bukan untuk komersial** | [pricing](https://stadiamaps.com/pricing) |
| Thunderforest | 150K tile/bln | ✓ | Atribusi | [pricing](https://www.thunderforest.com/pricing/) |
| CARTO | Tanpa key kini menampilkan watermark "API KEY REQUIRED" | ✓ | Komersial butuh lisensi Enterprise | [apikey](https://carto.com/basemaps/apikey) |
| Google Map Tiles API | 100K/bln | ✓ + billing | Menjadikan peta "peta Google" (bisa melegalkan Routes/Places Google) | [pricing](https://developers.google.com/maps/billing-and-pricing/pricing) |

**Keputusan:**
- **OpenFreeMap** adalah sumber utama, lewat `maplibre-gl-leaflet` dengan gaya yang diredupkan agar sesuai palet parchment.
- Fallback: **PMTiles ekstrak Bali di VPS**. Ini juga menjamin demo tetap jalan tanpa tile pihak ketiga.
- Perkiraan 150–300 tile per sesi berarti 225–450K tile per bulan, sehingga MapTiler/Thunderforest gratis **tidak cukup**.
- `tile.openstreetmap.org` hanya untuk pengembangan lokal.
- Atribusi "© OpenMapTiles © OpenStreetMap contributors" tetap tampil.

## 5. Keramaian (crowd)

| Opsi | Isi | Gratis | Harga | Bukti cakupan Bali | Risiko | Sumber |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BestTime.app** | Forecast mingguan 0–100 per jam (`POST /api/v1/forecasts`); live (`/forecasts/live`, 1 kredit) hanya untuk venue ramai | Akun uji tanpa kartu; jumlah kredit *unverified* | Basic min. $29/bln, $0,04/kredit; forecast baru 2 kredit (nama/alamat) atau 1 (venue id) | Halaman Bali memuat 6 venue (Tanah Lot, GWK, Monkey Forest, Tegallalang, Beachwalk, FINNS); butuh ±100+ pengunjung/minggu agar ada forecast | Rendah (penggunaan resmi); hak simpan jangka panjang *unverified* | [pricing](https://besttime.app/subscription/pricing) · [docs](https://documentation.besttime.app/) · [Bali](https://besttime.app/app/Indonesia/Bali) |
| Google "Popular times" | Grafik per jam + live di Maps | **Tidak ada di Places API resmi** | — | Kuat di aplikasi Maps | Tidak tersedia lewat API | [support](https://support.google.com/business/answer/6263531) |
| SerpApi / Outscraper / Apify (scraper Google Maps) | `popular_times` hasil scraping | SerpApi 250 search/bln; Outscraper 500 tempat/bln; Apify $5/bln | $25/bln; $3/1k; $19/bln | Belum diuji | **Sedang–tinggi:** Google Maps Platform Terms §3.2.3(a) melarang scraping | [SerpApi](https://serpapi.com/pricing) · [Terms](https://cloud.google.com/maps-platform/terms) |
| Foursquare Places | POI; field popularitas di tier premium (*unverified*) | Kredit sandbox $200 | contoh $5/1k detail | Popularitas Bali *unverified* | Rendah | [pricing](https://location.foursquare.com/pricing/) |
| BPS WebAPI | Statistik resmi (wisman bulanan, TPK hotel) — pengali musim, bukan per venue | Gratis, daftar + token | Komersial butuh izin | Domain provinsi Bali; kode tabel *unverified* | Rendah; token jangan masuk git | [developer](https://webapi.bps.go.id/developer/) |
| Satu Data Denpasar | CSV kunjungan 2021–2022 | Gratis | — | Hanya Denpasar, lama, validasi "failure" | Rendah | [dataset](https://satudata.denpasarkota.go.id/) |

**Keputusan:**
1. **Baseline untuk semua tempat = model MARGI** yang deterministik: kurva kategori × hari × jam, dikali pengali hari libur dan cuti bersama, hari upacara, musim (BPS), cuaca, dan jendela senja. Labelnya **"Prakiraan · model MARGI"**.
2. **BestTime forecast** ditarik sekali per 2–4 minggu untuk 10–20 hotspot dan tetangga terdekatnya, lalu dipakai untuk mengkalibrasi kurva. Labelnya **"Prakiraan · BestTime"** beserta tanggal forecast.
3. **"Langsung"** hanya ditampilkan kalau `/forecasts/live` mengembalikan nilai, dengan stempel waktu dan kedaluwarsa maksimal 60 menit. Label ini tidak pernah muncul untuk alternatif yang sepi.
4. **Tidak ada scraping Google** di aplikasi yang di-deploy. Kalau perlu validasi, lakukan sekali secara offline dan sajikan sebagai riset.

## 6. AI (vision, Copilot, embedding)

**Aturan kuota OpenRouter `:free`:**
- 20 RPM.
- 50 request/hari kalau total kredit yang pernah dibeli kurang dari $10.
- 1.000 request/hari setelah membeli $10 atau lebih ([limits](https://openrouter.ai/docs/api-reference/limits)).

| Model | Vision | Tools | JSON schema | Gratis | Harga $/1M in/out | Privasi | Sumber |
| :--- | :-: | :-: | :-: | :--- | :--- | :--- | :--- |
| `google/gemini-3.1-flash-lite` | ✓ | ✓ | ✓ | Ada free tier langsung di AI Studio (kuota *unverified*) | 0,25 / 1,50 | **Free tier: data dipakai untuk perbaikan produk dan bisa ditinjau manusia. Paid: tidak.** | [pricing](https://aistudio.google.com/docs/pricing) · [terms](https://aistudio.google.com/docs/terms) |
| `google/gemma-4-31b-it:free` | ✓ | ✓ | `response_format` saja | aturan `:free` | 0 | Dilayani Google AI Studio (ketentuan unpaid berlaku) | [models](https://openrouter.ai/api/v1/models) |
| `nvidia/nemotron-3.5-super-vl:free` | ✓ | ✓ | ✓ | aturan `:free` | 0 | Penyedia **boleh melatih** dengan data → jangan kirim foto | sda |
| `deepseek/deepseek-v4.1-flash` | ✓ | ✓ | ✓ | — | 0,045 / 0,50 | Bergantung penyedia | sda |
| `qwen/qwen3.6-flash` | ✓ | ✓ | ✓ | — | 0,1875 / 1,125 | Bergantung penyedia | sda |
| Groq, Cerebras, Mistral, Cloudflare Workers AI | sebagian | ✓ | sebagian | ada free tier (kuota *unverified*) | — | Mistral free melatih data kecuali opt-out | [Groq](https://console.groq.com/docs/rate-limits) · [Cerebras](https://inference-docs.cerebras.ai/support/rate-limits) |
| GitHub Models | — | — | — | **Pensiun 2026-07-30, jangan dipakai** | — | — | [docs](https://docs.github.com/en/github-models) |

**Embedding:**

| Model | Dimensi | Harga $/1M | Catatan |
| :--- | :--- | :--- | :--- |
| `google/gemini-embedding-001` | 3072, bisa dipotong ke 768 (direkomendasikan) | 0,15 | **Pilihan utama.** Teks venue bersifat publik. |
| `google/gemini-embedding-2` | 3072 (dapat dikurangi), bisa embed gambar | teks 0,20 · gambar 0,45 | Opsi v2: embed foto venue langsung. |
| `qwen/qwen3-embedding-8b` | *unverified* | 0,01 | Fallback; kolom vektor terpisah atau re-index penuh. |
| `nvidia/nemotron-3.5-embed-*:free` | *unverified* | 0 | Aturan `:free`. |
| Voyage `voyage-4-lite` | *unverified* | 0,02 (200M token gratis) | Alternatif di luar OpenRouter. |

**Susunan model (env, TDD §6.1):**

| Peran | Utama | Fallback (`models[]`) | Alasan |
| :--- | :--- | :--- | :--- |
| Vision foto tamu | `google/gemini-3.1-flash-lite` (berbayar, provider Google, *data retention* dimatikan di setelan privasi OpenRouter) | `qwen/qwen3.6-flash` | Foto tamu tidak boleh ke endpoint gratis (ketentuan unpaid Google dan penyedia yang melatih data). |
| Copilot (tool calling) | `google/gemini-3.1-flash-lite` | `google/gemma-4-31b-it:free` → `deepseek/deepseek-v4.1-flash` | Teks tamu dikirim tanpa identitas; output divalidasi Zod. Jangan pakai `openrouter/free` sebagai utama karena model yang menjawab tidak deterministik. |
| Embedding | `google/gemini-embedding-001` @768 | `qwen/qwen3-embedding-8b` (kolom terpisah) | Tidak bisa mencampur ruang vektor antar model. |

> TDD §5/§6.1 sudah diperbarui ke `vector(768)` dan `google/gemini-embedding-001` (D-027).

**Biaya demo** (50 sesi/hari × 30 hari, ±29 juta token input dan 3,2 juta token output):
- **Semua di Gemini 3.1 Flash-Lite:** ±$12/bln.
- **Copilot di model gratis, vision berbayar:** ±$1–3/bln.
- **Embedding untuk 150 venue:** di bawah $0,01.
- **Beli $10 kredit OpenRouter sekali.** Kuota `:free` naik dari 50 ke 1.000 request/hari, padahal demo butuh ±350 panggilan LLM/hari, dan sekaligus membiayai fallback berbayar.

## 7. Data konteks

| Kebutuhan | Sumber | Akses & ketentuan | URL |
| :--- | :--- | :--- | :--- |
| Cuaca (resmi) | **BMKG** `GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode desa}` | 3 hari, per 3 jam, update 2×/hari, 60 req/menit/IP; **wajib tampil "BMKG" sebagai sumber** | [BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) |
| Cuaca (global) | Open-Meteo | Tanpa key; free **non-komersial**, 10k/hari, CC BY 4.0 (atribusi) | [Open-Meteo](https://open-meteo.com/en/pricing) |
| Libur nasional & cuti bersama | API Hari Libur `GET /api?year=2026` | Gratis; teruji memuat Nyepi 2026-03-19 | [api-hari-libur](https://api-hari-libur.pages.dev/) |
| Galungan, Kuningan, Purnama/Tilem, Nyepi | `balinese-date-js` (npm, dihitung lokal) | Tanpa API; **odalan per pura** perlu tabel kurasi | [pkg](https://www.pkgstats.com/pkg:balinese-date-js) |
| Matahari terbit/terbenam | Hitung lokal (SunCalc) atau Open-Meteo `daily=sunrise,sunset` | Denpasar 2026-11-03: 05.49 / 18.15 WITA | — |
| ❌ Nager.Date | — | Tidak lengkap untuk Indonesia (tanpa Nyepi/Idul Fitri) — jangan dipakai | — |

## 7b. Kuota untuk fase demo (50 sesi/hari ≈ 1.500/bln)

| Item | Volume/bln | Sumber | Cukup gratis? |
| :--- | :--- | :--- | :--- |
| Scan sekitar + detail | 1.500 + 7.500 | DB sendiri | Ya (Google Details akan ±$130) |
| Evaluasi trip + re-route Copilot | ±7.500 | TomTom Routing 20K | Ya |
| Polling koridor (10 titik / 30 menit) | 14.400 | TomTom Flow 20K | Ya |
| Geometri fallback | ≤ 4.500 | ORS 2.000/hari | Ya |
| Reverse geocode | ±1.500 (sebagian besar cache) | area kurasi / Nominatim | Ya |
| Foto | ingest sekali ±1–2K | Wikimedia | Ya (dicicil per jam) |
| Tile | 225–450K | OpenFreeMap / PMTiles sendiri | Ya |
| LLM | ±350 panggilan/hari | OpenRouter (§6) | Dengan $10 kredit |

## 8. Kontrak backend yang harus ada

Endpoint internal sudah dispesifikasikan di TDD §10.7–10.8, dengan schema di `packages/shared/src/schemas/{explore,trip}.ts`. Penyedia eksternal hanya disentuh lewat *adapter* backend dan tidak pernah langsung dari browser (key tetap di server):

| Adapter (NestJS) | Dipakai oleh | Cache (Redis) | Fallback |
| :--- | :--- | :--- | :--- |
| `CrowdProvider` (`TelemetryModule`) | explore, trips, copilot | forecast 7 hari; live 15–60 menit | model MARGI → simulasi |
| `RoutingProvider` (`RoutingModule`): TomTom → ORS → OSRM → estimasi | trips, departures, copilot | rute 10–15 menit; geometri 24 jam | §1 |
| `CorridorPoller` (cron 30 menit): TomTom Traffic Flow | status koridor, pola historis | Postgres per jam-dalam-minggu | jendela kurasi |
| `PlacesProvider` (skrip enrichment): Overpass + FSQ OS + Geoapify | admin/seed | DB | dataset kurasi |
| `PhotoProvider` (skrip): Wikimedia Commons | admin/seed | MinIO + atribusi | plat kartografi |
| `ReverseGeocoder`: area kurasi → Nominatim → Geoapify | `/geo/reverse` | permanen | area terdekat |
| `WeatherProvider`, `CalendarProvider` | pengali model keramaian | 3 jam / 1 hari | pengali 1,0 |
| `LlmClient` (OpenRouter) | foto, Copilot, embedding | narasi Copilot 10 menit | templat bilingual |

## 9. Risiko & mitigasi
- **Google di atas Leaflet:** Places §14.2 dan Routes §19.2 melarang pemakaian bersama peta non-Google. Karena itu MARGI tidak memakai Google Places/Routes/Photos sama sekali; navigasi akhir hanya berupa *deep link* Google Maps, yang diperbolehkan.
- **Lisensi TomTom belum dibaca** (di balik login). Sebelum rilis, baca bagian hak *cache* dan tampilan di peta non-TomTom. Geometri ORS/OSRM sudah disiapkan sebagai pengganti.
- **Batas kuota saat demo live:** Nominatim 1 req/s, ORS 40/menit, Wikimedia ±500/jam. Semua panggilan dilakukan dari server dengan cache. Skenario juri dihitung lebih dulu, dan *circuit breaker* mengembalikan snapshot terakhir.
- **Celah cakupan Bali:** BestTime hanya kuat di beberapa venue besar, jadi tempat sepi hampir selalu berstatus "Prakiraan · model MARGI". Ini disebutkan jujur di UI dan di proposal.
- **Batas free tier saat penjurian:** 20 RPM dan 50 atau 1.000 request/hari, dan model gratis bisa dipensiunkan sewaktu-waktu. Mitigasinya: model berbayar di urutan terakhir `models[]`, cache narasi, dan fallback templat.
- **Privasi:** foto tamu hanya dikirim ke endpoint berbayar yang tidak melatih data. Sebelum upload ada baris persetujuan, EXIF dihapus, foto di-resize, dan foto mentah tidak disimpan (TDD §9).
- **Atribusi wajib:** BMKG, Open-Meteo (CC BY), OSM/penyedia tile, dan setiap foto pihak ketiga.
- **Perubahan harga:** Gemini 3.6/3.8 Flash naik 2× pada 2027-01-01. Flash-Lite belum ada pengumuman kenaikan.
- **Belum terverifikasi:** jumlah kredit uji BestTime, kuota gratis Gemini (RPM/RPD), kuota gratis Groq/Mistral, field popularitas Foursquare, kode tabel BPS, dan dataset DTW/UMKM tingkat provinsi.
