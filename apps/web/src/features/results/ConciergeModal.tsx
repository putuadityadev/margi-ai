import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { RouteCard as RouteCardType, AnalysisResult } from '@margi-ai/shared';
import {
  Button,
  ClockIcon,
  StoreIcon,
  CompassIcon,
  MapPinIcon,
  CheckCircleIcon,
  SendIcon,
  MessageSquareIcon,
} from '../../components/ui';
import { track } from '../../lib/track';

export interface ConciergeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly origin: AnalysisResult['origin'];
  readonly activeAlternative?: RouteCardType | undefined;
  readonly onSelectAlternative?: (venueId: string) => void;
  readonly onAccPlan: (chosenVenueId: string, mode: 'reroute' | 'adjusted_time') => void;
}

interface ChatMessage {
  readonly id: string;
  readonly sender: 'ai' | 'user';
  readonly text: string;
  readonly time: string;
  readonly ctaLabel?: string;
  readonly ctaAction?: () => void;
}

type MapPointKey = 'origin' | 'msme' | 'alt';

export function ConciergeModal({
  isOpen,
  onClose,
  origin,
  activeAlternative,
  onSelectAlternative,
  onAccPlan,
}: ConciergeModalProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');

  const [step, setStep] = useState<number>(0); // 0: Reality, 1: Timeline, 2: Calmer Spot & Map, 3: Decision & Chat
  const [selectedHour, setSelectedHour] = useState<number>(7);
  const [activeMapPin, setActiveMapPin] = useState<MapPointKey>('alt');
  const [inputText, setInputText] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const originName = isId
    ? origin.venue.nameId || origin.venue.nameEn
    : origin.venue.nameEn || origin.venue.nameId;

  const altName = activeAlternative
    ? isId
      ? activeAlternative.venue.nameId || activeAlternative.venue.nameEn
      : activeAlternative.venue.nameEn || activeAlternative.venue.nameId
    : isId
      ? 'Pura Kehen'
      : 'Kehen Temple';

  const timeSaved = activeAlternative?.impact.timeSavedMin[1] ?? 45;
  const vibeMatch = Math.round(activeAlternative?.simVibe ?? 85);
  const msmeCount = activeAlternative?.impact.supportsMsmeCount ?? 1;
  const primaryMsme = activeAlternative?.msme[0];
  const msmeName = primaryMsme
    ? isId
      ? primaryMsme.venue.nameId || primaryMsme.venue.nameEn
      : primaryMsme.venue.nameEn || primaryMsme.venue.nameId
    : isId
      ? 'Warung Kopi & Kuliner Lokal'
      : 'Local Warung & Coffee';

  // Photo previews with reliable local fallbacks
  const originImg = origin.venue.imageUrl || '/presets/tegallalang.webp';
  const altImg = activeAlternative?.venue.imageUrl || '/venues/kehen.webp';
  const msmeImg = primaryMsme?.venue.imageUrl || '/venues/warung-bukit-asri.webp';

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (isOpen) {
      track('concierge_modal_opened', { originId: origin.venue.id });
      setMessages([
        {
          id: 'msg-welcome',
          sender: 'ai',
          text: isId
            ? `Halo! Saya MARGI AI. Saya mendeteksi antrean foto di ${originName} mencapai ~${origin.queueEstimateMin} menit. Kami merekomendasikan rute tenang ke ${altName} dengan suasana setara (${vibeMatch}% mirip) dan bebas antrean.`
            : `Hello traveler! I am MARGI AI. I detected that ${originName} has a ~${origin.queueEstimateMin} min queue. We recommend rerouting to ${altName} for an identical tranquil vibe without waiting.`,
          time: 'Baru saja',
        },
      ]);
    }
  }, [isOpen, origin.venue.id, originName, origin.queueEstimateMin, altName, vibeMatch, isId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSendPrompt = (promptText: string): void => {
    if (!promptText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptText,
      time: 'Baru saja',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    track('concierge_chat_prompt_sent', { prompt: promptText });

    setTimeout(() => {
      let replyText = '';
      const lower = promptText.toLowerCase();

      if (lower.includes('makan') || lower.includes('lunch') || lower.includes('warung') || lower.includes('kuliner')) {
        replyText = isId
          ? `Di koridor rute menuju ${altName}, kami merekomendasikan mampir ke ${msmeName}. Menyajikan masakan khas Bali otentik dan kopi lereng gunung yang sejuk. Sangat pas untuk makan siang sekitar pukul 12:30 WITA.`
          : `Along the corridor to ${altName}, we recommend stopping at ${msmeName}. They serve authentic Balinese specialties and highland coffee. Stopping around 12:30 PM is ideal.`;
      } else if (lower.includes('motor') || lower.includes('mobil') || lower.includes('jalan') || lower.includes('kondisi')) {
        replyText = isId
          ? `Jalur alternatif ke ${altName} sangat mulus untuk motor maupun mobil. Melewati hamparan sawah dan perbukitan asri tanpa tanjakan macet seperti di jalur utama Lempuyang.`
          : `The road to ${altName} is smooth for scooters and cars. Scenic paved winding roads through rice terraces without steep traffic bottlenecks.`;
      } else if (lower.includes('mirip') || lower.includes('vibe') || lower.includes('foto') || lower.includes('suasana')) {
        replyText = isId
          ? `${altName} memiliki kemiripan arsitektur ${vibeMatch}%. Sama-sama candi bentar batu kuno berundak dan atmosfer magis Bali timur, namun Anda bebas berfoto tanpa antre berjam-jam!`
          : `${altName} features an ${vibeMatch}% architectural match. Ancient terraced stone gates and eastern Bali heritage without queue fatigue!`;
      } else {
        replyText = isId
          ? `Rute tenang ke ${altName} menghemat ~${timeSaved} menit waktu Anda dan memberikan pengalaman Bali yang lebih hening. Mau langsung konfirmasi rencana ini?`
          : `The calm detour to ${altName} saves ~${timeSaved} minutes and offers a serene experience. Would you like to confirm this plan?`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-reply-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        time: 'Baru saja',
        ctaLabel: isId ? `Setujui Rencana ${altName} →` : `Confirm ${altName} Plan →`,
        ctaAction: () => {
          if (activeAlternative) {
            onSelectAlternative?.(activeAlternative.venue.id);
            onAccPlan(activeAlternative.venue.id, 'reroute');
          }
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 450);
  };

  const stepLabels = [
    isId ? '01 KONDISI' : '01 REALITY',
    isId ? '02 DINAMIKA' : '02 TIMING',
    isId ? '03 PETA RUTE' : '03 ROUTE MAP',
    isId ? '04 KEPUTUSAN' : '04 DECISION',
  ];

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MARGI AI Interactive Decision Concierge"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-charcoal/70 backdrop-blur-sm overflow-hidden"
      data-testid="concierge-modal"
    >
      <div
        ref={modalRef}
        className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] max-w-2xl bg-white sm:border-2 border-ink text-ink rounded-none flex flex-col overflow-hidden"
      >
        {/* 1. Header Toolbar with Swiss Stepper & Skip Action */}
        <div className="bg-parchment border-b border-ash/80 px-4 py-2.5 sm:py-3 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-none bg-lime border border-ink shrink-0" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-ink truncate">
                MARGI AI CONCIERGE
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-graphite hover:text-ink font-medium px-2 py-0.5 rounded-none border border-ash/70 bg-white hover:bg-parchment transition cursor-pointer shrink-0"
              data-testid="concierge-skip-button"
            >
              {isId ? 'Lewati ✕' : 'Skip ✕'}
            </button>
          </div>

          {/* Stepper Progress Segments */}
          <div className="grid grid-cols-4 gap-1.5">
            {stepLabels.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(idx)}
                className="text-left space-y-1 cursor-pointer group min-w-0 w-full"
              >
                <div
                  className={`h-1.5 rounded-none transition-all ${
                    idx <= step ? 'bg-ink' : 'bg-ash/60'
                  } ${idx === step ? 'ring-1 ring-lime' : ''}`}
                />
                <span
                  className={`block text-[9px] sm:text-[10px] font-medium truncate ${
                    idx === step ? 'text-ink' : 'text-stone group-hover:text-graphite'
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Scrollable Modal Content with Smooth Step Transitions (min-h-0 prevents flex overflow) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* ================= STEP 0: REALITY CHECK (PHOTO + BOTTLENECK) ================= */}
          {step === 0 && (
            <div key="step-0" className="animate-step-in space-y-3.5" data-testid="concierge-step-0">
              {/* Alert Badge + Title */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-crowd-high/15 text-crowd-high border border-crowd-high/40 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-none bg-crowd-high animate-pulse" />
                  <span>{isId ? 'LAPORAN LANGSUNG: KONDISI GERBANG' : 'LIVE REPORT: GATE STATUS'}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-medium text-ink leading-tight break-words">
                  {originName}: {isId ? 'Status Sangat Padat' : 'Heavily Congested'}
                </h2>
                <p className="text-xs sm:text-sm text-graphite">
                  {isId
                    ? `Antrean foto ~${origin.queueEstimateMin} menit di bawah cuaca terik tanpa peneduh.`
                    : `Gate photo queue is ~${origin.queueEstimateMin} mins under intense direct sun.`}
                </p>
              </div>

              {/* Real Destination Photo Preview with Solid Swiss Caption (Zero Gradients) */}
              <div className="border border-ink bg-parchment rounded-none overflow-hidden">
                <img
                  src={originImg}
                  alt={originName}
                  className="w-full aspect-[16/9] sm:aspect-[16/8] object-cover block"
                  loading="eager"
                />
                <div className="bg-ink text-white p-3 flex items-center justify-between gap-2 border-t border-ink">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-medium tracking-wider text-lime block">
                      {isId ? 'DESTINASI TUJUAN ANDA' : 'TARGET DESTINATION'}
                    </span>
                    <h3 className="text-sm sm:text-base font-medium text-white truncate">
                      {originName}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-crowd-high text-white text-xs font-medium border border-white shrink-0">
                    ● {origin.snapshot.bEff}% {isId ? 'Padat' : 'Peak'}
                  </span>
                </div>
              </div>

              {/* 3 Sharp Fact Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 bg-parchment border border-ash/80 rounded-none flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-none bg-crowd-high" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-medium text-graphite tracking-wider truncate">
                      {isId ? 'Kepadatan' : 'Crowd Level'}
                    </span>
                    <span className="block text-sm font-medium text-ink tabular-nums truncate">
                      {origin.snapshot.bEff}% · {isId ? 'Puncak' : 'Peak'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-parchment border border-ash/80 rounded-none flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
                    <ClockIcon size={15} className="text-ink" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-medium text-graphite tracking-wider truncate">
                      {isId ? 'Tunggu Foto' : 'Photo Wait'}
                    </span>
                    <span className="block text-sm font-medium text-ink tabular-nums truncate">
                      ~{origin.queueEstimateMin} {isId ? 'Menit' : 'Mins'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-parchment border border-ash/80 rounded-none flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
                    <CompassIcon size={15} className="text-ink" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-medium text-graphite tracking-wider truncate">
                      {isId ? 'Jalur Masuk' : 'Corridor'}
                    </span>
                    <span className="block text-sm font-medium text-ink truncate">
                      {isId ? 'Tanjakan Padat' : 'Slow Queue'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 1: BEST TIMING & SIMULATION ================= */}
          {step === 1 && (
            <div key="step-1" className="animate-step-in space-y-4" data-testid="concierge-step-1">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-lime text-ink border border-ink text-[11px] font-medium">
                  <ClockIcon size={13} className="text-ink" />
                  <span>{isId ? 'SIMULASI WAKTU BERKUNJUNG' : 'HOURLY TIMELINE'}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-medium text-ink leading-tight break-words">
                  {isId ? 'Pilih Jam Kunjungan Terbaik' : 'Best Visiting Hours'}
                </h2>
                <p className="text-xs sm:text-sm text-graphite">
                  {isId
                    ? 'Ketuk jam di bawah untuk melihat perbedaan kondisi visual matahari dan antrean:'
                    : 'Tap time slots to simulate sun exposure and queue volume:'}
                </p>
              </div>

              {/* Sun & Crowd Reaction Visualization (Solid Tonal Backgrounds, Zero Gradients) */}
              <div className="border border-ash/80 bg-parchment p-3 rounded-none overflow-hidden relative">
                <svg
                  viewBox="0 0 380 110"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-28 block mx-auto select-none"
                >
                  <rect
                    x="0"
                    y="0"
                    width="380"
                    height="110"
                    fill={selectedHour === 7 ? '#f4f7f2' : selectedHour === 12 ? '#fffcf5' : '#fcf5ed'}
                  />

                  {/* Sun Position */}
                  <circle
                    cx={selectedHour === 7 ? 60 : selectedHour === 12 ? 190 : 320}
                    cy={selectedHour === 12 ? 18 : 38}
                    r="13"
                    fill={selectedHour === 7 ? '#e8ffb0' : selectedHour === 12 ? '#ffb03b' : '#ff7a3b'}
                    stroke="#14140f"
                    strokeWidth="1.5"
                    className="transition-all duration-500"
                  />

                  {/* Temple Gateway Silhouette */}
                  <path d="M165 100h15V45l-7 8v15h-8v32Z" fill="#14140f" />
                  <path d="M200 100h-15V45l7 8v15h8v32Z" fill="#14140f" />
                  <line x1="140" y1="100" x2="225" y2="100" stroke="#14140f" strokeWidth="2.5" />

                  {/* Dynamic Queue Figures */}
                  {selectedHour === 7 ? (
                    <g transform="translate(100, 75)">
                      <circle cx="5" cy="5" r="3.5" fill="#2f9e5b" />
                      <path d="M1 24v-10c0-2 2-3 4-3s4 1 4 3v10" stroke="#2f9e5b" strokeWidth="2" />
                      <text x="18" y="16" fill="#2f9e5b" fontSize="11" fontWeight="bold">
                        {isId ? 'Bebas Antre (0 mnt)' : 'Zero Queue (0 min)'}
                      </text>
                    </g>
                  ) : selectedHour === 12 ? (
                    [0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <g key={i} transform={`translate(${45 + i * 14}, 75)`}>
                        <circle cx="5" cy="3" r="3" fill="#e0442b" />
                        <path d="M1 24v-10c0-2 2-3 4-3s4 1 4 3v10" stroke="#e0442b" strokeWidth="1.8" />
                      </g>
                    ))
                  ) : (
                    [0, 1].map((i) => (
                      <g key={i} transform={`translate(${105 + i * 16}, 75)`}>
                        <circle cx="5" cy="3" r="3" fill="#e59822" />
                        <path d="M1 24v-10c0-2 2-3 4-3s4 1 4 3v10" stroke="#e59822" strokeWidth="1.8" />
                      </g>
                    ))
                  )}
                </svg>
              </div>

              {/* 3 Interactive Hour Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHour(7)}
                  className={`p-3 text-left border transition-all cursor-pointer min-w-0 ${
                    selectedHour === 7
                      ? 'border-ink bg-white ring-2 ring-ink'
                      : 'border-ash/80 bg-parchment hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink truncate">06:30 – 08:30 WITA</span>
                    <span className="w-2 h-2 rounded-none bg-crowd-low shrink-0" />
                  </div>
                  <strong className="block text-sm font-medium text-ink truncate">
                    {isId ? 'Pagi Sejuk (Tenang)' : 'Early Morning'}
                  </strong>
                  <span className="text-[11px] text-graphite block mt-0.5 truncate">
                    {isId ? '0 mnt antre · Cahaya magis' : '0 min wait · Soft mist light'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHour(12)}
                  className={`p-3 text-left border transition-all cursor-pointer min-w-0 ${
                    selectedHour === 12
                      ? 'border-ink bg-white ring-2 ring-ink'
                      : 'border-ash/80 bg-parchment hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink truncate">10:00 – 14:00 WITA</span>
                    <span className="w-2 h-2 rounded-none bg-crowd-high shrink-0" />
                  </div>
                  <strong className="block text-sm font-medium text-ink truncate">
                    {isId ? 'Siang (Puncak Padat)' : 'Midday (Peak)'}
                  </strong>
                  <span className="text-[11px] text-graphite block mt-0.5 truncate">
                    {isId ? 'Antrean ~210 mnt · Panas terik' : '~210 min wait · Intense sun'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHour(16)}
                  className={`p-3 text-left border transition-all cursor-pointer min-w-0 ${
                    selectedHour === 16
                      ? 'border-ink bg-white ring-2 ring-ink'
                      : 'border-ash/80 bg-parchment hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink truncate">15:30 – 17:30 WITA</span>
                    <span className="w-2 h-2 rounded-none bg-crowd-below shrink-0" />
                  </div>
                  <strong className="block text-sm font-medium text-ink truncate">
                    {isId ? 'Sore Santai (Mereda)' : 'Late Afternoon'}
                  </strong>
                  <span className="text-[11px] text-graphite block mt-0.5 truncate">
                    {isId ? 'Antrean ~30 mnt · Angin sejuk' : '~30 min wait · Pleasant breeze'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CALMER SPOT & ANIMATED ROUTE MAP ================= */}
          {step === 2 && (
            <div key="step-2" className="animate-step-in space-y-4" data-testid="concierge-step-2">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-lime text-ink border border-ink text-[11px] font-medium">
                  <CheckCircleIcon size={13} className="text-ink" />
                  <span>{isId ? 'PENGALIHAN CERDAS: PETA INTERAKTIF' : 'SMART REROUTE: INTERACTIVE MAP'}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-medium text-ink leading-tight break-words">
                  {altName}: {isId ? 'Suasana Serupa, Bebas Antrean' : 'Matching Vibe, Zero Wait'}
                </h2>
                <div className="flex items-center gap-2 flex-wrap text-xs text-graphite">
                  <span className="px-2 py-0.5 bg-lime text-ink font-medium border border-ink">
                    {vibeMatch}% {isId ? 'kemiripan vibe' : 'vibe match'}
                  </span>
                  <span>·</span>
                  <span className="font-medium text-ink">
                    {isId ? `Hemat ~${timeSaved} mnt antre` : `Save ~${timeSaved} mins`}
                  </span>
                  <span>·</span>
                  <span>{msmeCount} {isId ? 'warung lokal sejalur' : 'local MSME on route'}</span>
                </div>
              </div>

              {/* Animated Interactive Route Vector Map (100% Responsive SVG) */}
              <div className="border border-ash/80 bg-parchment rounded-none overflow-hidden relative">
                <div className="bg-white border-b border-ash/70 px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-graphite">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-none bg-lime border border-ink shrink-0" />
                    <span className="text-ink uppercase tracking-wider text-[10px] truncate">
                      {isId ? 'KORIDOR RUTE & TITIK UMKM' : 'ROUTE CORRIDOR & MSMES'}
                    </span>
                  </div>
                  <span className="shrink-0">{isId ? 'Ketuk pin' : 'Tap pins'}</span>
                </div>

                <div className="relative w-full">
                  <svg
                    viewBox="0 0 520 220"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-40 sm:h-52 block select-none bg-[#f4f4ea]"
                  >
                    {/* Topographic Background Contours */}
                    <path d="M 0 40 Q 140 20, 260 70 T 520 50" stroke="#e6e6da" strokeWidth="1" fill="none" />
                    <path d="M 0 110 Q 160 80, 290 140 T 520 120" stroke="#e6e6da" strokeWidth="1" fill="none" />
                    <path d="M 0 180 Q 180 150, 320 190 T 520 170" stroke="#e6e6da" strokeWidth="1" fill="none" />

                    {/* Secondary Congested Road (Red Bottleneck) */}
                    <path
                      d="M 90 70 Q 140 120, 170 180"
                      stroke="#e0442b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                    <g transform="translate(130, 140)">
                      <rect x="0" y="0" width="60" height="15" fill="#e0442b" />
                      <text x="30" y="11" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                        MACET ~45m
                      </text>
                    </g>

                    {/* Primary Calm Scenic Detour Route (Glowing Lime + Flowing Animation) */}
                    <path
                      d="M 90 70 C 170 45, 220 100, 260 135 C 310 175, 380 160, 440 85"
                      stroke="#beff50"
                      strokeWidth="7"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                    <path
                      d="M 90 70 C 170 45, 220 100, 260 135 C 310 175, 380 160, 440 85"
                      stroke="#14140f"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-route-flow"
                    />

                    {/* PIN 1: Origin (Red Crowd Alert) */}
                    <g
                      transform="translate(90, 70)"
                      onClick={() => setActiveMapPin('origin')}
                      className="cursor-pointer"
                    >
                      <circle cx="0" cy="0" r={activeMapPin === 'origin' ? 16 : 13} fill="#e0442b" stroke="#14140f" strokeWidth="2" />
                      <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">!</text>
                      <rect x="-38" y="-28" width="76" height="15" fill="#14140f" />
                      <text x="0" y="-18" fill="#ffffff" fontSize="8" fontWeight="medium" textAnchor="middle">
                        {originName.length > 12 ? originName.slice(0, 10) + '..' : originName}
                      </text>
                    </g>

                    {/* PIN 2: MSME Warung Waypoint */}
                    <g
                      transform="translate(260, 135)"
                      onClick={() => setActiveMapPin('msme')}
                      className="cursor-pointer"
                    >
                      <rect x="-11" y="-11" width="22" height="22" fill="#14140f" stroke="#beff50" strokeWidth="2" />
                      <path d="M-6 -2 h12 v7 h-12 Z" fill="#beff50" />
                      <rect x="-42" y="16" width="84" height="15" fill="#14140f" />
                      <text x="0" y="26" fill="#beff50" fontSize="8" fontWeight="medium" textAnchor="middle">
                        {msmeName.length > 14 ? msmeName.slice(0, 12) + '..' : msmeName}
                      </text>
                    </g>

                    {/* PIN 3: Calmer Destination (Lime Star / Recommendation) */}
                    <g
                      transform="translate(440, 85)"
                      onClick={() => setActiveMapPin('alt')}
                      className="cursor-pointer"
                    >
                      <circle cx="0" cy="0" r={18} fill="#beff50" opacity="0.3" className="animate-pin-pulse" />
                      <circle cx="0" cy="0" r={activeMapPin === 'alt' ? 16 : 13} fill="#beff50" stroke="#14140f" strokeWidth="2" />
                      <text x="0" y="4" fill="#14140f" fontSize="11" fontWeight="bold" textAnchor="middle">✓</text>
                      <rect x="-44" y="-30" width="88" height="16" fill="#beff50" stroke="#14140f" strokeWidth="1" />
                      <text x="0" y="-19" fill="#14140f" fontSize="8" fontWeight="bold" textAnchor="middle">
                        {altName.length > 14 ? altName.slice(0, 12) + '..' : altName}
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Interactive Map Inspector Card based on activeMapPin */}
                <div className="bg-white border-t border-ash/80 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 border border-ash/80 bg-parchment overflow-hidden">
                    <img
                      src={activeMapPin === 'origin' ? originImg : activeMapPin === 'msme' ? msmeImg : altImg}
                      alt="Detail tempat terpilih"
                      className="w-full h-full object-cover block"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-medium tracking-wider text-graphite truncate">
                        {activeMapPin === 'origin'
                          ? isId ? 'Titik Macet Awal' : 'Original Spot'
                          : activeMapPin === 'msme'
                            ? isId ? 'Persinggahan UMKM' : 'Local MSME'
                            : isId ? 'Rekomendasi Tenang' : 'Recommended Spot'}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 border shrink-0 ${
                        activeMapPin === 'origin'
                          ? 'bg-crowd-high/10 text-crowd-high border-crowd-high/30'
                          : activeMapPin === 'msme'
                            ? 'bg-parchment text-ink border-ash'
                            : 'bg-lime text-ink border-ink'
                      }`}>
                        {activeMapPin === 'origin'
                          ? `Antrean ~${origin.queueEstimateMin} mnt`
                          : activeMapPin === 'msme'
                            ? isId ? 'Kuliner & Kopi' : 'Coffee & Eats'
                            : isId ? 'Bebas Antre (0 mnt)' : 'Zero Queue (0 min)'}
                      </span>
                    </div>

                    <strong className="block text-sm font-medium text-ink truncate">
                      {activeMapPin === 'origin' ? originName : activeMapPin === 'msme' ? msmeName : altName}
                    </strong>

                    <p className="text-[11px] text-graphite line-clamp-1">
                      {activeMapPin === 'origin'
                        ? isId ? 'Titik keramaian tinggi di kawasan utama.' : 'High congestion tourist zone.'
                        : activeMapPin === 'msme'
                          ? isId ? 'Hidangan lokal otentik & pemandangan lereng sejuk.' : 'Authentic local cuisine & highland views.'
                          : isId ? `Kemiripan atmosfer ${vibeMatch}%, hemat ~${timeSaved} mnt antrean.` : `${vibeMatch}% vibe match, save ~${timeSaved} mins wait.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Real Photo Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Initial Busy Spot Card */}
                <div className="border border-ash/80 bg-parchment p-3 rounded-none flex items-center gap-3 opacity-90 min-w-0">
                  <div className="w-14 h-14 shrink-0 border border-ash/80 bg-white overflow-hidden">
                    <img src={originImg} alt={originName} className="w-full h-full object-cover block" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="text-[10px] uppercase font-medium text-graphite block truncate">
                      {isId ? 'Tujuan Awal' : 'Original Target'}
                    </span>
                    <strong className="text-xs sm:text-sm font-medium text-ink block truncate">
                      {originName}
                    </strong>
                    <span className="text-xs text-crowd-high font-medium block truncate">
                      ● ~{origin.queueEstimateMin} {isId ? 'mnt antre' : 'min wait'}
                    </span>
                  </div>
                </div>

                {/* Calmer Alternative Card */}
                <div className="border-2 border-ink bg-white p-3 rounded-none flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 shrink-0 border border-ink bg-lime overflow-hidden">
                    <img src={altImg} alt={altName} className="w-full h-full object-cover block" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="text-[10px] uppercase font-medium text-ink block truncate">
                      {isId ? 'Pilihan MARGI AI' : 'MARGI Choice'}
                    </span>
                    <strong className="text-xs sm:text-sm font-medium text-ink block truncate">
                      {altName}
                    </strong>
                    <span className="text-xs text-crowd-low font-medium block truncate">
                      ● {isId ? 'Bebas antre (0 mnt)' : 'Zero queue (0 min)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: DECISION & AI CONCIERGE CHAT ================= */}
          {step === 3 && (
            <div key="step-3" className="animate-step-in space-y-4" data-testid="concierge-step-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-lime text-ink border border-ink text-[11px] font-medium">
                  <CompassIcon size={13} className="text-ink" />
                  <span>{isId ? 'KEPUTUSAN PERJALANAN' : 'TRAVELER DECISION'}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-medium text-ink leading-tight break-words">
                  {isId ? 'Tentukan Rencana & Koordinasi AI' : 'Confirm Plan & Consult AI'}
                </h2>
                <p className="text-xs sm:text-sm text-graphite">
                  {isId
                    ? 'Pilih rute rekomendasi untuk langsung menyetujui, atau tanyakan detail ke AI di bawah:'
                    : 'Confirm the calmer route or ask AI questions below:'}
                </p>
              </div>

              {/* Direct Action Choices with Photo Preview Thumbnail */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeAlternative) {
                      onSelectAlternative?.(activeAlternative.venue.id);
                      onAccPlan(activeAlternative.venue.id, 'reroute');
                    }
                  }}
                  className="w-full p-3 bg-lime hover:brightness-105 active:scale-[0.99] border-2 border-ink text-left transition-all cursor-pointer flex items-center justify-between gap-3 min-w-0"
                  data-testid="concierge-acc-reroute"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 shrink-0 border border-ink bg-white overflow-hidden">
                      <img src={altImg} alt={altName} className="w-full h-full object-cover block" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] uppercase font-medium tracking-wider text-ink block truncate">
                        {isId ? 'REKOMENDASI UTAMA (DISARANKAN)' : 'TOP RECOMMENDATION'}
                      </span>
                      <strong className="text-xs sm:text-sm font-medium text-ink block truncate">
                        {isId ? `Alihkan ke ${altName} & Buka Detail Rute` : `Reroute to ${altName} & View Route`}
                      </strong>
                      <span className="text-[11px] text-ink/80 block truncate">
                        {isId
                          ? `Hemat ~${timeSaved} mnt antre · Lewati ${msmeName}`
                          : `Save ~${timeSaved} mins wait · Pass ${msmeName}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-xl font-medium text-ink shrink-0">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAccPlan(origin.venue.id, 'adjusted_time')}
                  className="w-full p-2.5 sm:p-3 bg-white hover:bg-parchment active:scale-[0.99] border border-ash/80 text-left transition-all cursor-pointer flex items-center justify-between gap-3 min-w-0"
                  data-testid="concierge-acc-original"
                >
                  <div className="min-w-0">
                    <strong className="text-xs sm:text-sm font-medium text-ink block truncate">
                      {isId
                        ? `Tetap ke ${originName} (Jadwalkan Pukul 07:00 Pagi)`
                        : `Keep ${originName} (Schedule for 07:00 AM)`}
                    </strong>
                    <span className="text-[11px] text-graphite block truncate">
                      {isId
                        ? 'Hindari jam puncak 12:00, datang pagi saat lengang'
                        : 'Avoid peak noon crowd, arrive early morning'}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-graphite shrink-0">→</span>
                </button>
              </div>

              {/* Interactive AI Chat Concierge Box */}
              <div className="border border-ash/80 bg-parchment p-3 sm:p-4 rounded-none space-y-2.5">
                <div className="flex items-center justify-between border-b border-ash/60 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquareIcon size={14} className="text-ink shrink-0" />
                    <span className="text-xs font-medium text-ink truncate">
                      {isId ? 'Tanya MARGI AI Concierge' : 'Ask MARGI AI Concierge'}
                    </span>
                  </div>
                  <span className="text-[10px] text-graphite uppercase font-medium shrink-0">
                    {isId ? 'Respons Kontekstual' : 'Context-Aware AI'}
                  </span>
                </div>

                {/* Quick-Prompt Question Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    isId ? 'Rekomendasi warung makan siang sejalur?' : 'Local lunch spot along route?',
                    isId ? 'Kondisi rute jika naik motor?' : 'Road condition for scooters?',
                    isId ? 'Mengapa suasananya mirip?' : 'Why is the atmosphere similar?',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendPrompt(chip)}
                      className="text-[11px] px-2.5 py-1 border border-ash/80 bg-white hover:bg-parchment text-ink transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Message Log */}
                <div
                  ref={chatScrollRef}
                  className="space-y-2 max-h-32 sm:max-h-44 overflow-y-auto pr-1 text-xs"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-none border ${
                        m.sender === 'user'
                          ? 'bg-ink text-parchment border-ink ml-6'
                          : 'bg-white text-ink border-ash mr-3'
                      }`}
                    >
                      <p className="leading-relaxed">{m.text}</p>
                      {m.ctaLabel && m.ctaAction ? (
                        <div className="mt-2 pt-1.5 border-t border-ash/50">
                          <button
                            type="button"
                            onClick={m.ctaAction}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lime text-ink font-medium text-xs border border-ink hover:brightness-105 transition cursor-pointer"
                          >
                            <span>{m.ctaLabel}</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* Question Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendPrompt(inputText);
                  }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isId
                        ? 'Ketik pertanyaan (misal: warung makan, rute motor)...'
                        : 'Ask question (e.g. lunch spot, scooter road)...'
                    }
                    className="flex-1 border border-ash/80 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-stone focus:outline-none focus:border-ink rounded-none min-w-0"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="border border-ash/80 bg-white hover:bg-parchment text-ink h-8 px-3 shrink-0"
                  >
                    <SendIcon size={13} />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* 3. Sticky Bottom Navigation Bar (Guaranteed in viewport via flex-col + min-h-0) */}
        <div className="bg-parchment border-t border-ash/80 px-4 py-3 shrink-0 flex items-center justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-xs border border-ash/80 bg-white hover:bg-parchment text-ink shrink-0"
            >
              ← {isId ? 'Kembali' : 'Back'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="text-xs px-4 py-2 shrink-0"
                data-testid="concierge-next-button"
              >
                <span>
                  {step === 0
                    ? isId
                      ? 'Lanjut: Cek Waktu Terbaik →'
                      : 'Next: Best Timing →'
                    : step === 1
                      ? isId
                        ? 'Lanjut: Lihat Peta Rute Tenang →'
                        : 'Next: Calmer Route Map →'
                      : isId
                        ? 'Lanjut: Tentukan Rencana & Chat AI →'
                        : 'Next: Confirm Plan & Chat AI →'}
                </span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs border border-ash/80 bg-white hover:bg-parchment text-ink shrink-0"
              >
                {isId ? 'Buka Halaman Rute Lengkap' : 'Open Route Dashboard'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
}
