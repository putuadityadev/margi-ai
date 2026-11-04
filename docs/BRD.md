# BUSINESS REQUIREMENTS DOCUMENT (BRD)
## MARGI AI: Vibe-Preserving Crowd Dispersion & Micro-MSME Rerouting Engine

---

## 0. Kontrol Dokumen & Identitas Proyek

| Atribut Dokumen | Detail Spesifikasi |
| :--- | :--- |
| **Nama Produk (Working Title)** | **MARGI AI** (*Vibe-Preserving Crowd Dispersion & Micro-MSME Rerouting Engine* — *Margi* berakar dari bahasa Bali/Sanskerta yang bermakna "Jalan / Rute Perjalanan yang Selaras") |
| **Kompetisi Target** | Bali DigiFest 2026 — AI Web Innovation Challenge (AIWIC) |
| **Tema Utama** | *Build with AI, Solve for Bali* |
| **Ruang Lingkup Solusi** | Kombinasi *Bali Smart Society* (Pariwisata, Lingkungan, Budaya, Transportasi) & *Business and MSME Digitalization* (Rekomendasi & Pemasaran UMKM Lokal) |
| **Kategori Peserta** | Mahasiswa / Umum (Individu dibantu *AI Coding Assistant*) |
| **Target Siklus Pengembangan** | Maksimal 7 Hari Kalender untuk MVP Tahap 1 (`v1.0-submission`) |
| **Status Dokumen** | `FINAL - READY FOR PRD & TDD GENERATION` |

---

## 1. Visi Produk & Ringkasan Eksekutif (*Executive Summary*)

### 1.1 Visi Bisnis
Mengubah paradigma eksplorasi wisata di Provinsi Bali dari pola **konsentrasi titik viral yang melumpuhkan ruang** menjadi **redistribusi perjalanan dinamis berbasis kesamaan atmosfer (*vibe-matching*) yang menggerakkan transaksi riil pada UMKM kuliner, kriya, dan Daya Tarik Wisata (DTW) di zona penyangga serta kabupaten berkembang**.

### 1.2 Pernyataan Nilai Inti (*Core Value Proposition*)
1. **Bagi Wisatawan (B2C):** Menghemat $1$ hingga $3,5\text{ jam}$ ($60$–$210\text{ menit}$) waktu yang terbuang di antrean foto tunggal atau kemacetan koridor utama tanpa mengorbankan estetika visual (*vibe*) yang mereka cari dari referensi media sosial.
2. **Bagi UMKM & Desa Wisata Lokal (B2B2C):** Mengalihkan arus wisatawan berdaya beli dari koridor jenuh menuju restoran lokal, kedai kopi petani, perajin kriya, dan DTW yang kursinya masih kosong pada radius mikro ($1$–$3\text{ km}$) maupun radius regional lintas kabupaten.
3. **Bagi Pemerintah Daerah Bali (B2G Alignment):** Melengkapi kebijakan statis moratorium konstruksi hotel/vila dengan instrumen pengendali permintaan harian (*dynamic demand dispersion*) yang mendorong pemerataan Pajak Hotel dan Restoran (PHR) ke $6$ kabupaten penerima subsidi.

---

## 2. Latar Belakang Bisnis & Bukti Empiris Masalah (*Problem & Background*)
*(Catatan: Bagian ini dirancang siap pakai untuk mengisi **Bab 1 Proposal Lampiran A** guna mengunci skor penuh pada kriteria Problem Relevance & Impact).*

### 2.1 Krisis Daya Dukung Makro & Ekologis Bali
* **Rekor Lonjakan Wisatawan:** Pada akhir tahun 2025, kunjungan wisatawan mancanegara (wisman) langsung ke Bali menembus angka $7,05\text{ juta}$ jiwa (sekitar $45\%$ dari total wisman nasional), melonjak drastis dari titik terendah $45$ kunjungan pada 2021 dan $2.155.747$ kunjungan pada 2022. Sepanjang 2024–2025, kedatangan bulanan naik konsisten dari $469.227$ (Maret 2024), $503.194$ (April 2024), $544.601$ (Mei 2024), dan $518.819$ (Juni 2024) menuju puncak $697.107$ kunjungan pada Juli 2025 serta $682.866$ kunjungan pada Agustus 2025.
* **Degradasi Lahan Sawah Produktif:** Pemusatan akomodasi komersial di Bali Selatan dan Tengah telah menggerus luas lahan sawah produktif Provinsi Bali dari $70.996\text{ hektare}$ (2019) menjadi $64.474\text{ hektare}$ (2024), atau menyusut sebesar $6.522\text{ hektare}$ hanya dalam lima tahun.
* **Celah Fundamental Kebijakan Moratorium:** Pemerintah merespons dengan kebijakan moratorium pembangunan hotel, vila, dan restoran baru hingga $10\text{ tahun}$ di Kota Denpasar, Kabupaten Badung (Seminyak, Canggu, Uluwatu), Kabupaten Gianyar (Ubud), dan Kabupaten Tabanan. Namun, moratorium hanya menahan pasokan gedung baru di masa depan (*supply-side freeze*) tanpa memiliki mekanisme dinamis untuk mengatur pergerakan harian jutaan wisatawan yang saat ini sudah berada di Bali dan tetap memadati titik-titik viral eksisting.

### 2.2 Paradoks Kelimpahan Aset Wisata vs Ketimpangan Fiskal UMKM/PAD
Asumsi bahwa daerah sepi pengunjung tidak memiliki objek wisata yang memadai terbantahkan oleh data sektoral Dinas Pariwisata Provinsi Bali dan DJPK Kementerian Keuangan:
* **Konsentrasi Fiskal Ekstrem:** Realisasi Pendapatan Daerah se-Provinsi Bali tahun 2024 mencapai $\text{Rp}33.234,10\text{ miliar}$ ($94,81\%$ dari pagu $\text{Rp}35.052,03\text{ miliar}$), dengan Pendapatan Asli Daerah (PAD) sebesar $\text{Rp}18.744,30\text{ miliar}$ ($91,65\%$ dari pagu $\text{Rp}20.452,89\text{ miliar}$), Pajak Daerah $\text{Rp}15.126,47\text{ miliar}$, Retribusi Daerah $\text{Rp}2.274,79\text{ miliar}$, dan Belanja Daerah $\text{Rp}32.145,04\text{ miliar}$. Namun, Kabupaten Badung menyerap $48,60\%$ ($\text{Rp}4,86\text{ triliun}$) dari seluruh pajak daerah se-Bali, memiliki kas mengendap $\text{Rp}2,27\text{ triliun}$ (tertinggi ke-11 nasional), di mana PHR menopang $60\%$–$80\%$ PAD Badung (pajak restoran naik dari $18\%$ pada 2023 menjadi $26\%$ terhadap PAD pada 2024).
* **Paradoks Kabupaten Bangli (43 DTW vs 39 DTW Badung):** Kabupaten Bangli tercatat memiliki $43$ DTW resmi—lebih banyak secara absolut dibandingkan Kabupaten Badung yang memiliki $39$ DTW (meski Badung mendominasi $324$ usaha wisata tirta). Namun, kontribusi Pajak Hotel terhadap PAD Bangli hanya mencapai $0,12\%$ dan Pajak Restoran hanya $8,16\%$ (walaupun efektivitas pemungutan pajak hotel Bangli mencapai $113,86\%$ dan pajak restoran $157,38\%$). Hal ini terjadi akibat pola kunjungan singkat tanpa berbelanja di UMKM kuliner dan akomodasi lokal, sementara rata-rata lama menginap wisatawan di hotel non-bintang Bali berkisar $2,40$–$2,50\text{ hari}$ (TPK $49,00\%$ pada Juli 2025 dan $50,26\%$ pada Agustus 2025).
* **Keterbatasan Subsidi Silang 10% PHR:** Skema transfer administratif $10\%$ PHR dari $3$ daerah donor (Badung, Gianyar, Denpasar) ke $6$ kabupaten penerima (Bangli, Buleleng, Jembrana, Karangasem, Klungkung, Tabanan) hanya memindahkan dana anggaran, bukan memindahkan wisatawan fisik ke pintu UMKM lokal.

| Kabupaten / Kota | Pendapatan APBD 2025 (Rp Miliar) | Belanja APBD 2025 (Rp Miliar) | Pembiayaan (Rp Miliar) | Status Transfer PHR | Karakteristik Aset, Pajak, & Tekanan Spasial |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Kab. Badung** | $10.671,75$ | $10.587,52$ | $-84,23$ | Donor ($10\%$ PHR) | $39$ DTW; $324$ wisata tirta; $48,60\%$ pajak Bali ($\text{Rp}4,86\text{ T}$); zona moratorium |
| **Kab. Gianyar** | $3.155,83$ | $3.330,56$ | $174,73$ | Donor ($10\%$ PHR) | Episentrum *gridlock* Ubud pada $3$–$4$ koridor utama; zona moratorium |
| **Kota Denpasar** | $3.107,72$ | $3.590,92$ | $0,00$ | Donor ($10\%$ PHR) | Simpul kemacetan Bypass Sanur & akses mal ICON Bali; zona moratorium |
| **Kab. Buleleng** | $2.375,94$ | $2.540,39$ | $164,45$ | Penerima Subsidi | Kawasan Kalibukbuk & Batu Ampar; target dispersi wilayah utara |
| **Kab. Tabanan** | $2.236,68$ | $2.313,45$ | $76,77$ | Penerima Subsidi | Ulun Danu Beratan & lumbung sawah produktif; zona proteksi lahan |
| **Kab. Karangasem** | $1.717,98$ | $1.803,43$ | $85,45$ | Penerima Subsidi | Antrean $3,5\text{ jam}$ di Lempuyang, namun Sidemen, Taman Ujung, & Candi Dasa lengang |
| **Kab. Klungkung** | $1.391,99$ | $1.567,99$ | $175,99$ | Penerima Subsidi | Kepadatan terfokus di Nusa Penida dibanding daratan Semarapura |
| **Kab. Bangli** | $1.204,33$ | $1.218,33$ | $14,00$ | Penerima Subsidi | $43$ DTW (Geopark Batur, Penglipuran, Air Terjun Kuning); Pajak Hotel $0,12\%$ PAD, Restoran $8,16\%$ PAD |
| **Kab. Jembrana** | $1.183,23$ | $1.223,23$ | $40,00$ | Penerima Subsidi | Kawasan Sungai Gelar & Sirkuit Subak Kaliakah; kapasitas ruang sangat longgar |

### 2.3 Tiga Hambatan Mikro-Spasial di Lapangan
1. **Antrean Monopolistik Titik Viral (Kasus Karangasem):** Di Candi Bentar Pura Penataran Agung Lempuyang (*Gates of Heaven*), wisatawan mengantre nomor foto selama $60$ hingga $210\text{ menit}$ ($1$–$3,5\text{ jam}$). Pada jam yang sama, lanskap berlatar Gunung Agung dan situs budaya di kabupaten yang sama—seperti Lembah Sidemen, Taman Ujung, Tulamben, dan Candi Dasa—sangat lengang.
2. **Kelumpuhan Koridor Jalan Sempit (Kasus Ubud, Canggu, & Sanur):** Jl. Raya Ubud dan $3$–$4$ jalan penghubungnya mengalami *gridlock* $11\text{ jam}$ penuh setiap hari (pukul $10.00$–$21.00\text{ WITA}$), di mana $90\%$ akses menuju restoran/atraksi bertumpu pada jalan arteri ini. Akibat rasio sekitar $1$ mobil berbadan lebar untuk setiap $5$ sepeda motor di jalan desa, jarak $7\text{ km}$ memakan waktu $60\text{ menit}$, jarak $10\text{ km}$ mobil memakan $90\text{ menit}$, dan rute Ubud–Seminyak memakan hampir $180\text{ menit}$ ($60\text{ menit}$ pertama terkunci di pusat Ubud). Di Canggu, kemacetan memuncak pukul $16.00\text{ WITA}$ (kontras dengan pukul $06.30$–$07.00\text{ WITA}$ yang lengang). Di Bypass Sanur, arus padat ke utara pukul $07.30\text{ WITA}$, berbalik pukul $11.00\text{ WITA}$, dan macet menuju ICON Bali pada akhir pekan setelah pukul $15.00\text{ WITA}$.
3. **Peluruhan Kepadatan pada Radius Mikro ($1$–$2\text{ km}$):** Tepat di luar Jl. Raya Ubud—hanya bergeser $1$ hingga $2\text{ km}$ dari pusat keramaian—jalanan langsung terbuka lebar dan banyak restoran, kafe, serta bar UMKM berkualitas yang kursinya kosong. Demikian pula, kepadatan ekstrem di *Ubud Monkey Forest* dapat disubstitusi dengan *Sangeh Monkey Forest* yang menawarkan hutan pala suci dan pura yang jauh lebih tenang.

---

## 3. Sasaran Bisnis & Matriks Penyelarasan Rubrik (*Business Objectives*)

Seluruh kebutuhan bisnis dalam dokumen ini dikunci terhadap bobot penilaian resmi **AIWIC Bali DigiFest 2026** serta aturan *Tie-Break* (Penentu Skor Kembar):

| Kode Sasaran | Sasaran Bisnis & Produk | Indikator Keberhasilan MVP (*Success Metrics*) | Kriteria Rubrik yang Dikunci (Tahap 1 / Final) |
| :--- | :--- | :--- | :--- |
| **BO-01** | Menghadirkan orkestrasi *Multimodal Agentic AI* yang krusial pada fungsi inti (*lulus AI Removal Test*). | $3$ Agen AI memproses ekstraksi visual, telemetri keramaian, dan *bundling* UMKM dalam $< 10\text{ detik}$. | **AI Relevance, Implementation & Technical Depth** ($25\%$ Tahap 1 / $25\%$ Final — **Tie-Breaker #1**) |
| **BO-02** | Menjamin keandalan produk $100\%$ saat diuji juri pada jam berapa pun tanpa gagal akibat limit/kekosongan API. | Arsitektur *3-Tier Telemetry Fallback* (*Live* $\rightarrow$ *Cached Forecast* $\rightarrow$ *Simulation Toggle*) berjalan tanpa *crash*. | **MVP Functionality & Product Reliability** ($20\%$ Tahap 1 / $25\%$ Final — **Tie-Breaker #2**) |
| **BO-03** | Mengonversi niat kunjungan dari titik jenuh ($\ge 75\%$) ke DTW & UMKM alternatif yang lengang ($\le 35\%$) dengan kemiripan atmosfer tinggi. | Menyediakan skema *Dual-Radius Rerouting* (Mikro $1$–$3\text{ km}$ & Regional $6$ kabupaten) + pasangan UMKM lokal. | **Problem-Solution Fit & Impact** ($20\%$ Tahap 1 / $15\%$ Final) & **Innovation** ($15\%$ / $15\%$ — **Tie-Breaker #3**) |
| **BO-04** | Memastikan transparansi proses AI (*Glass-Box UI*), kualitas kode repositori, dan kepatuhan *Responsible AI*. | Lolos $100\%$ *Technical Gate* (`PASS`), memiliki `README.md`, `.env.example` bersih, dan *Disclosure* lengkap. | **Technical Feasibility, Repo Quality, UX/UI, Demo & Compliance** ($20\%$ Total) |

---

## 4. Analisis Target Pengguna & Persona (*Target Users*)
*(Catatan: Digunakan untuk mengisi **Bab 2 Proposal Lampiran A**).*

1. **Persona Primer 1 — *The Aesthetic & Time-Conscious Traveler* (Wisatawan Mandiri Domestik/Mancanegara):**
   * **Konteks:** Memiliki waktu liburan singkat ($2,40$–$2,50\text{ hari}$ menginap) dan merencanakan kunjungan berdasarkan konten viral Instagram/TikTok.
   * **Pain Point:** Jadwal liburan hancur karena perjalanan $20\text{ menit}$ membengkak jadi $> 180\text{ menit}$, kelelahan mengantre foto $3,5\text{ jam}$ di Lempuyang, batal ikut kelas yoga atau terserang iritasi asap knalpot di macet Ubud/Seminyak, tetapi ragu pindah ke lokasi lain karena takut visualnya tidak sesuai ekspektasi.
   * **Kebutuhan Solusi:** Bukti kemiripan visual (*Vibe Match Breakdown*), kepastian data keramaian per jam, dan rekomendasi kuliner/UMKM autentik di lokasi tujuan pengganti.
2. **Persona Primer 2 — *The Trapped On-the-Go Tourist* (Wisatawan yang Sedang Terjebak Macet/Antrean):**
   * **Konteks:** Sudah berada di Jl. Raya Ubud pukul $13.00\text{ WITA}$ atau Canggu pukul $16.00\text{ WITA}$ dan membutuhkan pelarian segera.
   * **Kebutuhan Solusi:** Opsi *Micro-Radius Escape* (bergeser $1$–$3\text{ km}$ atau $5$–$10\text{ menit}$) menuju kafe subak, restoran lokal, atau pura tenang yang kursinya sedang kosong saat itu juga.
3. **Penerima Manfaat Ekonomi (*Beneficiary*) — UMKM Kuliner, Kopi, Kriya, & Desa Wisata Lokal:**
   * **Konteks:** Berada di zona penyangga ($1$–$3\text{ km}$ di luar koridor utama Ubud) atau di $6$ kabupaten penerima subsidi PHR (Bangli, Karangasem, Buleleng, Tabanan, Klungkung daratan, Jembrana).
   * **Kebutuhan Solusi:** Mesin *co-promotion* otomatis yang menyalurkan wisatawan dari titik *overcrowded* langsung ke lokasi usaha mereka.
4. **Persona Penguji (*Evaluator*) — Dewan Juri AIWIC Bali DigiFest 2026:**
   * **Konteks:** Menguji puluhan MVP dalam waktu terbatas dan melakukan *Technical Verification* dengan input berbeda dari video demo.
   * **Kebutuhan Solusi:** Akses *Clean-Start* tanpa *login wall*, tombol *Quick Preset* $1$ klik untuk kasus nyata Bali, input unggah foto bebas, sakelar simulasi jam sibuk, serta log penalaran AI yang terlihat nyata.

---

## 5. Alur Proses Bisnis & Perjalanan Pengguna (*User Journey*)
*(Catatan: Digunakan untuk mengisi **Bab 3 & Bab 6 Proposal Lampiran A**).*

Alur bisnis dirancang memenuhi syarat mutlak **Clean-Start Demo** (Buka Aplikasi $\rightarrow$ Masukkan Input $\rightarrow$ Jalankan Fungsi $\rightarrow$ AI Memproses $\rightarrow$ Output Muncul):

```text
[USER / JURI MEMBUKA WEB APP (TANPA LOGIN WALL)]
       │
       ├──► Jalur Cepat (1-Click Preset): Pilih studi kasus nyata (Pura Lempuyang / Jl. Raya Ubud / Canggu / Monkey Forest)
       └──► Jalur Bebas (Custom Input): Unggah foto referensi wisata + Pilih titik lokasi saat ini & jam WITA
                   │
                   ▼
[BACKEND API GATEWAY & 3-AGENT ORCHESTRATOR]
       │
       ├──► AGEN 1: Multimodal Vibe & Aesthetic Deconstructor (Vision LLM + Embeddings)
       │      • Mengekstrak 5 dimensi Vibe Vector dari gambar (Topografi, Arsitektur, Cahaya, Aktivitas, Kepadatan)
       │      • Menjalankan Vector Similarity Search terhadap Database DTW & UMKM Lokal Bali
       │
       ├──► AGEN 2: Real-Time Crowd Telemetry & Bottleneck Evaluator (Tool-Calling + 3-Tier Fallback)
       │      • Memanggil data kepadatan lokasi awal & kandidat alternatif (BestTime API / Cached Forecast / Simulation)
       │      • Menghitung Crowd Friction Score & menyaring kandidat dengan kepadatan <= 35% (Low / Below Average)
       │
       └──► AGEN 3: Micro-MSME Bundler, Fiscal Equity & Cultural Synthesizer (LLM Decision & Guardrail)
              • Membagi rekomendasi menjadi 2 opsi: Radius Mikro (1-3 km) & Radius Regional (Lintas Kabupaten + Equity Boost)
              • Memasangkan setiap DTW alternatif dengan 2 UMKM terdekat (Kuliner/Kopi/Kriya) + Arrival/Departure Hours
              • Menyusun panduan Etika Budaya Lokal (Responsible AI) & menghitung metrik waktu antre yang dihemat
                   │
                   ▼
[GLASS-BOX UI RESULT DASHBOARD]
  1. Live Agentic Thought Stream (Transparansi log eksekusi Agen 1, 2, dan 3 secara berurutan)
  2. Dual-Histogram Crowd Visualizer (Grafik batang merah lokasi viral vs grafik batang hijau lokasi alternatif + UMKM)
  3. Vibe Match Breakdown & Paket Rute DTW + UMKM (Skor kemiripan visual %, etika adat, & Fiscal/Ecological Impact Badge)
  4. Direct Action (Tautan navigasi Google Maps langsung ke DTW & UMKM terpilih)
```

---

## 6. Spesifikasi Kebutuhan Bisnis Fungsional (*Functional Business Requirements*)

Daftar kebutuhan bisnis ini menjadi acuan langsung pembuatan *Product Requirements Document* (PRD) dan *Technical Design Document* (TDD):

| Kode BR | Nama Kapabilitas | Deskripsi Detail Kebutuhan Bisnis | Prioritas MVP (7 Hari) |
| :--- | :--- | :--- | :---: |
| **BR-01** | *Frictionless Clean-Start & Quick Presets* | Halaman utama wajib langsung menampilkan antarmuka kerja tanpa mewajibkan *login*. Menyediakan $4$ tombol *Quick Preset* kasus nyata Bali (Candi Bentar Lempuyang, Jl. Raya Ubud, Ubud Monkey Forest, Simpul Canggu) serta kolom unggah foto bebas bagi juri. | **P0 (Wajib Tahap 1)** |
| **BR-02** | *Multimodal Visual Vibe Deconstruction* | Sistem wajib memproses gambar yang diunggah menggunakan *Vision LLM* untuk menghasilkan struktur JSON berisi $5$ dimensi *Vibe Vector* (topografi alam, arsitektur budaya, karakter pencahayaan, aktivitas utama, dan kepadatan visual) beserta *vector embedding*-nya. | **P0 (Wajib Tahap 1)** |
| **BR-03** | *Dual-Radius Spatial Rerouting* | Sistem wajib memberikan dua kategori rekomendasi substitusi: **(a) Opsi Mikro ($1$–$3\text{ km}$)** untuk pelarian cepat dari kemacetan koridor utama, dan **(b) Opsi Regional (Lintas Kabupaten)** untuk mengalihkan kunjungan ke $6$ kabupaten penerima subsidi PHR. | **P0 (Wajib Tahap 1)** |
| **BR-04** | *Automated Micro-MSME Bundling* | Setiap kartu DTW alternatif yang direkomendasikan wajib dipasangkan secara otomatis dengan $1$–$2$ UMKM lokal terkurasi di radius terdekatnya (warung autentik, kopi lokal, atau kerajinan desa) lengkap dengan alasan kecocokan dan jam kunjungan terbaik. | **P0 (Wajib Tahap 1)** |
| **BR-05** | *Hybrid Crowd Telemetry & 3-Tier Fallback* | Menampilkan data kepadatan skala relatif $0\%$–$100\%$, klasifikasi $5$ tingkat (*Low*, *Below average*, *Average*, *Above average*, *High*), prediksi $+2\text{ jam}$, serta *Arrival/Departure hours*. Wajib menerapkan *fallback* otomatis: *Live Busyness* $\rightarrow$ *Cached Hourly Forecast* $\rightarrow$ *Simulation Mode*. | **P0 (Wajib Tahap 1)** |
| **BR-06** | *Judge Stress-Test Simulation Toggle* | Menyediakan sakelar simulasi yang jujur dan transparan pada UI (misal: *"Mode Uji Juri: Simulasikan Jam Puncak / Lonjakan Viral $115\%$"*) agar juri dapat menguji kecerdasan *rerouting* AI kapan saja (termasuk saat menilai pada tengah malam WITA). | **P0 (Wajib Tahap 1)** |
| **BR-07** | *Glass-Box Agentic Thought Stream* | Menampilkan tahapan penalaran ketiga agen AI secara *real-time* pada UI saat proses analisis berlangsung guna membuktikan bahwa hasil berasal dari eksekusi AI nyata. | **P0 (Wajib Tahap 1)** |
| **BR-08** | *Dual-Histogram Crowd Visualizer* | Menampilkan grafik batang perbandingan jam populer antara lokasi awal yang padat (merah / *Live Surge*) dan lokasi alternatif beserta UMKM yang lengang (hijau tenang). | **P0 (Wajib Tahap 1)** |
| **BR-09** | *Responsible AI Cultural Guardrail & Impact Badge* | Menyertakan panduan ringkas etika budaya Bali (aturan kamen/selendang, larangan area suci pura), *disclaimer* akurasi prediksi keramaian, serta lencana penghematan waktu antre dan kontribusi pemerataan PAD/UMKM. | **P0 (Wajib Tahap 1)** |
| **BR-10** | *Self-Service MSME Onboarding & Shareable Trip Card* | Formulir pendaftaran mandiri bagi UMKM lokal baru untuk masuk ke database vektor dan fitur ekspor kartu rencana perjalanan. | **P1 (Improvement Window Final)** |
| **BR-11** | *Map-First Explore & Calm Alternatives* | Pintu masuk utama berupa peta: titik awal dari GPS atau pilihan kota (dapat dikoreksi dengan menggeser peta; GPS di luar Bali ditolak), filter suasana opsional, pemindaian radius dengan keramaian per tempat pada jam kunjungan, dan alternatif bersuasana mirip yang lebih sepi untuk tempat yang ramai (DECISIONS D-025). | **P0 (Wajib Tahap 1)** |
| **BR-12** | *In-App Trip Planner* | Itinerary hingga 5 tujuan dengan jam tiba, keramaian saat tiba, tambahan waktu dari koridor macet aktif, skor perjalanan (paparan keramaian, zona merah, mampir UMKM, tujuan di kabupaten penerima), grafik keramaian per jam berangkat, dan ekspor multi-stop ke Google Maps sebagai langkah terakhir (D-026). | **P0 (Wajib Tahap 1)** |
| **BR-13** | *MARGI Copilot (Agentic Trip Assistant)* | Asisten AI yang memahami permintaan bebas berbahasa Indonesia/Inggris (termasuk situasi *kejebak macet* dan *sudah punya rencana*), memanggil *tools* perhitungan backend, dan mengembalikan narasi + maksimal 3 kartu saran bertipe (geser jam, tukar tujuan, urutkan ulang, tambah/hapus tujuan) yang angkanya dihitung kode. Saran bisa diterapkan dan diurungkan; setiap jawaban menyertakan jejak penalaran dan label sumber narasi (LLM/Templat). | **P0 (Wajib Tahap 1)** |
| **BR-14** | *Real Data Sources with Honest Labels* | Data tempat, rute/waktu tempuh, lalu lintas, foto, dan keramaian berasal dari penyedia nyata (lihat `docs/DATA-SOURCES.md`) dengan *cache* dan *fallback* terdokumentasi. Setiap angka keramaian berlabel Langsung/Prakiraan/Simulasi, dan setiap foto pihak ketiga menampilkan atribusi sesuai lisensinya. | **P0 (Wajib Tahap 1)** |

---

## 7. Aturan Bisnis & Rumusan Matematis Algoritma (*Core Business Rules*)
*(Catatan: Digunakan untuk mengisi **Bab 4 Proposal Lampiran A** dan bahan jawaban saat sesi **Technical Verification**).*

### 7.1 Aturan Normalisasi Kapasitas Relatif (*Cross-Venue Relative Rule*)
Mengacu pada karakteristik telemetri BestTime, persentase kepadatan $B_v(t) \in [0, 100]$ pada jam $t$ untuk suatu lokasi $v$ merepresentasikan rasio terhadap puncak kapasitas mingguan lokasi tersebut ($100\% = \text{jam tersibuk mingguan di lokasi } v$), bukan jumlah kepala absolut. Nilai $80\%$ pada kafe UMKM kecil di luar Ubud dan $80\%$ pada DTW besar sama-sama mencerminkan tingkat kejenuhan ruang dan ketidaknyamanan antrean yang setara. Saat terjadi lonjakan viral mendadak, sinyal *Live Busyness* $L_v(t)$ dapat melampaui $100\%$ (misalnya $115\%$).

### 7.2 Rumusan Skor Friksi Keramaian (*Crowd Friction Score*)
Agen 2 mengevaluasi tingkat kejenuhan suatu lokasi $v$ pada jam kedatangan $t$ (dalam zona waktu WITA) menggunakan fungsi *Crowd Friction Score* $CFS(v, t)$ sebagai berikut:

$$CFS(v, t) = w_1 \cdot B_{\text{eff}}(v, t) + w_2 \cdot F(v, t + 2) + w_3 \cdot P_{\text{corridor}}(v, t)$$

Di mana:
* $B_{\text{eff}}(v, t)$ adalah kepadatan efektif saat ini: menggunakan nilai *Live Busyness* $L_v(t)$ jika tersedia (*not null*), atau beralih otomatis (*fallback*) ke *Hourly Forecast* $F(v, t)$ jika sinyal *live* kosong, atau menggunakan nilai simulasi $S_v(t)$ apabila *Judge Stress-Test Simulation Toggle* diaktifkan.
* $F(v, t + 2)$ adalah proyeksi kepadatan $2\text{ jam}$ ke depan (*In 2 hours forecasted*) pada skala $[0, 100]$.
* $P_{\text{corridor}}(v, t)$ adalah penalti penguncian koridor jalan (*gridlock penalty*) bernilai $25$ apabila lokasi $v$ berada di dalam koridor kritis pada jam terlarang (seperti Jl. Raya Ubud pada $10.00 \le t \le 21.00\text{ WITA}$, simpul Canggu pada $15.00 \le t \le 18.00\text{ WITA}$, atau Bypass Sanur pada jam puncak), dan bernilai $0$ di luar kondisi tersebut.
* Bobot standar ditetapkan pada $w_1 = 0,50$, $w_2 = 0,30$, dan $w_3 = 0,20$.

**Aturan Keputusan Penyaringan (Agen 2):**
* Jika lokasi tujuan awal memiliki $CFS(v_{\text{origin}}, t) \ge 75$ atau $B_{\text{eff}}(v_{\text{origin}}, t) \ge 75\%$, lokasi ditandai sebagai **Zona Merah (*High Friction / Reroute Recommended*)**.
* Kandidat DTW dan UMKM alternatif $v_{\text{alt}}$ hanya lolos saringan apabila berstatus buka (*Open*) dan memiliki prediksi kepadatan pada jam kedatangan $B_{\text{eff}}(v_{\text{alt}}, t) \le 35\%$ (kategori *Low* atau *Below average*).

### 7.3 Rumusan Peringkat Substitusi & Bobot Pemerataan Fiskal (*Vibe-Equity Ranking Score*)
Untuk setiap kandidat alternatif $v_{\text{alt}}$ yang lolos saringan kepadatan Agen 2, Agen 1 dan Agen 3 menghitung skor peringkat akhir $R(v_{\text{alt}}, v_{\text{ref}}, t)$ menggunakan kemiripan kosinus vektor atmosfer (*Cosine Similarity*) dan insentif pemerataan ekonomi daerah:

$$\text{Sim}_{\text{vibe}}(v_{\text{alt}}, v_{\text{ref}}) = \frac{\mathbf{E}(v_{\text{alt}}) \cdot \mathbf{E}(v_{\text{ref}})}{\|\mathbf{E}(v_{\text{alt}})\| \|\mathbf{E}(v_{\text{ref}})\|} \times 100$$

$$R(v_{\text{alt}}, v_{\text{ref}}, t) = \alpha \cdot \text{Sim}_{\text{vibe}}(v_{\text{alt}}, v_{\text{ref}}) + \beta \cdot \left(100 - CFS(v_{\text{alt}}, t)\right) + \gamma \cdot E_{\text{fiscal}}(v_{\text{alt}})$$

Di mana:
* $\mathbf{E}(v)$ adalah vektor *embedding* atmosfer hasil ekstraksi $5$ dimensi visual. Kandidat wajib memenuhi ambang batas minimum $\text{Sim}_{\text{vibe}} \ge 70\%$.
* $E_{\text{fiscal}}(v_{\text{alt}})$ adalah **Fiscal Equity Boost** bernilai $100$ apabila DTW/UMKM berlokasi di salah satu dari $6$ kabupaten penerima subsidi PHR (Bangli, Karangasem, Buleleng, Tabanan, Klungkung daratan, Jembrana) atau di zona penyangga mikro $1$–$3\text{ km}$ di luar koridor jenuh, serta bernilai $0$ jika berada di titik jenuh utama.
* Bobot komposisi ditetapkan pada $\alpha = 0,50$ (kesamaan estetika), $\beta = 0,35$ (kenyamanan ruang/sepi), dan $\gamma = 0,15$ (dampak pemerataan UMKM/PAD).

---

## 8. Manajemen Ruang Lingkup 7 Hari & Target Eksekusi (*Scope Management*)

Sebagai pengembang tunggal (*solo builder*) yang dibantu *AI coding assistant* dengan tenggat maksimal $7\text{ hari}$, pemotongan ruang lingkup berikut bersifat mengikat agar lolos **Technical Gate (PASS/FAIL)**:

### 8.1 Termasuk dalam MVP Tahap 1 (*In-Scope*)
1. **Aplikasi Web Publik Aktif:** Dapat diakses langsung oleh juri melalui URL *deployment* tanpa instalasi lokal yang rumit.
2. **Dataset Kurasi Berpresisi Tinggi ($30$–$40$ Entitas Bali):** Mencakup titik viral utama (Pura Lempuyang, Jl. Raya Ubud, Ubud Monkey Forest, Canggu, Bypass Sanur) beserta pasangan DTW alternatif dan UMKM kuliner/kopi/kriya di Bangli (Geopark Batur, Penglipuran, Air Terjun Kuning), Karangasem (Sidemen, Taman Ujung, Candi Dasa), Badung Utara (Sangeh), Tabanan, Buleleng, serta zona penyangga $1$–$2\text{ km}$ di luar pusat Ubud.
3. **Penyimpanan *Cache* Telemetri (`venue_id`):** Sesuai prinsip *forecast-once* untuk menghemat kuota API selama masa penjurian, profil *Hourly Forecast* mingguan disimpan di database lokal dan dikombinasikan dengan pemanggilan API langsung serta *Simulation Toggle*.

### 8.2 Di Luar MVP Tahap 1 (*Out-of-Scope* — Dilarang Dikerjakan Minggu Ini)
1. **Transaksi Pembayaran / *Booking Gateway*:** Tidak membangun fitur *checkout* pembayaran di dalam aplikasi; konversi dilakukan melalui pengalihan rute Google Maps dan informasi profil UMKM.
2. **Autentikasi Berlapis:** Tidak memasang halaman *login/register* wajib di depan fitur utama karena berisiko menghambat pengujian *Clean-Start* oleh juri.
3. **Scraping Ilegal Google Maps:** Dilarang melakukan *DOM scraping* ke halaman Google Maps karena melanggar ketentuan layanan dan rawan pemblokiran IP server saat diuji juri.

### 8.3 Jadwal Eksekusi 7 Hari (*7-Day Sprint Plan*)
* **Hari 1:** Bedah PRD & TDD bersama *AI coding assistant*, inisialisasi repositori GitHub, dan penyusunan skema database JSON/PostgreSQL untuk $30$–$40$ DTW & UMKM Bali.
* **Hari 2:** Implementasi *Backend Agent 1* (*Vision LLM* ekstraksi $5$ dimensi *vibe* + pencarian kemiripan vektor).
* **Hari 3:** Implementasi *Backend Agent 2 & 3* (Integrasi telemetri keramaian, rumus $CFS(v,t)$, *3-Tier Fallback*, *Micro-MSME Bundling*, dan aturan etika budaya).
* **Hari 4:** Pembangunan *Frontend Glass-Box UI* (*Quick Presets*, unggah foto, *Live Agentic Thought Stream*, dan *Dual-Histogram Visualizer*).
* **Hari 5:** Integrasi menyeluruh (*End-to-End*), pembuatan fitur *Judge Stress-Test Simulation Toggle*, dan pengujian responsivitas web.
* **Hari 6:** *Deployment* ke produksi, pengujian beban kuota API, pembersihan `.env.example`, dan penguncian rilis `v1.0-submission`.
* **Hari 7:** Penyelesaian dokumen **Proposal PDF Maksimal 5 Halaman (Lampiran A)**, `README.md` (Lampiran B), dan **AI & Technology Disclosure (Lampiran C)**.

---

## 9. Diferensiasi, Dampak, & Peta Jalan Pengembangan (*Innovation & Scalability*)
*(Catatan: Digunakan untuk mengisi **Bab 7 & Bab 8 Proposal Lampiran A**).*

### 9.1 Matriks Diferensiasi Produk
| Parameter Pembanding | Google Maps / Navigasi Standar | Chatbot AI Itinerary Biasa (LLM Wrapper) | **MARGI AI (Solusi Kita)** |
| :--- | :--- | :--- | :--- |
| **Fokus Penyelesaian Masalah** | Mencari rute jalan tercepat menuju titik kemacetan yang sama. | Menghasilkan daftar teks jadwal wisata generik yang justru sering merekomendasikan tempat viral yang macet. | **Substitusi tujuan berbasis kemiripan atmosfer visual (*Vibe-Preserving*) dan penghindaran keramaian.** |
| **Pemahaman Estetika Visual** | Tidak ada (berbasis kata kunci nama tempat). | Rendah (hanya berbasis teks *prompt*). | **Tinggi (*Multimodal Vision* mengekstrak $5$ dimensi estetika dari foto/konten viral).** |
| **Kesadaran Keramaian & Koridor** | Menampilkan macet jalan, tetapi tidak memberi alternatif tempat dengan *vibe* serupa. | Buta terhadap kepadatan *real-time* dan jam kritis koridor lokal Bali. | **Menghitung *Crowd Friction Score*, jam kedatangan optimal, dan *Dual-Radius Rerouting*.** |
| **Dampak ke UMKM & PAD Daerah** | Memusatkan trafik di bisnis populer yang sudah ramai. | Bias popularitas (hanya menyebut tempat terkenal di Badung/pusat Ubud). | **Memberikan *Fiscal Equity Boost* ($+15\%$) dan *bundling* otomatis ke UMKM di zona sepi & $6$ kabupaten berkembang.** |

### 9.2 Keterbatasan MVP Saat Ini (*Known Limitations*)
1. Cakupan data DTW dan UMKM pada MVP Tahap 1 dibatasi pada $30$–$40$ titik terkurasi di koridor paling kritis Bali untuk menjamin kecepatan respons dan efisiensi kuota API selama masa penjurian.
2. Sinyal *Live Busyness* pada lokasi desa wisata yang sangat terpencil terkadang bernilai *null* dari penyedia telemetri global, sehingga sistem secara transparan beralih menggunakan kurva *Hourly Forecast* mingguan dan menyediakan mode simulasi bagi penguji.

---

## 10. Kepatuhan Kompetisi, Keamanan, & Template Disclosure (*Compliance*)
*(Catatan: Mengunci kepatuhan **Bab 7, 8, 11, 12 Panduan Peserta** serta **Lampiran B & C**).*

### 10.1 Aturan Keamanan & Privasi Data (*Zero Secret Leak & Responsible AI*)
1. **Keamanan Repositori:** Dilarang keras menyimpan *API Key*, *database credential*, atau *secret token* di dalam kode sumber publik. Seluruh kunci wajib dipanggil melalui *environment variables* dan didokumentasikan namanya saja di dalam file `.env.example`.
2. **Privasi Input Pengguna:** Foto referensi yang diunggah pengguna hanya dianalisis sementara untuk ekstraksi atribut visual dan tidak disimpan sebagai data pribadi publik.
3. **Version Locking:** Versi yang diajukan pada batas waktu Tahap 1 wajib ditandai dengan *Git tag* `v1.0-submission` (dan `v2.0-final` pada tahap final) beserta pencatatan *commit hash* pada proposal.

### 10.2 Draf Kerangka AI & Technology Disclosure (Siap Salin ke Lampiran C)
| Komponen Disclosure | Isi Spesifikasi Peserta (Sesuaikan Saat Kode Selesai) |
| :--- | :--- |
| **Nama Produk** | MARGI AI |
| **Framework / Frontend** | `[Isi saat TDD: misal Next.js / React + Tailwind CSS + Lucide Icons + Recharts]` |
| **Backend / Runtime** | `[Isi saat TDD: misal Next.js API Routes / Node.js atau FastAPI Python]` |
| **Database / Storage** | `[Isi saat TDD: misal Supabase PostgreSQL + pgvector / Local Curated Vector JSON]` |
| **Hosting / Deployment** | `[Isi saat TDD: misal Vercel / Railway / Render]` |
| **AI Model / API / Method** | *Multimodal Vision LLM* (ekstraksi $5$ dimensi atmosfer), *Text Embedding Model* (*Cosine Similarity Search*), & *Multi-Agent Workflow* ($3$ agen dengan *tool-calling* ke telemetri keramaian). |
| **Peran AI dalam Produk** | Komponen inti pemrosesan: mendekonstruksi estetika foto referensi wisata, mengevaluasi skor friksi keramaian lintas koridor, dan menyintesis paket rute substitusi DTW + UMKM beserta panduan etika budaya lokal. |
| **Dataset / Data Source** | Dataset kurasi DTW & UMKM Provinsi Bali (bersumber dari publikasi statistik Dinas Pariwisata Bali, DJPK Kemenkeu, BPS Bali) dikombinasikan dengan BestTime.app Foot Traffic API & Google Places API. |
| **Open-source Libraries** | `[Isi daftar package.json / requirements.txt utama]` |
| **Template / Boilerplate** | `[Tulis "Tidak menggunakan template berbayar; dibangun dari inisialisasi standar framework" atau sebutkan jika ada]` |
| **AI Coding Assistant** | Menggunakan *AI Coding Assistant* (`[Sebutkan jujur: misal Cursor / Claude / Gemini / GitHub Copilot]`) untuk akselerasi pembuatan *boilerplate*, *debugging*, dan penyusunan dokumentasi teknis. Seluruh arsitektur, logika algoritma, dan kode sumber dipahami serta diuji penuh oleh peserta. |
| **Pre-existing Components** | `Tidak ada (100% dikembangkan khusus selama periode kompetisi AIWIC Bali DigiFest 2026).` |
| **Third-party Assets / Credits** | BestTime.app API, Google Maps/Places API, data publik BPS & Disparda Provinsi Bali. |