import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

export interface ScanningIllustrationProps {
  readonly previewUrl?: string | null | undefined;
  readonly photoLabel?: string | undefined;
  readonly className?: string | undefined;
}

export function ScanningIllustration({
  previewUrl,
  photoLabel = 'Your photo',
  className = '',
}: ScanningIllustrationProps): ReactNode {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
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

        gsap.to('[data-pin-ring]', {
          scale: 1.35,
          opacity: 0.25,
          transformOrigin: 'center center',
          duration: 1.1,
          stagger: 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    },
    { scope: scopeRef },
  );

  return (
    <div
      ref={scopeRef}
      className={`relative w-full overflow-hidden rounded-inner bg-parchment border border-ash ${className}`}
      data-testid="scanning-illustration"
    >
      <svg
        viewBox="0 0 360 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-52 block mx-auto"
        role="img"
        aria-label="Illustration of a traveler scanning a Bali destination photo"
      >
        {/* Soft Sun & Horizon */}
        <circle cx="262" cy="52" r="22" fill="#ffffff" stroke="#d2d2c8" strokeWidth="1.5" />

        {/* Terraced Hills in Background */}
        <path
          d="M140 168C172 134 218 122 268 132C302 139 332 152 352 168H140Z"
          fill="#e9e9de"
        />
        <path
          d="M178 168C205 145 246 138 292 146C316 150 336 158 352 168H178Z"
          fill="#dcdcd0"
        />
        {/* Rice terrace contour lines */}
        <path
          d="M192 154C224 144 264 144 304 152"
          stroke="#919183"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M204 162C234 154 268 154 312 161"
          stroke="#919183"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Balinese Split Gate (Candi Bentar) inside Viewfinder */}
        <g>
          {/* Left tower */}
          <path
            d="M214 142H232V84L224 91V104H219V118H214V142Z"
            fill="#30302a"
          />
          {/* Right tower */}
          <path
            d="M270 142H252V84L260 91V104H265V118H270V142Z"
            fill="#30302a"
          />
          {/* Base steps */}
          <rect x="208" y="142" width="68" height="4" rx="1" fill="#6e6e64" />
        </g>

        {/* Calm Spot Discovery Pin on Hillside */}
        <g transform="translate(306, 108)">
          <circle data-pin-ring cx="0" cy="0" r="10" fill="#beff50" opacity="0.65" />
          <circle cx="0" cy="0" r="4.5" fill="#14140f" />
          <circle cx="0" cy="0" r="1.8" fill="#beff50" />
        </g>

        {/* Viewfinder Frame & Animated Scan Beam */}
        <g data-scan-frame>
          {/* Subtle scan sightlines from phone to viewfinder */}
          <path
            d="M152 92L194 66M152 114L194 148"
            stroke="#919183"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Viewfinder corner brackets */}
          <path d="M196 78V66H208" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />
          <path d="M288 66H300V78" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />
          <path d="M196 138V150H208" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />
          <path d="M288 150H300V138" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />

          {/* Animated Lime Scan Line */}
          <g data-scan-beam>
            <rect x="198" y="76" width="100" height="8" rx="4" fill="#beff50" opacity="0.35" />
            <line
              x1="198"
              y1="80"
              x2="298"
              y2="80"
              stroke="#14140f"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="198" cy="80" r="2.5" fill="#beff50" stroke="#14140f" strokeWidth="1.2" />
            <circle cx="298" cy="80" r="2.5" fill="#beff50" stroke="#14140f" strokeWidth="1.2" />
          </g>
        </g>

        {/* Foreground Ground Line */}
        <line x1="24" y1="168" x2="336" y2="168" stroke="#d2d2c8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Traveler Character Holding Up Smartphone */}
        <g data-traveler>
          {/* Backpack */}
          <rect x="64" y="98" width="22" height="38" rx="9" fill="#6e6e64" stroke="#14140f" strokeWidth="1.75" />
          <line x1="70" y1="110" x2="80" y2="110" stroke="#f5f5eb" strokeWidth="1.5" strokeLinecap="round" />

          {/* Legs */}
          <path d="M84 142L80 168" stroke="#14140f" strokeWidth="5" strokeLinecap="round" />
          <path d="M98 142L104 168" stroke="#14140f" strokeWidth="5" strokeLinecap="round" />

          {/* Torso / Shirt */}
          <path
            d="M76 96C76 90 82 86 90 86C98 86 104 90 106 98L108 142H76V96Z"
            fill="#14140f"
          />

          {/* Head & Sunhat */}
          <circle cx="92" cy="68" r="11" fill="#ffffff" stroke="#14140f" strokeWidth="1.75" />
          {/* Smile / Eye */}
          <circle cx="96" cy="67" r="1.3" fill="#14140f" />
          <path d="M94 72C95.5 73 97.5 73 99 72" stroke="#14140f" strokeWidth="1.3" strokeLinecap="round" />
          {/* Hat crown & brim */}
          <path d="M80 62C81 54 86 51 92 51C98 51 103 54 104 62H80Z" fill="#beff50" stroke="#14140f" strokeWidth="1.75" />
          <line x1="74" y1="62" x2="111" y2="62" stroke="#14140f" strokeWidth="2" strokeLinecap="round" />

          {/* Raised Arms Holding Phone */}
          <path
            d="M98 98L124 108L138 98"
            stroke="#14140f"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M94 104L120 116L138 106"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Smartphone in Hand */}
          <rect
            x="136"
            y="84"
            width="16"
            height="30"
            rx="3.5"
            fill="#14140f"
            stroke="#14140f"
            strokeWidth="1.5"
          />
          <rect x="138.5" y="87.5" width="11" height="23" rx="1.5" fill="#beff50" />
        </g>
      </svg>

      {/* Optional mini thumbnail of the user's selected photo */}
      {previewUrl ? (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-inner bg-white/95 border border-ash p-1.5 pr-3">
          <img
            src={previewUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-input object-cover border border-ash/60"
          />
          <span className="text-[11px] font-medium text-ink">{photoLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
