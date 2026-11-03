import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

export type IntroIllustrationKind = 'crowd' | 'read' | 'calm';

export interface IntroIllustrationProps {
  readonly kind: IntroIllustrationKind;
  readonly className?: string;
}

const VIEW_W = 320;
const VIEW_H = 240;
const PEOPLE_COUNT = 42;
const BAR_COUNT = 16;
const INK = 'var(--color-ink)';
const LIME = 'var(--color-lime)';
const ASH = 'var(--color-ash)';

/** Deterministic pseudo-random sequence so the illustration renders the same on every visit. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const random = seeded(7);
const PEOPLE = Array.from({ length: PEOPLE_COUNT }, () => ({
  x: 24 + random() * (VIEW_W - 48),
  y: 40 + random() * (VIEW_H - 90),
  clusterX: 160 + (random() - 0.5) * 70,
  clusterY: 176 + (random() - 0.5) * 26,
}));

/** Hourly shape of a typical hotspot day, 06:00 – 21:00, in percent. */
const DAY_CURVE = [8, 18, 46, 78, 92, 88, 70, 52, 48, 61, 74, 66, 40, 22, 12, 6];

/** Split gate (candi bentar) silhouette, the icon of a Balinese temple entrance. */
function SplitGate({ x, y }: { readonly x: number; readonly y: number }): ReactNode {
  const half = 'M0 0 h22 v-12 h-4 v-10 h-4 v-10 h-4 v-10 h-6 Z';
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="1.5" fill="var(--color-white)">
      <path d={half} transform="translate(-34 0)" />
      <path d={half} transform="translate(34 0) scale(-1 1)" />
    </g>
  );
}

function CrowdScene(): ReactNode {
  return (
    <>
      <line x1="16" y1="196" x2={VIEW_W - 16} y2="196" stroke={INK} strokeWidth="1" />
      <SplitGate x={160} y={196} />
      {PEOPLE.map((person, index) => (
        <rect
          key={index}
          data-person
          data-cx={person.clusterX - person.x}
          data-cy={person.clusterY - person.y}
          x={person.x}
          y={person.y}
          width="7"
          height="7"
          fill={index % 9 === 0 ? LIME : INK}
          stroke={INK}
          strokeWidth="1"
        />
      ))}
    </>
  );
}

function ReadScene(): ReactNode {
  const barW = (VIEW_W - 48) / BAR_COUNT;
  return (
    <>
      <line x1="16" y1="200" x2={VIEW_W - 16} y2="200" stroke={INK} strokeWidth="1" />
      {DAY_CURVE.map((value, index) => (
        <rect
          key={index}
          data-bar
          data-index={index}
          x={24 + index * barW + 2}
          y={200 - value * 1.5}
          width={barW - 4}
          height={value * 1.5}
          fill={value > 70 ? INK : ASH}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        />
      ))}
      <g data-cursor>
        <line x1="24" y1="30" x2="24" y2="206" stroke={INK} strokeWidth="1.5" />
        <rect x="18" y="22" width="12" height="12" fill={LIME} stroke={INK} strokeWidth="1.5" />
      </g>
    </>
  );
}

function CalmScene(): ReactNode {
  const arc = 'M70 168 C 120 40, 210 40, 252 132';
  return (
    <>
      <path d={arc} fill="none" stroke={ASH} strokeWidth="1.5" strokeDasharray="3 6" />
      <path data-route d={arc} fill="none" stroke={INK} strokeWidth="2" />
      {Array.from({ length: 5 }, (_, index) => (
        <rect key={index} data-traveller x="66" y="164" width="8" height="8" fill={INK} />
      ))}
      <g transform="translate(70 168)">
        {[-14, -4, 6, 14, -10, 10].map((dx, index) => (
          <rect key={index} x={dx - 3} y={14 + (index % 2) * 9} width="6" height="6" fill={INK} />
        ))}
        <rect
          x="-11"
          y="-11"
          width="22"
          height="22"
          fill="var(--color-white)"
          stroke={INK}
          strokeWidth="1.5"
        />
        <rect x="-4" y="-4" width="8" height="8" fill={INK} />
      </g>
      <g data-calm-pin transform="translate(252 132)">
        <rect x="-15" y="-15" width="30" height="30" fill={LIME} stroke={INK} strokeWidth="2" />
        <path d="M-6 0 l4 4 l8 -9" fill="none" stroke={INK} strokeWidth="2" />
      </g>
    </>
  );
}

function animateCrowd(timeline: gsap.core.Timeline): void {
  timeline
    .to('[data-person]', {
      x: (_index: number, target: Element) => Number(target.getAttribute('data-cx')),
      y: (_index: number, target: Element) => Number(target.getAttribute('data-cy')),
      duration: 1.6,
      ease: 'power3.inOut',
      stagger: { each: 0.02, from: 'random' },
    })
    .to({}, { duration: 1.2 })
    .to('[data-person]', {
      x: 0,
      y: 0,
      duration: 1.4,
      ease: 'power2.inOut',
      stagger: { each: 0.015, from: 'center' },
    });
}

function animateRead(timeline: gsap.core.Timeline): void {
  timeline
    .from('[data-bar]', { scaleY: 0, duration: 0.7, ease: 'power3.out', stagger: 0.04 })
    .fromTo('[data-cursor]', { x: 0 }, { x: VIEW_W - 48, duration: 2.6, ease: 'none' }, '-=0.2')
    .to('[data-cursor]', { autoAlpha: 0, duration: 0.3 })
    .to('[data-bar]', { scaleY: 0, duration: 0.4, ease: 'power2.in', stagger: 0.02 });
}

function animateCalm(timeline: gsap.core.Timeline, route: SVGPathElement | null): void {
  const length = route?.getTotalLength?.() ?? 300;
  timeline
    .fromTo(
      '[data-route]',
      { strokeDasharray: length, strokeDashoffset: length },
      {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: 'power2.inOut',
      },
    )
    .from(
      '[data-calm-pin]',
      { scale: 0, transformOrigin: 'center', duration: 0.5, ease: 'back.out(2)' },
      '-=0.2',
    )
    .to('[data-traveller]', {
      keyframes: [
        { x: 50, y: -80, duration: 0.6 },
        { x: 130, y: -96, duration: 0.6 },
        { x: 186, y: -36, duration: 0.6 },
      ],
      ease: 'none',
      stagger: 0.25,
    })
    .to({}, { duration: 0.8 })
    .to('[data-traveller]', { autoAlpha: 0, duration: 0.3 });
}

/**
 * Looping line illustrations for the onboarding slides and the landing page:
 * a crowd gathering at a temple gate, a forecast being read, travellers rerouted.
 */
export function IntroIllustration({ kind, className }: IntroIllustrationProps): ReactNode {
  const scope = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
        if (kind === 'crowd') animateCrowd(timeline);
        if (kind === 'read') animateRead(timeline);
        if (kind === 'calm') {
          animateCalm(
            timeline,
            scope.current?.querySelector<SVGPathElement>('[data-route]') ?? null,
          );
        }
      });
    },
    { scope, dependencies: [kind], revertOnUpdate: true },
  );

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      {kind === 'crowd' && <CrowdScene />}
      {kind === 'read' && <ReadScene />}
      {kind === 'calm' && <CalmScene />}
    </svg>
  );
}
