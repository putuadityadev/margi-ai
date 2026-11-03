import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP } from '../../lib/gsap';

export interface ScanningIllustrationProps {
  readonly previewUrl?: string | null | undefined;
  readonly photoLabel?: string | undefined;
  readonly activeStep?: number | undefined; // 0: Road traffic, 1: Venue queue, 2: Route & MSME
  readonly className?: string | undefined;
}

export function ScanningIllustration({
  previewUrl,
  photoLabel = 'Your photo',
  activeStep,
  className = '',
}: ScanningIllustrationProps): ReactNode {
  const { i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');
  const scopeRef = useRef<HTMLDivElement>(null);

  // Manual or automatic scene selection (0: Road, 1: Venue, 2: Route)
  const [internalScene, setInternalScene] = useState<number>(0);
  const currentScene = activeStep !== undefined ? Math.min(Math.max(activeStep, 0), 2) : internalScene;

  // Auto-cycle through scenes if not driven externally
  useEffect(() => {
    if (activeStep !== undefined) return;
    const timer = setInterval(() => {
      setInternalScene((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, [activeStep]);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Scene 1: Road traffic scanner
        gsap.to('[data-road-car]', {
          x: 48,
          duration: 2.2,
          repeat: -1,
          ease: 'power1.inOut',
          yoyo: true,
        });

        gsap.to('[data-corridor-pulse]', {
          opacity: 0.25,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.3,
        });

        // Scene 2: Venue queue scanner
        gsap.to('[data-scan-beam]', {
          y: 56,
          duration: 1.35,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        gsap.to('[data-traveler]', {
          y: -3,
          duration: 1.7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        // Scene 3: Route & MSME calculation
        gsap.to('[data-route-pulse]', {
          strokeDashoffset: -24,
          duration: 1.5,
          repeat: -1,
          ease: 'none',
        });

        gsap.to('[data-msme-node]', {
          scale: 1.25,
          opacity: 0.3,
          transformOrigin: 'center center',
          duration: 1.2,
          stagger: 0.35,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    },
    { scope: scopeRef, dependencies: [currentScene] },
  );

  return (
    <div
      ref={scopeRef}
      className={`relative w-full overflow-hidden bg-parchment border border-ash/80 ${className}`}
      data-testid="scanning-illustration"
    >
      {/* Scene Switcher Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ash/60 bg-parchment-card text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-lime border border-ink animate-pulse" />
          <span className="font-medium text-ink uppercase tracking-wider text-[10px]">
            {isId ? 'Multi-Pemindaian Cerdas MARGI' : 'MARGI Multi-Agent Scan'}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setInternalScene(0)}
            className={`px-2 py-0.5 border text-[10px] transition-colors ${
              currentScene === 0
                ? 'border-ink bg-ink text-parchment font-medium'
                : 'border-ash/60 bg-parchment text-graphite hover:text-ink'
            }`}
          >
            {isId ? '1. Jalan' : '1. Corridor'}
          </button>
          <button
            type="button"
            onClick={() => setInternalScene(1)}
            className={`px-2 py-0.5 border text-[10px] transition-colors ${
              currentScene === 1
                ? 'border-ink bg-ink text-parchment font-medium'
                : 'border-ash/60 bg-parchment text-graphite hover:text-ink'
            }`}
          >
            {isId ? '2. Antrean' : '2. Queue'}
          </button>
          <button
            type="button"
            onClick={() => setInternalScene(2)}
            className={`px-2 py-0.5 border text-[10px] transition-colors ${
              currentScene === 2
                ? 'border-ink bg-ink text-parchment font-medium'
                : 'border-ash/60 bg-parchment text-graphite hover:text-ink'
            }`}
          >
            {isId ? '3. Rute & UMKM' : '3. Route'}
          </button>
        </div>
      </div>

      {/* Main SVG Stage */}
      <svg
        viewBox="0 0 380 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-56 block mx-auto"
        role="img"
        aria-label="Illustration of smart multi-scene journey scanning"
      >
        {/* SCENE 0: CORRIDOR & ROAD TRAFFIC */}
        {currentScene === 0 && (
          <g className="animate-fade-in">
            {/* Mountain backdrop & sky */}
            <circle cx="310" cy="46" r="20" fill="#ffffff" stroke="#d2d2c8" strokeWidth="1.5" />
            <path
              d="M190 168L270 70L350 168H190Z"
              fill="#e9e9de"
              stroke="#d2d2c8"
              strokeWidth="1.2"
            />
            <path
              d="M240 168L290 100L350 168H240Z"
              fill="#dcdcd0"
            />

            {/* Winding Road Highway Corridor */}
            <path
              d="M20 170C90 170 90 120 170 120C250 120 260 160 360 160"
              stroke="#6e6e64"
              strokeWidth="22"
              strokeLinecap="round"
            />
            {/* Road Asphalt Layer */}
            <path
              d="M20 170C90 170 90 120 170 120C250 120 260 160 360 160"
              stroke="#14140f"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Center Road Dash */}
            <path
              d="M20 170C90 170 90 120 170 120C250 120 260 160 360 160"
              stroke="#f5f5eb"
              strokeWidth="2"
              strokeDasharray="6 8"
              strokeLinecap="round"
            />

            {/* Traffic Sensor Beams / Corridor Pulse */}
            <circle
              data-corridor-pulse
              cx="110"
              cy="142"
              r="14"
              fill="#beff50"
              opacity="0.7"
            />
            <circle cx="110" cy="142" r="4" fill="#14140f" />

            <circle
              data-corridor-pulse
              cx="220"
              cy="132"
              r="14"
              fill="#beff50"
              opacity="0.7"
            />
            <circle cx="220" cy="132" r="4" fill="#14140f" />

            {/* Moving Scooter / Vehicle on the Road */}
            <g data-road-car transform="translate(60, 142)">
              <rect x="0" y="0" width="22" height="10" rx="3" fill="#beff50" stroke="#14140f" strokeWidth="1.5" />
              <circle cx="5" cy="10" r="3" fill="#14140f" />
              <circle cx="17" cy="10" r="3" fill="#14140f" />
              {/* Headlight beam */}
              <polygon points="22,2 40,-2 40,12 22,8" fill="#beff50" opacity="0.45" />
            </g>

            {/* Road Signboard: Cek Kepadatan Koridor */}
            <g transform="translate(26, 40)">
              <rect x="0" y="0" width="138" height="38" rx="2" fill="#14140f" />
              <rect x="2" y="2" width="134" height="34" rx="1" fill="#30302a" />
              <text x="10" y="16" fill="#beff50" fontSize="9" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'KORIDOR WISATA BALI' : 'BALI TOURIST CORRIDOR'}
              </text>
              <text x="10" y="28" fill="#f5f5eb" fontSize="8" fontFamily="sans-serif" fontWeight="400">
                {isId ? 'Mendeteksi titik macet...' : 'Scanning bottleneck areas...'}
              </text>
              <line x1="16" y1="38" x2="16" y2="70" stroke="#14140f" strokeWidth="2.5" />
            </g>
          </g>
        )}

        {/* SCENE 1: CANDI BENTAR & ENTRANCE QUEUE */}
        {currentScene === 1 && (
          <g className="animate-fade-in">
            {/* Mount Agung in background */}
            <path
              d="M170 168L265 64L360 168H170Z"
              fill="#e9e9de"
              stroke="#d2d2c8"
              strokeWidth="1.2"
            />
            {/* Sun */}
            <circle cx="265" cy="48" r="16" fill="#ffffff" stroke="#d2d2c8" strokeWidth="1.5" />

            {/* Ground Line */}
            <line x1="20" y1="168" x2="360" y2="168" stroke="#d2d2c8" strokeWidth="1.5" />

            {/* Split Gate Candi Bentar */}
            <g>
              {/* Left tower */}
              <path d="M214 142H232V80L224 88V102H219V116H214V142Z" fill="#30302a" />
              {/* Right tower */}
              <path d="M272 142H254V80L262 88V102H267V116H272V142Z" fill="#30302a" />
              {/* Base steps */}
              <rect x="208" y="142" width="70" height="4" rx="1" fill="#6e6e64" />
            </g>

            {/* Waiting Crowd Silhouettes */}
            <g opacity="0.85">
              <circle cx="236" cy="136" r="3" fill="#6e6e64" />
              <rect x="234" y="139" width="4" height="7" rx="1" fill="#6e6e64" />

              <circle cx="242" cy="134" r="3" fill="#6e6e64" />
              <rect x="240" y="137" width="4" height="9" rx="1" fill="#6e6e64" />

              <circle cx="249" cy="135" r="3" fill="#6e6e64" />
              <rect x="247" y="138" width="4" height="8" rx="1" fill="#6e6e64" />
            </g>

            {/* Scanner Sightlines and Lime Scan Beam */}
            <g data-scan-beam>
              <rect x="194" y="76" width="98" height="6" rx="3" fill="#beff50" opacity="0.4" />
              <line x1="194" y1="79" x2="292" y2="79" stroke="#14140f" strokeWidth="1.75" />
              <circle cx="194" cy="79" r="2.5" fill="#beff50" stroke="#14140f" strokeWidth="1" />
              <circle cx="292" cy="79" r="2.5" fill="#beff50" stroke="#14140f" strokeWidth="1" />
            </g>

            {/* Traveler Character Standing with Smartphone */}
            <g data-traveler transform="translate(10, 0)">
              {/* Backpack */}
              <rect x="64" y="98" width="22" height="38" rx="9" fill="#6e6e64" stroke="#14140f" strokeWidth="1.75" />
              {/* Legs */}
              <path d="M84 142L80 168" stroke="#14140f" strokeWidth="5" strokeLinecap="round" />
              <path d="M98 142L104 168" stroke="#14140f" strokeWidth="5" strokeLinecap="round" />
              {/* Torso */}
              <path d="M76 96C76 90 82 86 90 86C98 86 104 90 106 98L108 142H76V96Z" fill="#14140f" />
              {/* Head & Sunhat */}
              <circle cx="92" cy="68" r="11" fill="#ffffff" stroke="#14140f" strokeWidth="1.75" />
              <circle cx="96" cy="67" r="1.3" fill="#14140f" />
              <path d="M80 62C81 54 86 51 92 51C98 51 103 54 104 62H80Z" fill="#beff50" stroke="#14140f" strokeWidth="1.75" />
              <line x1="74" y1="62" x2="111" y2="62" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />
              {/* Arms with Smartphone */}
              <path d="M98 98L124 108L138 98" stroke="#14140f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="136" y="84" width="16" height="30" rx="3.5" fill="#14140f" stroke="#14140f" strokeWidth="1.5" />
              <rect x="138.5" y="87.5" width="11" height="23" rx="1.5" fill="#beff50" />
            </g>

            {/* Queue Badge */}
            <g transform="translate(200, 28)">
              <rect x="0" y="0" width="128" height="30" rx="2" fill="#14140f" />
              <text x="8" y="14" fill="#beff50" fontSize="9" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'DETEKSI ANTREAN' : 'QUEUE ESTIMATION'}
              </text>
              <text x="8" y="24" fill="#f5f5eb" fontSize="8" fontFamily="sans-serif" fontWeight="400">
                {isId ? 'Mendeteksi antrean 2+ jam...' : 'Estimating 2+ hours queue...'}
              </text>
            </g>
          </g>
        )}

        {/* SCENE 2: ALTERNATIVE ROUTE & MSME CALCULATION */}
        {currentScene === 2 && (
          <g className="animate-fade-in">
            {/* Topography Contour Lines */}
            <path d="M20 50Q140 30 220 70T360 40" stroke="#d2d2c8" strokeWidth="1" fill="none" strokeDasharray="3 3" />
            <path d="M20 90Q160 80 250 110T360 85" stroke="#d2d2c8" strokeWidth="1" fill="none" strokeDasharray="3 3" />
            <path d="M20 135Q120 120 200 150T360 130" stroke="#d2d2c8" strokeWidth="1" fill="none" strokeDasharray="3 3" />

            {/* Dynamic AI Suggested Alternative Route Line */}
            <path
              data-route-pulse
              d="M50 145C110 145 130 75 220 75C270 75 290 125 330 125"
              stroke="#14140f"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="6 6"
            />

            {/* Node 1: Origin / Departure */}
            <g transform="translate(50, 145)">
              <circle cx="0" cy="0" r="9" fill="#14140f" />
              <circle cx="0" cy="0" r="4" fill="#f5f5eb" />
              <text x="-18" y="18" fill="#14140f" fontSize="8" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'Keberangkatan' : 'Departure'}
              </text>
            </g>

            {/* Node 2: Along-the-way MSME Warung & Coffee Stop */}
            <g transform="translate(165, 96)">
              <circle data-msme-node cx="0" cy="0" r="14" fill="#beff50" opacity="0.8" />
              <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#14140f" />
              <text x="-24" y="-12" fill="#14140f" fontSize="8" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'UMKM: Warung Kopi' : 'MSME: Local Coffee'}
              </text>
            </g>

            {/* Node 3: Calmer Alternative Destination */}
            <g transform="translate(330, 125)">
              <circle cx="0" cy="0" r="14" fill="#beff50" stroke="#14140f" strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill="#14140f" />
              <text x="-32" y="24" fill="#14140f" fontSize="8" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'Pura Tenang (Alternatif)' : 'Calm Alternative Spot'}
              </text>
            </g>

            {/* Time Saved Metric Pill */}
            <g transform="translate(110, 24)">
              <rect x="0" y="0" width="160" height="32" rx="2" fill="#beff50" stroke="#14140f" strokeWidth="1.5" />
              <text x="10" y="14" fill="#14140f" fontSize="9" fontFamily="sans-serif" fontWeight="500">
                {isId ? 'RUTE TENANG DITEMUKAN' : 'CALM ROUTE FOUND'}
              </text>
              <text x="10" y="25" fill="#30302a" fontSize="8" fontFamily="sans-serif" fontWeight="400">
                {isId ? 'Hemat antre 105 mnt + 2 UMKM sejalur' : 'Save 105 min + 2 MSMEs along route'}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Mini thumbnail if photo was uploaded */}
      {previewUrl ? (
        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-parchment-card/95 border border-ash/80 p-1.5 pr-2.5">
          <img
            src={previewUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-cover border border-ash/60"
          />
          <span className="text-[10px] font-medium text-ink max-w-[90px] truncate">
            {photoLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
